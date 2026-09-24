package httpapi

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"time"

	"enclave/api/internal/license"
	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

/* 桌面工作台这一侧。订阅状态以数据库为准：工作台每次新建、启动环境都来问，
   手里不留一份"几天内有效"的凭据。连不上这里，就新建不了、启动不了。 */

// 工作台登录不在工作台里输密码。它打开官网，用户在官网（已登录）点一下"允许"，
// 官网带着一次性授权码跳回 enclave://auth，工作台再用这个码换设备令牌。
// 授权码绑着工作台事先给的 challenge：别的程序就算截到了 enclave:// 链接，没有 verifier 也换不出令牌。

var challengeRe = regexp.MustCompile(`^[A-Za-z0-9_-]{43}$`)

func (s *Server) authorizeDevice(c *gin.Context) {
	var in struct{ Challenge, DeviceID, DeviceName string }
	if err := c.ShouldBindJSON(&in); err != nil || !challengeRe.MatchString(in.Challenge) {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "该登录请求不完整，请返回工作台重新发起登录。")
		return
	}
	code := randomToken()
	err := s.store.PutDeviceCode(c, code, store.DeviceCode{
		UserID: user(c).ID, Challenge: in.Challenge,
		DeviceID: clip(in.DeviceID, 64), DeviceName: clip(in.DeviceName, 64),
	})
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "未能生成授权码，请稍后再试。")
		return
	}
	ok(c, gin.H{"redirect": "enclave://auth?code=" + url.QueryEscape(code)})
}

func (s *Server) exchangeDevice(c *gin.Context) {
	var in struct{ Code, Verifier string }
	_ = c.ShouldBindJSON(&in)
	grant, found := s.store.TakeDeviceCode(c, in.Code)
	sum := sha256.Sum256([]byte(in.Verifier))
	if !found || subtle.ConstantTimeCompare([]byte(base64.RawURLEncoding.EncodeToString(sum[:])), []byte(grant.Challenge)) != 1 {
		fail(c, http.StatusUnauthorized, "BAD_CODE", "本次登录已失效，请返回工作台重新发起登录。")
		return
	}
	u, err := s.store.UserByID(grant.UserID)
	if err != nil {
		fail(c, http.StatusUnauthorized, "BAD_CODE", "账号不存在。")
		return
	}
	org, err := s.store.Org(u.OrgID)
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "无法读取账号的订阅信息。")
		return
	}
	deviceID, name := grant.DeviceID, grant.DeviceName
	if deviceID == "" {
		deviceID = uuid.NewString()
	}
	if name == "" {
		name = "未命名设备"
	}
	limit := deviceLimitOf(org, time.Now())
	token := randomToken()
	if err := s.store.BindDevice(u, deviceID, name, token, limit); errors.Is(err, store.ErrDeviceLimit) {
		fail(c, http.StatusConflict, "DEVICE_LIMIT", "该账号最多可在 "+itoa(limit)+" 台电脑上登录。到官网账号页解绑一台，或者升级档位。")
		return
	} else if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "设备绑定失败，请稍后再试。")
		return
	}
	c.Set("user", u)
	c.Set("org", org)
	s.log(c, evDeviceLogin, name, "")
	ok(c, gin.H{"token": token, "deviceId": deviceID, "email": u.Email})
}

/* ── 设备令牌鉴权 ───────────────────────────────────────── */

func (s *Server) needDevice(c *gin.Context) {
	token := bearer(c)
	if token == "" {
		fail(c, http.StatusUnauthorized, "UNAUTHENTICATED", "缺少设备令牌。")
		return
	}
	d, err := s.store.DeviceByToken(token)
	if err != nil {
		fail(c, http.StatusUnauthorized, "DEVICE_REVOKED", "该设备的登录已失效，请重新登录。")
		return
	}
	u, err := s.store.UserByID(d.UserID)
	if err != nil {
		fail(c, http.StatusUnauthorized, "DEVICE_REVOKED", "账号不存在。")
		return
	}
	org, err := s.store.Org(u.OrgID)
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "无法读取账号的订阅信息。")
		return
	}
	s.store.TouchDevice(d.ID)
	c.Set("device", d)
	c.Set("user", u)
	c.Set("org", org)
	c.Next()
}

func clip(s string, n int) string {
	r := []rune(s)
	if len(r) > n {
		return string(r[:n])
	}
	return s
}

func itoa(n int) string { return strconv.Itoa(n) }

func device(c *gin.Context) *store.Device    { return c.MustGet("device").(*store.Device) }
func org(c *gin.Context) *store.Organization { return c.MustGet("org").(*store.Organization) }

