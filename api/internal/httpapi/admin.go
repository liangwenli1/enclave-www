package httpapi

import (
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"enclave/api/internal/license"
	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm/clause"
)

func (s *Server) listUsers(c *gin.Context) {
	type row struct {
		Email                 string
		PlanTier              string
		SubscriptionExpiresAt *time.Time
		BillingStatus         string
		CreatedAt             time.Time
		Devices               int
	}
	var rows []row
	q := s.store.DB.Table("users").
		Select("users.email, organizations.plan_tier, organizations.subscription_expires_at, organizations.billing_status, users.created_at, (SELECT count(*) FROM devices WHERE devices.user_id = users.id) AS devices").
		Joins("JOIN organizations ON organizations.id = users.org_id").
		Order("users.created_at DESC").Limit(200)
	if term := strings.ToLower(strings.TrimSpace(c.Query("q"))); term != "" {
		q = q.Where("users.email LIKE ?", "%"+term+"%")
	}
	q.Scan(&rows)
	out := make([]gin.H, 0, len(rows))
	now := time.Now()
	for _, r := range rows {
		plan, expired := license.Effective(r.PlanTier, r.SubscriptionExpiresAt, now)
		out = append(out, gin.H{
			"email": r.Email, "plan": plan.Plan, "label": plan.Label, "expired": expired,
			"expiresAt": ms(r.SubscriptionExpiresAt), "billingStatus": r.BillingStatus,
			"devices": r.Devices, "createdAt": r.CreatedAt.UnixMilli(),
		})
	}
	ok(c, gin.H{"users": out})
}

