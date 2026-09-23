package httpapi

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"enclave/api/internal/license"
	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
)

/* 团队成员。所有者邀请人、给人分环境、把人请出去，都在官网做。
   邀请是一条一次性链接：配了发信服务器就由我们发出去，没配就交给所有者自己发。
   两种情况界面上都给链接——邮件进垃圾箱是常事。 */

const inviteTTL = 7 * 24 * time.Hour

// 只有所有者和管理员能看成员页；请人进来和请人出去只有所有者能做。
func (s *Server) needManager(c *gin.Context) {
	if r := user(c).Role; r != store.RoleOwner && r != store.RoleAdmin {
		fail(c, http.StatusForbidden, "ROLE_FORBIDDEN", "仅团队所有者与管理员可管理成员。")
		return
	}
	c.Next()
}

func (s *Server) needOwner(c *gin.Context) {
	if user(c).Role != store.RoleOwner {
		fail(c, http.StatusForbidden, "ROLE_FORBIDDEN", "仅团队所有者可执行此操作。")
		return
	}
	c.Next()
}

func seatsOf(o *store.Organization, now time.Time) int {
	plan, _ := license.Effective(o.PlanTier, o.SubscriptionExpiresAt, now)
	return plan.Seats
}

func (s *Server) listMembers(c *gin.Context) {
	o := org(c)
	people, err := s.store.Members(o.ID)
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "无法读取成员列表。")
		return
	}
	assigned, _ := s.store.FolderAssignmentsOf(o.ID)
	devices, _ := s.store.DevicesOfOrg(o.ID)
	count := map[string]int{}
	for _, d := range devices {
		count[d.UserID]++
	}
	members := make([]gin.H, 0, len(people))
	for _, m := range people {
		members = append(members, gin.H{
			"id": m.ID, "email": m.Email, "role": m.Role, "devices": count[m.ID],
			"folders": listOf(assigned[m.ID]), "joinedAt": m.CreatedAt.UnixMilli(),
			"self": m.ID == user(c).ID,
		})
	}
	invites, _ := s.store.PendingInvites(o.ID)
	waiting := make([]gin.H, 0, len(invites))
	for _, i := range invites {
		waiting = append(waiting, gin.H{
			"token": i.TokenHash, "email": i.Email, "role": i.Role, "expiresAt": i.ExpiresAt.UnixMilli(),
		})
	}
	ok(c, gin.H{
		"members": members, "invites": waiting, "name": o.Name,
		"seats": seatsOf(o, time.Now()), "used": len(people) + len(invites),
	})
}

// 建一张邀请。链接只在这里返回一次：令牌本身不入库（存的是哈希），事后看不到。
func (s *Server) inviteMember(c *gin.Context) {
	var in struct{ Email, Role string }
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "请求内容不是合法的 JSON。")
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if !validEmail(in.Email) {
		fail(c, http.StatusBadRequest, "BAD_EMAIL", "请填写有效的邮箱地址。")
		return
	}
	if !store.ValidRole(in.Role) {
		fail(c, http.StatusBadRequest, "BAD_ROLE", "角色仅支持管理员或操作员。")
		return
	}
	if _, err := s.store.UserByEmail(in.Email); err == nil {
		fail(c, http.StatusConflict, "EMAIL_TAKEN", "该邮箱已注册账号，请对方更换邮箱，或先注销原账号。")
		return
	}
	o := org(c)
	seats := seatsOf(o, time.Now())
	if seats <= 1 {
		fail(c, http.StatusConflict, "PLAN_NO_SEATS", "当前套餐仅供一人使用，升级至 Team 后方可邀请成员。")
		return
	}
	token := randomToken()
	_, err := s.store.CreateInvite(o.ID, in.Email, in.Role, user(c).ID, token, seats, inviteTTL)
	if errors.Is(err, store.ErrSeatLimit) {
		fail(c, http.StatusConflict, "SEAT_LIMIT", "席位已用尽（含尚未接受的邀请）。请撤回一张邀请，或移除一名成员。")
		return
	}
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "邀请创建失败，请稍后再试。")
		return
	}
	s.log(c, evMemberInvite, in.Email, roleName(in.Role))
	url := s.cfg.PublicURL + "/join?code=" + token
	// 配了发信服务器就替他发出去；没配就把链接交给他自己发。两种情况界面都给链接。
	team := org(c).Name
	ok(c, gin.H{
		"url": url, "email": in.Email, "role": in.Role,
		"sent": s.sendInvite(in.Email, team, in.Role, url),
	})
}

