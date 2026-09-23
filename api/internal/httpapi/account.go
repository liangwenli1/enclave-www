package httpapi

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"enclave/api/internal/license"
	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type credentials struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	DeviceID   string `json:"deviceId"`
	DeviceName string `json:"deviceName"`
}

func readCredentials(c *gin.Context) (credentials, bool) {
	var in credentials
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "请求内容不是合法的 JSON。")
		return in, false
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	return in, true
}

func validEmail(email string) bool {
	addr, err := mail.ParseAddress(email)
	return err == nil && addr.Address == email && len(email) <= 254 && strings.Contains(email[strings.LastIndex(email, "@"):], ".")
}

func (s *Server) register(c *gin.Context) {
	in, okay := readCredentials(c)
	if !okay {
		return
	}
	if !validEmail(in.Email) {
		fail(c, http.StatusBadRequest, "BAD_EMAIL", "请填写有效的邮箱地址。")
		return
	}
	if len(in.Password) < 10 {
		fail(c, http.StatusBadRequest, "WEAK_PASSWORD", "密码至少 10 位。")
		return
	}
	u, err := s.store.CreateUser(in.Email, hashPassword(in.Password))
	if errors.Is(err, gorm.ErrDuplicatedKey) || (err != nil && strings.Contains(err.Error(), "duplicate key")) {
		fail(c, http.StatusConflict, "EMAIL_TAKEN", "该邮箱已注册，请直接登录。")
		return
	}
	if err != nil || s.startSession(c, u.ID) != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "注册失败，请稍后再试。")
		return
	}
	ok(c, gin.H{"user": gin.H{"email": u.Email}})
}

// authenticate 邮箱和密码对不对。查无此人时照样算一次哈希。
func (s *Server) authenticate(in credentials) *store.User {
	u, err := s.store.UserByEmail(in.Email)
	if err != nil {
		verifyPassword(in.Password, dummyHash)
		return nil
	}
	if !verifyPassword(in.Password, u.PassHash) {
		return nil
	}
	return u
}

func (s *Server) login(c *gin.Context) {
	in, okay := readCredentials(c)
	if !okay {
		return
	}
	u := s.authenticate(in)
	if u == nil {
		fail(c, http.StatusUnauthorized, "BAD_CREDENTIALS", "邮箱或密码有误。")
		return
	}
	if s.startSession(c, u.ID) != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "登录失败，请稍后再试。")
		return
	}
	ok(c, gin.H{"user": gin.H{"email": u.Email}})
}

func (s *Server) logout(c *gin.Context) {
	if sid, err := c.Cookie(sessionCookie); err == nil {
		s.store.EndSession(c, sid)
	}
	s.setCookie(c, "", -1)
	ok(c, nil)
}

// deviceLimitOf 这个组织现在能绑几台设备。订阅过期的按免费档算，管理员改过的上限不再生效。
func deviceLimitOf(org *store.Organization, now time.Time) int {
	plan, expired := license.Effective(org.PlanTier, org.SubscriptionExpiresAt, now)
	if !expired && org.DeviceLimit != nil {
		return *org.DeviceLimit
	}
	return plan.DeviceLimit
}

