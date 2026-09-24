package httpapi

import (
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"enclave/api/internal/billing"
	"enclave/api/internal/license"
	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
)

// 支付通道的配置存在数据库的 settings 表里，由管理员在管理后台填。密钥那两项是密文。
const (
	keyTestMode      = "billing.creem.test_mode"
	keyAPIKey        = "billing.creem.api_key"
	keyWebhookSecret = "billing.creem.webhook_secret"
	keyProduct       = "billing.creem.product." // + 档位
	keyBaseURL       = "billing.creem.base_url" // 只给自动化测试用
)

var paidPlans = []string{"solo", "pro", "team"}

func (s *Server) plainSetting(key string) string {
	v, found := s.store.Setting(key)
	if !found {
		return ""
	}
	if !v.Secret {
		return v.Value
	}
	plain, err := s.box.Open(v.Value)
	if err != nil {
		log.Printf("设置 %s 解不开：%v", key, err)
		return ""
	}
	return plain
}

func (s *Server) billing() billing.Settings {
	b := billing.Settings{
		TestMode:      s.plainSetting(keyTestMode) != "false",
		APIKey:        s.plainSetting(keyAPIKey),
		WebhookSecret: s.plainSetting(keyWebhookSecret),
		BaseURL:       s.plainSetting(keyBaseURL),
		Products:      map[string]string{},
	}
	for _, plan := range paidPlans {
		if id := s.plainSetting(keyProduct + plan); id != "" {
			b.Products[plan] = id
		}
	}
	return b
}

func (s *Server) checkout(c *gin.Context) {
	var in struct{ Plan string }
	_ = c.ShouldBindJSON(&in)
	b := s.billing()
	if !b.Ready() {
		fail(c, http.StatusServiceUnavailable, "BILLING_UNAVAILABLE", "在线订阅尚未开通，请通过页面下方的联系表单与我们联系。")
		return
	}
	if b.Products[in.Plan] == "" {
		fail(c, http.StatusBadRequest, "BAD_PLAN", "该套餐暂不支持在线订阅。")
		return
	}
	u := user(c)
	url, err := b.Checkout(c, in.Plan, u.ID, u.Email, s.cfg.PublicURL+"/account?paid=1")
	if err != nil {
		log.Printf("checkout: %v", err)
		fail(c, http.StatusBadGateway, "BILLING_FAILED", "未能打开收银台，请稍后再试。")
		return
	}
	ok(c, gin.H{"url": url})
}

func (s *Server) portal(c *gin.Context) {
	org, err := s.store.Org(user(c).OrgID)
	if err != nil || org.BillingCustomerID == "" {
		fail(c, http.StatusNotFound, "NO_SUBSCRIPTION", "该账号没有在线订阅。")
		return
	}
	url, err := s.billing().Portal(c, org.BillingCustomerID)
	if err != nil || url == "" {
		log.Printf("portal: %v", err)
		fail(c, http.StatusBadGateway, "BILLING_FAILED", "未能打开订阅管理页，请稍后再试。")
		return
	}
	ok(c, gin.H{"url": url})
}

// 续费通知晚到一会儿不该让用户掉档：到期时间在周期结束之后再留一天。
const renewalSlack = 24 * time.Hour

// 付款成功但还没收到带周期的那个事件时，先给这么久，后面的事件会把它改成真正的周期。
const provisional = 72 * time.Hour

func (s *Server) creemWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "无法读取请求体。")
		return
	}
	b := s.billing()
	if !b.Verify(body, c.GetHeader("creem-signature")) {
		fail(c, http.StatusUnauthorized, "BAD_SIGNATURE", "签名无效。")
		return
	}
	change, err := billing.Parse(body)
	if err != nil {
		fail(c, http.StatusBadRequest, "BAD_EVENT", "无法识别该事件。")
		return
	}
	// 支付通道会重发。同一个事件只生效一次；重复的照样回 200，否则它会一直重发。
	if !s.store.FirstTime(change.EventID, change.EventType) {
		ok(c, gin.H{"duplicate": true})
		return
	}
	if change.Status != "" {
		s.apply(b, change)
	}
	ok(c, nil)
}