// 团队名。它会出现在邀请信和加入页上，被邀请的人靠它认出这是谁发的，
// 所以默认用所有者的邮箱（总好过空白），可以改成"张三的运营组"这样。
func (s *Server) renameTeam(c *gin.Context) {
	var in struct{ Name string }
	name := ""
	if err := c.ShouldBindJSON(&in); err == nil {
		name = strings.TrimSpace(in.Name)
	}
	if len([]rune(name)) < 1 || len([]rune(name)) > 60 {
		fail(c, http.StatusBadRequest, "BAD_NAME", "团队名称需为 1 至 60 个字符。")
		return
	}
	if err := s.store.RenameOrg(org(c).ID, name); err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "修改失败，请稍后再试。")
		return
	}
	ok(c, gin.H{"name": name})
}

func (s *Server) revokeInvite(c *gin.Context) {
	removed, _ := s.store.DeleteInvite(org(c).ID, c.Param("token"))
	if !removed {
		fail(c, http.StatusNotFound, "NOT_FOUND", "该邀请不存在，或已被使用。")
		return
	}
	ok(c, nil)
}

// 邀请页在用户还没登录时就要显示"谁邀请你、什么角色"，所以这一个不要求登录。
func (s *Server) inviteInfo(c *gin.Context) {
	inv, err := s.store.Invite(c.Query("code"))
	if err != nil {
		fail(c, http.StatusNotFound, "INVITE_INVALID", "该邀请链接无效或已过期，请联系邀请人重新发送。")
		return
	}
	name := ""
	if o, err := s.store.Org(inv.OrgID); err == nil {
		name = o.Name
	}
	ok(c, gin.H{"email": inv.Email, "role": inv.Role, "team": name, "expiresAt": inv.ExpiresAt.UnixMilli()})
}

// 接受邀请：用邀请里那个邮箱建账号，直接落在邀请方的团队里。
func (s *Server) acceptInvite(c *gin.Context) {
	var in struct{ Code, Password string }
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "请求内容不是合法的 JSON。")
		return
	}
	if len(in.Password) < 10 {
		fail(c, http.StatusBadRequest, "WEAK_PASSWORD", "密码至少 10 位。")
		return
	}
	inv, err := s.store.Invite(in.Code)
	if err != nil {
		fail(c, http.StatusNotFound, "INVITE_INVALID", "该邀请链接无效或已过期，请联系邀请人重新发送。")
		return
	}
	o, err := s.store.Org(inv.OrgID)
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "无法读取团队信息。")
		return
	}
	u, err := s.store.AcceptInvite(in.Code, inv.Email, hashPassword(in.Password), seatsOf(o, time.Now()))
	switch {
	case errors.Is(err, store.ErrSeatLimit):
		fail(c, http.StatusConflict, "SEAT_LIMIT", "团队席位已满，请联系邀请人释放一个席位。")
		return
	case errors.Is(err, store.ErrInviteUnusable) || errors.Is(err, store.ErrNotFound):
		fail(c, http.StatusNotFound, "INVITE_INVALID", "该邀请链接无效或已过期。")
		return
	case err != nil:
		fail(c, http.StatusInternalServerError, "INTERNAL", "加入失败，请稍后再试。")
		return
	}
	if s.startSession(c, u.ID) != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "账号已创建，但登录失败，请前往登录页重试。")
		return
	}
	c.Set("user", u)
	c.Set("org", o)
	s.log(c, evMemberJoin, u.Email, roleName(u.Role))
	ok(c, gin.H{"user": gin.H{"email": u.Email}})
}

// 角色的中文说法。界面和日志共用一处。
func roleName(role string) string {
	switch role {
	case store.RoleOwner:
		return "所有者"
	case store.RoleAdmin:
		return "管理员"
	default:
		return "操作员"
	}
}