func (s *Server) me(c *gin.Context) {
	u := s.currentUser(c)
	if u == nil {
		ok(c, gin.H{"user": nil})
		return
	}
	org, err := s.store.Org(u.OrgID)
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "无法读取账号的订阅信息。")
		return
	}
	now := time.Now()
	plan, expired := license.Effective(org.PlanTier, org.SubscriptionExpiresAt, now)
	lic := gin.H{
		"plan": plan.Plan, "label": plan.Label, "envLimit": plan.EnvLimit, "concurrent": plan.Concurrent,
		"deviceLimit": deviceLimitOf(org, now), "seats": plan.Seats,
		"expiresAt": nil, "expiredPlan": nil, "expiredAt": nil,
	}
	if expired {
		lic["expiredPlan"] = license.PlanOf(org.PlanTier).Label
		lic["expiredAt"] = ms(org.SubscriptionExpiresAt)
	} else {
		lic["expiresAt"] = ms(org.SubscriptionExpiresAt)
	}
	list, _ := s.store.Devices(u.ID)
	devices := make([]gin.H, 0, len(list))
	for _, d := range list {
		devices = append(devices, gin.H{"id": d.ID, "name": d.Name, "lastSeenAt": d.LastSeenAt.UnixMilli()})
	}
	ok(c, gin.H{
		"user":    gin.H{"email": u.Email, "isAdmin": s.cfg.IsAdmin(u.Email), "role": u.Role},
		"license": lic,
		"devices": devices,
		"usage":   gin.H{"profiles": s.store.ProfileCount(org.ID), "running": len(s.store.Running(c, org.ID))},
		"billing": gin.H{
			// 能不能在线订阅：管理员把支付通道配好了才行。
			"available": s.billing().Ready(),
			// canceled = 已取消，到期前仍然有效。
			"status": org.BillingStatus,
			// 在支付通道那边有客户记录，才有"管理订阅"（换卡、取消、账单）。
			"manageable": org.BillingCustomerID != "",
		},
	})
}

func (s *Server) deleteDevice(c *gin.Context) {
	u, id := user(c), c.Param("id")
	if o, err := s.store.Org(u.OrgID); err == nil {
		c.Set("org", o)
	}
	removed, _ := s.store.DeleteDevice(id, u.ID)
	if !removed {
		fail(c, http.StatusNotFound, "NOT_FOUND", "该设备不存在。")
		return
	}
	s.log(c, evDeviceRemove, id, "")
	// 解绑的电脑不会再来心跳。它占着的运行名额现在就还回来，不用等租约过期。
	for profile, dev := range s.store.Running(c, u.OrgID) {
		if dev == id {
			s.store.StopLease(c, u.OrgID, profile, id)
		}
	}
	ok(c, nil)
}

func (s *Server) contact(c *gin.Context) {
	var in struct{ Topic, Email, Message string }
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "请求内容不是合法的 JSON。")
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.Message = strings.TrimSpace(in.Message)
	if !validEmail(in.Email) {
		fail(c, http.StatusBadRequest, "BAD_EMAIL", "请填写有效的邮箱地址。")
		return
	}
	if len([]rune(in.Message)) < 5 {
		fail(c, http.StatusBadRequest, "TOO_SHORT", "内容过短，请补充说明。")
		return
	}
	topic := map[string]string{"sales": "sales", "security": "security", "support": "support"}[in.Topic]
	if topic == "" {
		topic = "support"
	}
	runes := []rune(in.Message)
	if len(runes) > 1000 {
		runes = runes[:1000]
	}
	s.store.DB.Create(&store.Message{Topic: topic, Email: in.Email, Message: string(runes), CreatedAt: time.Now()})
	ok(c, nil)
}

/* ── 内核清单 ───────────────────────────────────────────── */

func toRecord(k store.Kernel) license.KernelRecord {
	e, _ := license.EngineOf(k.Engine)
	return license.KernelRecord{
		ID: e.BuildID, Engine: e.Class, Version: k.Version, Platform: k.Platform, Channel: k.Channel,
		URL: k.URL, Filename: k.Filename, SHA256: k.SHA256, Bytes: k.Bytes,
		Publisher: e.Publisher, ReleasedAt: k.CreatedAt.UTC().Format("2006-01-02T15:04:05.000Z"),
		Upstream: e.Upstream, License: e.License, Notes: k.Notes,
	}
}

// 已上架的内核清单。是公开的（和下载页上的哈希一样），可信靠的是签名，不是靠藏。
func (s *Server) kernelFeed(c *gin.Context) {
	var rows []store.Kernel
	s.store.DB.Order("created_at DESC").Find(&rows)
	records := make([]license.KernelRecord, 0, len(rows))
	for _, k := range rows {
		records = append(records, toRecord(k))
	}
	ok(c, gin.H{"signed": s.signer.SignKernelList(records, time.Now())})
}