// apply 订阅状态机。三个状态：
//
//	active    有效。档位 = 产品对应的档位，到期 = 周期结束 + 宽限
//	canceled  用户取消了。档位不变，到周期结束为止
//	expired   结束了。回免费档，超出免费档上限的设备解绑
func (s *Server) apply(b billing.Settings, ch billing.Change) {
	org := s.orgOf(ch)
	if org == nil {
		log.Printf("webhook %s：找不到对应的账号（user=%q customer=%q subscription=%q）", ch.EventType, ch.UserID, ch.CustomerID, ch.SubscriptionID)
		return
	}
	updates := map[string]any{"billing_status": ch.Status}
	if ch.CustomerID != "" {
		updates["billing_customer_id"] = ch.CustomerID
	}
	if ch.SubscriptionID != "" {
		updates["billing_subscription_id"] = ch.SubscriptionID
	}
	switch ch.Status {
	case "active":
		plan := b.PlanOfProduct(ch.ProductID)
		if plan == "" {
			log.Printf("webhook %s：产品 %q 没有对应的档位，到管理后台检查产品 ID", ch.EventType, ch.ProductID)
			return
		}
		updates["plan_tier"] = plan
		updates["device_limit"] = nil
		if ch.PeriodEnd != nil {
			updates["subscription_expires_at"] = ch.PeriodEnd.Add(renewalSlack)
		} else if org.SubscriptionExpiresAt == nil || org.PlanTier != plan {
			updates["subscription_expires_at"] = time.Now().Add(provisional)
		}
	case "canceled":
		if ch.PeriodEnd != nil {
			updates["subscription_expires_at"] = *ch.PeriodEnd
		}
	case "expired":
		updates["plan_tier"] = "free"
		updates["subscription_expires_at"] = nil
		updates["device_limit"] = nil
	}
	if err := s.store.DB.Model(&store.Organization{}).Where("id = ?", org.ID).Updates(updates).Error; err != nil {
		log.Printf("webhook %s：写不进数据库：%v", ch.EventType, err)
		return
	}
	if ch.Status == "expired" {
		var users []store.User
		s.store.DB.Where("org_id = ?", org.ID).Find(&users)
		for _, u := range users {
			s.store.TrimDevices(u.ID, license.Plans[0].DeviceLimit)
		}
	}
}

// orgOf 这个事件说的是谁。先认我们自己放进 metadata 的用户 ID，再认支付通道那边的订阅和客户编号。
func (s *Server) orgOf(ch billing.Change) *store.Organization {
	if ch.UserID != "" {
		if u, err := s.store.UserByID(ch.UserID); err == nil {
			if org, err := s.store.Org(u.OrgID); err == nil {
				return org
			}
		}
	}
	var org store.Organization
	for column, value := range map[string]string{"billing_subscription_id": ch.SubscriptionID, "billing_customer_id": ch.CustomerID} {
		if value != "" && s.store.DB.First(&org, column+" = ?", value).Error == nil {
			return &org
		}
	}
	return nil
}

/* ── 管理后台：支付通道 ─────────────────────────────────── */

func hint(secret string) string {
	if secret == "" {
		return ""
	}
	if len(secret) <= 4 {
		return "••••"
	}
	return "••••" + secret[len(secret)-4:]
}

// 密钥只告诉管理员"填过没有、末四位是什么"，原文不出这个服务。
func (s *Server) getBilling(c *gin.Context) {
	b := s.billing()
	products := gin.H{}
	for _, plan := range paidPlans {
		products[plan] = b.Products[plan]
	}
	ok(c, gin.H{
		"testMode":      b.TestMode,
		"apiKey":        hint(b.APIKey),
		"webhookSecret": hint(b.WebhookSecret),
		"products":      products,
		"webhookURL":    s.cfg.PublicURL + "/api/webhooks/creem",
		"ready":         b.Ready(),
	})
}

func (s *Server) putBilling(c *gin.Context) {
	var in struct {
		TestMode      *bool             `json:"testMode"`
		APIKey        string            `json:"apiKey"`
		WebhookSecret string            `json:"webhookSecret"`
		Products      map[string]string `json:"products"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "请求内容不是合法的 JSON。")
		return
	}
	put := func(key, value string, isSecret bool) error {
		if isSecret {
			sealed, err := s.box.Seal(value)
			if err != nil {
				return err
			}
			value = sealed
		}
		return s.store.PutSetting(store.Setting{Key: key, Value: value, Secret: isSecret})
	}
	var err error
	if in.TestMode != nil {
		err = put(keyTestMode, map[bool]string{true: "true", false: "false"}[*in.TestMode], false)
	}
	// 密钥留空 = 不改。要清掉就填一个新的。
	if key := strings.TrimSpace(in.APIKey); err == nil && key != "" {
		err = put(keyAPIKey, key, true)
	}
	if sec := strings.TrimSpace(in.WebhookSecret); err == nil && sec != "" {
		err = put(keyWebhookSecret, sec, true)
	}
	for _, plan := range paidPlans {
		if id, given := in.Products[plan]; err == nil && given {
			err = put(keyProduct+plan, strings.TrimSpace(id), false)
		}
	}
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "保存失败："+err.Error())
		return
	}
	s.getBilling(c)
}
