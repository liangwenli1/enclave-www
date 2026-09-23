package httpapi

import (
	"net/http"
	"regexp"
	"strings"

	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
)

/* 槽位钥匙的转交。服务器在这里做的还是老三样：保管、转交、记住谁有哪一份。
   它拆不开任何一份包装，也不知道任何一个环境叫什么。

   谁看得到什么：
     所有者 / 管理员：全部槽位的 box_team（用团队密钥包的），所以他们能解开团队的一切。
     操作员：          只有发给他这台设备的那几份 grant——分配之外的环境，他连钥匙都没有。 */

var slotRe = regexp.MustCompile(`^(shared|env:[A-Za-z0-9_:-]{1,80})$`)

// 这个人是不是拿得到团队密钥。操作员永远不是。
func holdsTeamKey(c *gin.Context) bool {
	return user(c).Role != store.RoleOperator
}

// 客户端每次同步先来这里：我现在能用哪些钥匙、哪些该换了、谁还等着我发钥匙。
func (s *Server) slotList(c *gin.Context) {
	o, d := org(c), device(c)
	slots, err := s.store.Slots(o.ID)
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "读取失败，请稍后再试。")
		return
	}
	grants, _ := s.store.GrantsFor(o.ID, d.ID)
	mine := map[string]store.SyncGrant{}
	for _, g := range grants {
		mine[g.Slot] = g
	}
	out := make([]gin.H, 0, len(slots))
	for _, sl := range slots {
		item := gin.H{"slot": sl.Slot, "keyId": sl.KeyID, "stale": sl.Stale}
		if holdsTeamKey(c) {
			item["boxTeam"] = sl.BoxTeam
		}
		// 发给这台设备的那一份。编号对不上说明钥匙换过了，当没有。
		if g, has := mine[sl.Slot]; has && g.KeyID == sl.KeyID {
			item["grant"] = gin.H{"ephemeral": g.Ephemeral, "box": g.Box}
		}
		out = append(out, item)
	}
	body := gin.H{"slots": out, "holdsTeamKey": holdsTeamKey(c)}
	// 所有者和管理员还要知道：该给谁发钥匙。
	if holdsTeamKey(c) {
		body["wanted"] = s.wantedGrants(c)
	}
	ok(c, body)
}

// wantedGrants 现在还缺哪些"某台设备该拿到某个槽位的钥匙"。
// 服务器只算出这张清单，包装由所有者的电脑做——钥匙不经过这里。
func (s *Server) wantedGrants(c *gin.Context) []gin.H {
	o := org(c)
	slots, _ := s.store.Slots(o.ID)
	byName := map[string]store.SyncSlot{}
	for _, sl := range slots {
		byName[sl.Slot] = sl
	}
	members, _ := s.store.Members(o.ID)
	devices, _ := s.store.DevicesOfOrg(o.ID)
	assigned, _ := s.store.AssignmentsOf(o.ID)
	have := map[string]string{} // 槽位+设备 → 已经发过的编号
	if grants, err := s.store.GrantsOf(o.ID); err == nil {
		for _, g := range grants {
			have[g.Slot+"\x00"+g.DeviceID] = g.KeyID
		}
	}
	role := map[string]string{}
	for _, m := range members {
		role[m.ID] = m.Role
	}

	out := make([]gin.H, 0)
	for _, d := range devices {
		// 操作员之外的人用团队密钥，不需要单独发槽位钥匙。
		if role[d.UserID] != store.RoleOperator || d.SyncPublicKey == "" {
			continue
		}
		want := []string{store.SharedSlot}
		for _, p := range assigned[d.UserID] {
			want = append(want, store.EnvSlot(p))
		}
		for _, name := range want {
			sl, exists := byName[name]
			if !exists {
				continue // 这个环境还没建过钥匙，等所有者的电脑先建。
			}
			if have[name+"\x00"+d.ID] == sl.KeyID {
				continue
			}
			out = append(out, gin.H{
				"slot": name, "keyId": sl.KeyID, "deviceId": d.ID,
				"publicKey": d.SyncPublicKey, "digits": pairingDigits(d.SyncPublicKey),
			})
		}
	}
	return out
}

type slotBody struct {
	Slot, KeyID, BoxTeam string
}