func (s *Server) deviceLogout(c *gin.Context) {
	d := device(c)
	for id, dev := range s.store.Running(c, org(c).ID) {
		if dev == d.ID {
			s.store.StopLease(c, org(c).ID, id, d.ID)
		}
	}
	_, _ = s.store.DeleteDevice(d.ID, d.UserID)
	ok(c, nil)
}

/* ── 额度 ───────────────────────────────────────────────── */

// 工作台启动、每次要新建或启动之前都会来问这个。这里说的就是数据库里此刻的状态。
func (s *Server) entitlement(c *gin.Context) {
	o := org(c)
	now := time.Now()
	plan, expired := license.Effective(o.PlanTier, o.SubscriptionExpiresAt, now)
	plan.DeviceLimit = deviceLimitOf(o, now)
	var expiresAt *int64
	if !expired {
		expiresAt = ms(o.SubscriptionExpiresAt)
	}
	ok(c, gin.H{
		"email":     user(c).Email,
		"role":      user(c).Role,
		"deviceId":  device(c).ID,
		"plan":      plan,
		"expiresAt": expiresAt,
		"profiles":  s.store.ProfileCount(o.ID),
		"running":   len(s.store.Running(c, o.ID)),
	})
}

/* ── 环境名额 ───────────────────────────────────────────── */

var profileIDRe = regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)

// pickFolder 环境必须属于且只属于一个文件夹。没给、或者给了个不存在的，就放进默认那个——
// 授权是按文件夹算的，一个环境要是谁的文件夹都不属于，它就成了谁都看不见的孤儿：
// 所有者在界面上找不到它，操作员也拿不到它的钥匙，但它还占着名额。
func pickFolder(want string, exists map[string]bool) string {
	if want == "" || !exists[want] {
		return store.DefaultFolder
	}
	return want
}

func folderOr(s *Server, orgID, want string) string {
	list, _ := s.store.Folders(orgID)
	exists := map[string]bool{store.DefaultFolder: true}
	for _, f := range list {
		exists[f.ID] = true
	}
	return pickFolder(want, exists)
}

func (s *Server) putProfile(c *gin.Context) {
	id := c.Param("id")
	var in struct{ Name, FolderID, EngineVersion, OS string }
	if err := c.ShouldBindJSON(&in); err != nil || !profileIDRe.MatchString(id) {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "环境 ID 无效。")
		return
	}
	o := org(c)
	plan, _ := license.Effective(o.PlanTier, o.SubscriptionExpiresAt, time.Now())
	// 换文件夹会改变谁看得到它：先记下现在谁看得到，写完再对一次账。
	before := s.seenByOperators(o.ID)
	err := s.store.PutProfile(store.Profile{
		ID: id, OrgID: o.ID, CreatedBy: user(c).ID, Name: clip(in.Name, 128),
		FolderID:   folderOr(s, o.ID, in.FolderID),
		EngineType: "fingerprint-chromium", EngineVersion: clip(in.EngineVersion, 32), OSTarget: clip(in.OS, 32),
	}, plan.EnvLimit)
	switch {
	case errors.Is(err, store.ErrProfileLimit):
		fail(c, http.StatusConflict, "PLAN_ENV_LIMIT", plan.Label+" 最多 "+itoa(plan.EnvLimit)+" 个环境（这个账号下所有电脑合起来算）。删掉不用的，或者升级档位。")
	case err != nil:
		fail(c, http.StatusInternalServerError, "INTERNAL", "登记失败，请稍后再试。")
	default:
		for uid, was := range before {
			now, _ := s.store.AssignedProfiles(o.ID, uid)
			s.revokeGone(c, uid, was, now)
		}
		s.log(c, evProfileCreate, id, clip(in.Name, 64))
		ok(c, gin.H{"profiles": s.store.ProfileCount(o.ID)})
	}
}

func (s *Server) listProfiles(c *gin.Context) {
	o := c.MustGet("org").(*store.Organization)
	list, _ := s.store.Profiles(o.ID)
	running := s.store.Running(c, o.ID)
	seen := s.visible(c)
	out := make([]gin.H, 0, len(list))
	for _, p := range list {
		if seen != nil && !seen[p.ID] {
			continue
		}
		out = append(out, gin.H{
			"id": p.ID, "name": p.Name, "folderId": p.FolderID, "engineVersion": p.EngineVersion,
			"os": p.OSTarget, "createdAt": p.CreatedAt.UnixMilli(), "runningOn": running[p.ID],
		})
	}
	ok(c, gin.H{"profiles": out})
}