func (s *Server) setMemberRole(c *gin.Context) {
	var in struct{ Role string }
	if err := c.ShouldBindJSON(&in); err != nil || !store.ValidRole(in.Role) {
		fail(c, http.StatusBadRequest, "BAD_ROLE", "角色仅支持管理员或操作员。")
		return
	}
	if err := s.store.SetMemberRole(org(c).ID, c.Param("id"), in.Role); err != nil {
		fail(c, http.StatusNotFound, "NOT_FOUND", "该成员不存在，或其为团队所有者。")
		return
	}
	who := c.Param("id")
	if m, err := s.store.UserByID(who); err == nil {
		who = m.Email
	}
	s.log(c, evMemberRole, who, "改成"+roleName(in.Role))
	ok(c, nil)
}

// 移除成员。点这个按钮通常意味着换人，所以可以顺带把他手上的环境转交给接手的人。
//
// 三件事一起做：设备解绑（令牌当场作废）、钥匙收回（他的新设备也换不到）、
// 他碰过的那几个槽位标成"该换钥匙"——换钥匙由所有者的电脑在后台做，只动那几个环境。
// 他电脑上已经解开过的那一份收不回来，界面上照实说。
func (s *Server) removeMember(c *gin.Context) {
	var in struct{ TransferTo string }
	_ = c.ShouldBindJSON(&in)
	o, id := org(c), c.Param("id")
	if id == user(c).ID {
		fail(c, http.StatusConflict, "SELF", "无法将自己移出团队。")
		return
	}
	// 他手上有哪些文件夹、能看到哪些环境——转交和换钥匙都要用，所以在删之前先拿到。
	hadFolders, _ := s.store.AssignedFolders(o.ID, id)
	had, _ := s.store.AssignedProfiles(o.ID, id)
	gone := id
	if m, err := s.store.UserByID(id); err == nil {
		gone = m.Email
	}
	if in.TransferTo != "" {
		heir, err := s.store.UserByID(in.TransferTo)
		if err != nil || heir.OrgID != o.ID || heir.ID == id {
			fail(c, http.StatusNotFound, "NOT_FOUND", "接手人不在该团队中。")
			return
		}
		if heir.Role == store.RoleOperator {
			// 接手的人也是操作员：把这几个文件夹一并开给他，原有的不动。
			mine, _ := s.store.AssignedFolders(o.ID, heir.ID)
			if err := s.store.AssignFolders(o.ID, heir.ID, append(mine, hadFolders...)); err != nil {
				fail(c, http.StatusInternalServerError, "INTERNAL", "转交失败，请稍后再试。")
				return
			}
		}
		// 接手的是所有者或管理员：他们本来就看得到全部，不用分配。
	}
	devices, _ := s.store.DevicesOfOrg(o.ID)
	if err := s.store.RemoveMember(o.ID, id); err != nil {
		fail(c, http.StatusNotFound, "NOT_FOUND", "该成员不存在，或其为团队所有者。")
		return
	}
	// 他解得开的那几把钥匙都要换：他分到的环境，外加大家共用的那一把。
	stale := []string{store.SharedSlot}
	for _, p := range had {
		stale = append(stale, store.EnvSlot(p))
	}
	if err := s.store.MarkStale(o.ID, stale); err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "标记失败，请稍后再试。")
		return
	}
	// 他那几台电脑还占着运行名额的，现在就还回来。密钥包装也一起删：新设备再也换不到钥匙。
	running := s.store.Running(c, o.ID)
	for _, d := range devices {
		if d.UserID != id {
			continue
		}
		for profile, dev := range running {
			if dev == d.ID {
				s.store.StopLease(c, o.ID, profile, d.ID)
			}
		}
		s.store.DeleteEnvelope(o.ID, d.ID)
		_ = s.store.DropGrants(o.ID, d.ID)
	}
	s.log(c, evMemberRemove, gone, itoa(len(hadFolders))+" 个文件夹已转交，"+itoa(len(stale))+" 把钥匙要换")
	ok(c, gin.H{"rotating": len(stale), "transferred": len(hadFolders)})
}