// 建一个槽位，或者给它换一把钥匙。只有拿得到团队密钥的人能做。
func (s *Server) slotPut(c *gin.Context) {
	var in slotBody
	if err := c.ShouldBindJSON(&in); err != nil || !slotRe.MatchString(in.Slot) ||
		len(in.KeyID) < 8 || len(in.KeyID) > 64 || !b64Re.MatchString(in.BoxTeam) {
		badSync(c, "槽位、编号或包装不合法。")
		return
	}
	// 这个槽位本来就有、现在换了编号：那是一次换钥匙，值得记一笔。
	had := false
	if old, err := s.store.Slot(org(c).ID, in.Slot); err == nil && old.KeyID != in.KeyID {
		had = true
	}
	row := store.SyncSlot{OrgID: org(c).ID, Slot: in.Slot, KeyID: in.KeyID, BoxTeam: in.BoxTeam}
	if err := s.store.PutSlot(row); err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "保存失败，请稍后再试。")
		return
	}
	// 换了新钥匙：这个槽位上所有旧的授予作废，等重新发。
	if err := s.store.DB.Where("org_id = ? AND slot = ? AND key_id <> ?", row.OrgID, row.Slot, row.KeyID).
		Delete(&store.SyncGrant{}).Error; err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "旧的授权未能清除，请稍后再试。")
		return
	}
	if had {
		s.log(c, evSyncRotate, in.Slot, "换了一把新钥匙")
	}
	ok(c, gin.H{"slot": in.Slot, "keyId": in.KeyID})
}

// 把某个槽位的钥匙发给某台设备。包装是所有者的电脑做好的，这里只转交。
func (s *Server) grantPut(c *gin.Context) {
	var in struct {
		Slot, KeyID, DeviceID, Ephemeral, Box, Digits string
	}
	if err := c.ShouldBindJSON(&in); err != nil || !slotRe.MatchString(in.Slot) ||
		!b64Re.MatchString(in.Ephemeral) || !b64Re.MatchString(in.Box) {
		badSync(c, "请求内容不完整。")
		return
	}
	o := org(c)
	sl, err := s.store.Slot(o.ID, in.Slot)
	if err != nil || sl.KeyID != in.KeyID {
		fail(c, http.StatusConflict, "SLOT_KEY_CHANGED", "该槽位的密钥已更换，请重新获取后再发送。")
		return
	}
	// 只能发给本团队里登记过公钥的设备，而且要和发钥匙那台电脑核对过的数字一致。
	devices, _ := s.store.DevicesOfOrg(o.ID)
	found := false
	for _, d := range devices {
		if d.ID == in.DeviceID && d.SyncPublicKey != "" && pairingDigits(d.SyncPublicKey) == in.Digits {
			found = true
		}
	}
	if !found {
		fail(c, http.StatusNotFound, "NO_DEVICE", "该设备不存在，或其公钥与已核对的不一致。")
		return
	}
	g := store.SyncGrant{
		OrgID: o.ID, Slot: in.Slot, DeviceID: in.DeviceID, KeyID: in.KeyID,
		Ephemeral: in.Ephemeral, Box: in.Box,
	}
	if err := s.store.PutGrant(g); err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "提交失败，请稍后再试。")
		return
	}
	ok(c, nil)
}

// 换完钥匙、也重新发过了：把"该换钥匙"的标记摘掉。
func (s *Server) slotSettled(c *gin.Context) {
	var in struct{ Slots []string }
	if err := c.ShouldBindJSON(&in); err != nil || len(in.Slots) > 500 {
		badSync(c, "请求内容无效。")
		return
	}
	keep := make([]string, 0, len(in.Slots))
	for _, name := range in.Slots {
		if slotRe.MatchString(name) {
			keep = append(keep, name)
		}
	}
	if len(keep) > 0 {
		s.store.DB.Model(&store.SyncSlot{}).
			Where("org_id = ? AND slot IN ?", org(c).ID, keep).Update("stale", false)
	}
	ok(c, nil)
}

// 环境被删掉时，它的钥匙也没用了。
func (s *Server) slotDelete(c *gin.Context) {
	slot := strings.TrimSpace(c.Param("slot"))
	if !slotRe.MatchString(slot) || slot == store.SharedSlot {
		badSync(c, "槽位不合法。")
		return
	}
	if err := s.store.DeleteSlot(org(c).ID, slot); err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "删除失败，请稍后再试。")
		return
	}
	ok(c, nil)
}

// operatorIDs 这个团队里哪些人是操作员。他们的电脑不拿团队密钥。
func (s *Server) operatorIDs(orgID string) map[string]bool {
	members, _ := s.store.Members(orgID)
	out := map[string]bool{}
	for _, m := range members {
		if m.Role == store.RoleOperator {
			out[m.ID] = true
		}
	}
	return out
}

// slotKeyID 这个槽位现在这把钥匙的编号。拿旧钥匙加密的东西不许往上推。
func (s *Server) slotKeyID(orgID, slot string) string {
	if row, err := s.store.Slot(orgID, slot); err == nil {
		return row.KeyID
	}
	return ""
}