func (s *Server) deleteProfile(c *gin.Context) {
	o := c.MustGet("org").(*store.Organization)
	id := c.Param("id")
	if dev, busy := s.store.Running(c, o.ID)[id]; busy {
		// 从官网删、或者从另一台电脑删：正在跑的不能删，先停。自己这台在跑的由工作台先停再删。
		if d, isDevice := c.Get("device"); !isDevice || d.(*store.Device).ID != dev {
			fail(c, http.StatusConflict, "PROFILE_RUNNING", "该环境正在另一台设备上运行，请先在该设备停止。")
			return
		}
		s.store.StopLease(c, o.ID, id, dev)
	}
	// 授权挂在文件夹上，环境行删掉，可见范围自然跟着变，没有别的账要清。
	s.store.DeleteProfile(o.ID, id)
	s.log(c, evProfileDelete, id, "")
	ok(c, gin.H{"profiles": s.store.ProfileCount(o.ID)})
}

/* ── 启动授权、心跳、停止 ───────────────────────────────── */

func (s *Server) startProfile(c *gin.Context) {
	o, d, id := org(c), device(c), c.Param("id")
	if !s.store.ProfileOf(o.ID, id) {
		fail(c, http.StatusNotFound, "PROFILE_UNKNOWN", "该环境未登记在当前账号下。")
		return
	}
	if !s.canSee(c, id) {
		fail(c, http.StatusForbidden, "ROLE_FORBIDDEN", "该环境未分配给当前账号，请联系团队所有者分配。")
		return
	}
	plan, _ := license.Effective(o.PlanTier, o.SubscriptionExpiresAt, time.Now())
	if !s.store.WithinLimit(o.ID, id, plan.EnvLimit) {
		fail(c, http.StatusConflict, "PLAN_ENV_LIMIT", "账号现在是"+plan.Label+"，只有最早建的 "+itoa(plan.EnvLimit)+" 个环境可以启动。续订，或者删掉排在前面不用的环境。")
		return
	}
	result, owner, err := s.store.StartLease(c, o.ID, id, d.ID, plan.Concurrent)
	switch {
	case err != nil:
		fail(c, http.StatusServiceUnavailable, "LEASE_UNAVAILABLE", "服务器暂时无法确认运行名额，请稍后再试。")
	case result == "LOCKED":
		s.log(c, evProfileDenied, id, "另一台电脑正开着")
		fail(c, http.StatusConflict, "PROFILE_LOCKED", "这个环境正在「"+s.deviceName(d.UserID, owner)+"」上运行。同一个环境同一时刻只能在一台电脑上打开，先在那边停掉。")
	case result == "LIMIT":
		s.log(c, evProfileDenied, id, "同时运行数满了")
		fail(c, http.StatusConflict, "PLAN_CONCURRENT_LIMIT", plan.Label+" 最多同时运行 "+itoa(plan.Concurrent)+" 个环境（这个账号下所有电脑合起来算）。先停掉一个，或者升级档位。")
	default:
		s.log(c, evProfileStart, id, "")
		ok(c, gin.H{"leaseSeconds": store.LeaseSeconds})
	}
}

func (s *Server) deviceName(userID, deviceID string) string {
	list, _ := s.store.Devices(userID)
	for _, d := range list {
		if d.ID == deviceID {
			return d.Name
		}
	}
	return "另一台电脑"
}

// 心跳。held=false：这个环境已经归别的电脑了（租约过期后被接手），或者名额被别的环境占满了。
// 工作台收到 false 就停掉本机的这个环境——同一个环境不能两边同时开着。
func (s *Server) heartbeatProfile(c *gin.Context) {
	o := org(c)
	// 分配在他开着的时候被收回了：按"租约丢了"处理，工作台一分钟内会停掉它。
	if !s.canSee(c, c.Param("id")) {
		s.log(c, evProfileLost, c.Param("id"), "分配被收回")
		ok(c, gin.H{"held": false})
		return
	}
	plan, _ := license.Effective(o.PlanTier, o.SubscriptionExpiresAt, time.Now())
	result, _, err := s.store.StartLease(c, o.ID, c.Param("id"), device(c).ID, plan.Concurrent)
	if err != nil {
		fail(c, http.StatusServiceUnavailable, "LEASE_UNAVAILABLE", "续期失败，请稍后再试。")
		return
	}
	ok(c, gin.H{"held": result == "OK"})
}

func (s *Server) stopProfile(c *gin.Context) {
	s.store.StopLease(c, org(c).ID, c.Param("id"), device(c).ID)
	s.log(c, evProfileStop, c.Param("id"), "")
	ok(c, nil)
}

// cookie 会话（官网账号页）也能看、能删环境登记：电脑丢了、重装了，名额要有地方收回来。
func (s *Server) withOrg(c *gin.Context) {
	o, err := s.store.Org(user(c).OrgID)
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "无法读取账号的订阅信息。")
		return
	}
	c.Set("org", o)
	c.Next()
}