// 手动开通 / 改档。在线订阅之外的路：线下收款、送测试号、支付通道出问题时应急。
func (s *Server) setPlan(c *gin.Context) {
	var in struct {
		Email       string `json:"email"`
		Plan        string `json:"plan"`
		ExpiresAt   *int64 `json:"expiresAt"`
		DeviceLimit *int   `json:"deviceLimit"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "请求内容不是合法的 JSON。")
		return
	}
	u, err := s.store.UserByEmail(strings.ToLower(strings.TrimSpace(in.Email)))
	if err != nil {
		fail(c, http.StatusNotFound, "NOT_FOUND", "账号不存在。")
		return
	}
	plan := license.PlanOf(in.Plan)
	if plan.Plan != in.Plan {
		fail(c, http.StatusBadRequest, "BAD_PLAN", "套餐无效。")
		return
	}
	var expires *time.Time
	if in.ExpiresAt != nil {
		t := time.UnixMilli(*in.ExpiresAt)
		if !t.After(time.Now()) {
			fail(c, http.StatusBadRequest, "BAD_EXPIRES_AT", "到期时间须晚于当前时间。")
			return
		}
		expires = &t
	}
	limit := plan.DeviceLimit
	if in.DeviceLimit != nil {
		if *in.DeviceLimit < 1 {
			fail(c, http.StatusBadRequest, "BAD_DEVICE_LIMIT", "设备上限至少为 1。")
			return
		}
		limit = *in.DeviceLimit
	}
	s.store.DB.Model(&store.Organization{}).Where("id = ?", u.OrgID).Updates(map[string]any{
		"plan_tier": plan.Plan, "subscription_expires_at": expires, "device_limit": in.DeviceLimit,
	})
	if o, err := s.store.Org(u.OrgID); err == nil {
		c.Set("org", o)
		s.log(c, evPlanChange, u.Email, "改成 "+plan.Label)
	}
	ok(c, gin.H{"email": u.Email, "plan": plan.Plan, "expiresAt": in.ExpiresAt, "deviceLimit": limit,
		"devicesUnbound": s.store.TrimDevices(u.ID, limit)})
}

/* ── 内核上架 ───────────────────────────────────────────── */

// 本机 Host 只从这里下载内核。别的地址登记不进来，就算登记进来 Host 也会拒绝。

var (
	// 数字和点，后面可以带一段预发布标记：148.0.7778.215、152.0.4-beta.30。和客户端是同一条规则。
	versionRe  = regexp.MustCompile(`^\d+(\.\d+){0,3}(-[0-9A-Za-z]+(\.[0-9A-Za-z]+)*)?$`)
	filenameRe = regexp.MustCompile(`^[\w.+-]+\.(zip|dmg|tar\.xz)$`)
	sha256Re   = regexp.MustCompile(`^[0-9a-f]{64}$`)
	platforms  = map[string]bool{"win-x64": true, "mac-arm64": true, "linux-x64": true}
)

func (s *Server) putKernel(c *gin.Context) {
	var in struct {
		Engine, Version, Platform, Channel, URL, SHA256, Notes string
		Bytes                                                  int64
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "请求内容不是合法的 JSON。")
		return
	}
	bad := func(msg string) { fail(c, http.StatusBadRequest, "BAD_KERNEL", msg) }
	engine, known := license.EngineOf(in.Engine)
	k := store.Kernel{
		Engine:  engine.Class,
		Version: strings.TrimSpace(in.Version), Platform: in.Platform, Channel: in.Channel,
		URL: strings.TrimSpace(in.URL), SHA256: strings.ToLower(strings.TrimSpace(in.SHA256)),
		Bytes: in.Bytes, Notes: clip(in.Notes, 300), CreatedAt: time.Now(),
	}
	if k.Channel == "" {
		k.Channel = "candidate"
	}
	// 先规整再比：".." 能让一个以上游前缀开头的地址实际指到别的仓库去。
	parsed, err := url.Parse(k.URL)
	switch {
	case !known:
		bad("内核类型仅支持 chromium 或 firefox。")
	case !versionRe.MatchString(k.Version) || len(k.Version) > 32:
		bad("版本号格式应为 148.0.7778.215 或 152.0.4-beta.30。")
	case !platforms[k.Platform]:
		bad("平台仅支持 win-x64 / mac-arm64 / linux-x64。")
	case k.Channel != "stable" && k.Channel != "candidate":
		bad("通道仅支持 stable 或 candidate。")
	case err != nil || parsed.String() != k.URL || strings.Contains(k.URL, "..") || !strings.HasPrefix(k.URL, engine.URLPrefix):
		bad("这一类内核的下载地址必须以 " + engine.URLPrefix + " 开头，且不能带 .. 或空白。")
	case !sha256Re.MatchString(k.SHA256):
		bad("SHA256 须为 64 位十六进制（下载后自行计算）。")
	case k.Bytes < 1_000_000:
		bad("字节数须为文件的真实大小。")
	default:
		k.Filename = k.URL[strings.LastIndex(k.URL, "/")+1:]
		if !filenameRe.MatchString(k.Filename) {
			bad("下载地址须指向 .zip / .dmg / .tar.xz 文件。")
			return
		}
		// 同一个版本 + 平台再登记一次就是修改（比如预览转稳定）。上架时间不变。
		s.store.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "version"}, {Name: "platform"}},
			DoUpdates: clause.AssignmentColumns([]string{"engine", "channel", "url", "filename", "sha256", "bytes", "notes"}),
		}).Create(&k)
		ok(c, gin.H{"kernel": k})
	}
}

func (s *Server) listKernels(c *gin.Context) {
	// 一条都没有时也要发 []：nil 切片会被写成 null，界面上一个 .length 就整页挂掉。
	rows := make([]store.Kernel, 0)
	s.store.DB.Order("created_at DESC").Find(&rows)
	ok(c, gin.H{"kernels": rows})
}

// 下架。已经下载到用户机器上的不受影响，只是不能再下载。
func (s *Server) deleteKernel(c *gin.Context) {
	res := s.store.DB.Where("version = ? AND platform = ?", c.Param("version"), c.Param("platform")).Delete(&store.Kernel{})
	if res.RowsAffected == 0 {
		fail(c, http.StatusNotFound, "NOT_FOUND", "该版本未曾上架。")
		return
	}
	ok(c, nil)
}

func (s *Server) listMessages(c *gin.Context) {
	rows := make([]store.Message, 0)
	s.store.DB.Order("created_at DESC").Limit(200).Find(&rows)
	ok(c, gin.H{"messages": rows})
}