// 重设某个成员手上的环境。所有者和管理员都能分配。
// assignFolders 重设一个成员手上的文件夹。
//
// 授权挂在文件夹上，所以这里只收文件夹编号；他看得到哪些环境是推出来的。
// 收回之后要做两件事：把发给他各台电脑的钥匙收掉，并把那几个槽位标记成要换钥匙——
// 他手上可能还留着副本。这一段和按环境分配时一模一样，只是"少了哪些"改成由前后两份推算。
func (s *Server) assignFolders(c *gin.Context) {
	var in struct{ Folders []string }
	if err := c.ShouldBindJSON(&in); err != nil || len(in.Folders) > 500 {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "请求内容无效。")
		return
	}
	o, id := org(c), c.Param("id")
	member, err := s.store.UserByID(id)
	if err != nil || member.OrgID != o.ID {
		fail(c, http.StatusNotFound, "NOT_FOUND", "该成员不存在。")
		return
	}
	// 只认这个团队里真的有的文件夹。
	mine := map[string]bool{}
	list, _ := s.store.Folders(o.ID)
	for _, f := range list {
		mine[f.ID] = true
	}
	keep := make([]string, 0, len(in.Folders))
	for _, f := range in.Folders {
		if mine[f] {
			keep = append(keep, f)
		}
	}
	before, _ := s.store.AssignedProfiles(o.ID, id)
	if err := s.store.AssignFolders(o.ID, id, keep); err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "分配失败，请稍后再试。")
		return
	}
	after, _ := s.store.AssignedProfiles(o.ID, id)
	s.revokeGone(c, id, before, after)
	s.log(c, evMemberAssign, member.Email, itoa(len(keep))+" 个文件夹")
	ok(c, gin.H{"folders": keep})
}

// revokeGone 他原来看得到、现在看不到的那些环境：收钥匙 + 标记要换一把新的。
// 环境换文件夹、文件夹被收回，走的都是这一条。
func (s *Server) revokeGone(c *gin.Context, userID string, before, after []string) {
	o := org(c)
	now := map[string]bool{}
	for _, p := range after {
		now[p] = true
	}
	dropped := make([]string, 0)
	for _, p := range before {
		if !now[p] {
			dropped = append(dropped, store.EnvSlot(p))
		}
	}
	if len(dropped) == 0 {
		return
	}
	devices, _ := s.store.DevicesOfOrg(o.ID)
	for _, d := range devices {
		if d.UserID == userID {
			_ = s.store.DropGrants(o.ID, d.ID, dropped...)
		}
	}
	_ = s.store.MarkStale(o.ID, dropped)
}

/* ── 按角色决定看得到什么 ─────────────────────────────────
   所有者和管理员看得到团队的全部；操作员只看得到分配给他的那几个。
   服务器直接不下发别的环境的密文——不是靠客户端自觉。 */

// visible 返回 nil 表示"全部可见"，否则是这个人能看到的环境编号。
// listOf 保证发出去的是 []，不是 null。
//
// Go 把 nil 切片写成 JSON 的 null，界面拿到之后 .length 直接抛错——
// 一个还没分配过环境的操作员，就能让所有者的账号页整页挂掉。
func listOf(v []string) []string {
	if v == nil {
		return []string{}
	}
	return v
}

func (s *Server) visible(c *gin.Context) map[string]bool {
	u := user(c)
	if u.Role != store.RoleOperator {
		return nil
	}
	ids, _ := s.store.AssignedProfiles(u.OrgID, u.ID)
	set := make(map[string]bool, len(ids))
	for _, id := range ids {
		set[id] = true
	}
	return set
}

func (s *Server) canSee(c *gin.Context, profileID string) bool {
	set := s.visible(c)
	return set == nil || set[profileID]
}

// 操作员不能改团队的配置：新建/删除环境、改环境和代理、开关同步都不行。
func (s *Server) needEditor(c *gin.Context) {
	if user(c).Role == store.RoleOperator {
		fail(c, http.StatusForbidden, "ROLE_FORBIDDEN", "当前角色为操作员：可打开已分配的环境，但无法修改团队配置。")
		return
	}
	c.Next()
}
