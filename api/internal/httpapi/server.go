// Package httpapi 是对外的 HTTP 接口。三类调用方：
//   - 官网（同源，HttpOnly cookie 会话）：/auth/* /billing/* /devices/* /contact /plans
//   - 桌面工作台（跨域，Bearer 设备令牌）：/v1/*
//   - 管理后台（官网里的 /admin 页面，cookie 会话 + 管理员邮箱）：/admin/*
//
// Caddy 把官网的 /api/* 转过来，所以每条路由同时挂在 / 和 /api 下。
package httpapi

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"
	"time"

	"enclave/api/internal/config"
	"enclave/api/internal/license"
	"enclave/api/internal/secret"
	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
)

type Server struct {
	cfg    *config.Config
	store  *store.Store
	signer *license.Signer
	box    *secret.Box
}

func New(cfg *config.Config, st *store.Store, signer *license.Signer, box *secret.Box) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	s := &Server{cfg, st, signer, box}
	r := gin.New()
	r.Use(gin.Recovery())
	// 前面只有 Caddy（同一个容器网络）。客户端 IP 取它传过来的那个。
	_ = r.SetTrustedProxies([]string{"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.1"})
	r.MaxMultipartMemory = 1 << 20
	// 不开 CORS：/v1/* 是桌面端的本机服务调的，不是浏览器页面；官网页面和这里同源。
	r.Use(bodyLimit)
	for _, prefix := range []string{"", "/api"} {
		s.routes(r.Group(prefix))
	}
	r.NoRoute(func(c *gin.Context) { fail(c, http.StatusNotFound, "NOT_FOUND", "接口不存在。") })
	return r
}

func (s *Server) routes(g *gin.RouterGroup) {
	g.GET("/health", func(c *gin.Context) { ok(c, gin.H{"service": "enclave-api"}) })
	g.GET("/plans", func(c *gin.Context) { ok(c, gin.H{"plans": license.Plans}) })

	g.POST("/auth/register", s.limited("auth"), s.register)
	g.POST("/auth/login", s.limited("auth"), s.login)
	g.POST("/auth/logout", s.logout)
	g.GET("/auth/me", s.me)
	g.DELETE("/devices/:id", s.needUser, s.deleteDevice)
	g.POST("/contact", s.limited("contact"), s.contact)

	g.POST("/billing/checkout", s.needUser, s.checkout)
	g.POST("/billing/portal", s.needUser, s.portal)
	g.POST("/webhooks/creem", s.creemWebhook)

	g.POST("/auth/device/authorize", s.needUser, s.authorizeDevice)
	g.GET("/profiles", s.needUser, s.withOrg, s.listProfiles)
	g.DELETE("/profiles/:id", s.needUser, s.withOrg, s.needEditor, s.deleteProfile)

	// 团队成员。邀请是一条一次性链接，配了发信服务器就由我们发出去。
	g.GET("/invite", s.inviteInfo)
	g.POST("/invite/accept", s.limited("auth"), s.acceptInvite)
	// 操作日志：所有者和管理员看得到，操作员看不到。
	g.GET("/events", s.needUser, s.withOrg, s.needManager, s.listEvents)
	team := g.Group("/members", s.needUser, s.withOrg)
	team.GET("", s.needManager, s.listMembers)
	team.PUT("/name", s.needOwner, s.renameTeam)
	team.POST("/invite", s.needOwner, s.inviteMember)
	team.DELETE("/invite/:token", s.needOwner, s.revokeInvite)
	team.POST("/:id/role", s.needOwner, s.setMemberRole)
	team.DELETE("/:id", s.needOwner, s.removeMember)
	team.PUT("/:id/folders", s.needManager, s.assignFolders)

	// 文件夹：授权的单位。官网这边只要列表——成员管理页拿它渲染勾选框。
	g.GET("/folders", s.needUser, s.withOrg, s.needManager, s.listFolders)

	g.POST("/v1/device/exchange", s.limited("exchange"), s.exchangeDevice)
	v1 := g.Group("/v1", s.needDevice)
	v1.POST("/device/logout", s.deviceLogout)
	v1.GET("/entitlement", s.entitlement)
	v1.GET("/profiles", s.listProfiles)
	v1.PUT("/profiles/:id", s.needEditor, s.putProfile)
	v1.DELETE("/profiles/:id", s.needEditor, s.deleteProfile)
	// 文件夹的增删改在工作台做（设备令牌）。操作员改不了，和他建不了环境一条规矩。
	v1.GET("/folders", s.listFolders)
	v1.PUT("/folders/:id", s.needEditor, s.putFolder)
	v1.DELETE("/folders/:id", s.needEditor, s.deleteFolder)
	v1.POST("/profiles/:id/start", s.startProfile)
	v1.POST("/profiles/:id/heartbeat", s.heartbeatProfile)
	v1.POST("/profiles/:id/stop", s.stopProfile)

	// 同步密钥的交接。服务器只保管和转交包装后的密钥，拆不开任何一份。
	v1.GET("/sync", s.syncStatus)
	v1.POST("/sync/register", s.syncRegister)
	v1.POST("/sync/enable", s.needOwner, s.syncEnable)
	v1.GET("/sync/pending", s.needManager, s.syncPending)
	v1.POST("/sync/approve", s.needManager, s.syncApprove)
	v1.POST("/sync/disable", s.needOwner, s.syncDisable)
	v1.GET("/sync/slots", s.slotList)
	v1.PUT("/sync/slots", s.needEditor, s.slotPut)
	v1.DELETE("/sync/slots/:slot", s.needEditor, s.slotDelete)
	v1.POST("/sync/grants", s.needEditor, s.grantPut)
	v1.POST("/sync/settled", s.needEditor, s.slotSettled)
	v1.GET("/sync/docs", s.docsPull)
	v1.POST("/sync/docs", s.needEditor, s.docsPush)
	v1.POST("/sync/blob/upload", s.blobUpload)
	v1.POST("/sync/blob/commit", s.blobCommit)
	v1.GET("/sync/blobs", s.blobList)
	v1.DELETE("/sync/blobs/:id", s.needEditor, s.blobDelete)
	g.GET("/v1/pubkey", func(c *gin.Context) { ok(c, gin.H{"alg": "ed25519", "publicKey": s.signer.PublicKey()}) })
	g.GET("/v1/kernels", s.kernelFeed)

	admin := g.Group("/admin", s.needUser, s.needAdmin)
	admin.GET("/billing", s.getBilling)
	admin.PUT("/billing", s.putBilling)
	admin.GET("/users", s.listUsers)
	admin.POST("/plan", s.setPlan)
	admin.GET("/storage", s.adminStorage)
	admin.PUT("/storage", s.putStorage)
	admin.GET("/mail", s.adminMail)
	admin.PUT("/mail", s.putMail)
	admin.POST("/mail/test", s.testMail)
	admin.GET("/kernels", s.listKernels)
	admin.POST("/kernels", s.putKernel)
	admin.DELETE("/kernels/:version/:platform", s.deleteKernel)
	admin.GET("/messages", s.listMessages)
}

/* ── 应答 ───────────────────────────────────────────────── */

func ok(c *gin.Context, body gin.H) {
	if body == nil {
		body = gin.H{}
	}
	body["ok"] = true
	c.JSON(http.StatusOK, body)
}

func fail(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"ok": false, "code": code, "message": message})
}

/* ── 中间件 ─────────────────────────────────────────────── */

// 这个服务收的都是很小的 JSON。
func bodyLimit(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 64<<10)
	c.Next()
}

// limited 同一个 IP 一分钟 10 次。登录注册、换设备令牌、联系表单各算各的。
func (s *Server) limited(bucket string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !s.store.Allow(c, bucket+":"+c.ClientIP(), 10) {
			fail(c, http.StatusTooManyRequests, "RATE_LIMITED", "尝试太频繁，请一分钟后再试。")
			return
		}
		c.Next()
	}
}

const sessionCookie = "enclave_session"

func (s *Server) currentUser(c *gin.Context) *store.User {
	sid, err := c.Cookie(sessionCookie)
	if err != nil || sid == "" {
		return nil
	}
	id := s.store.SessionUser(c, sid)
	if id == "" {
		return nil
	}
	u, err := s.store.UserByID(id)
	if err != nil {
		return nil
	}
	return u
}

func (s *Server) needUser(c *gin.Context) {
	u := s.currentUser(c)
	if u == nil {
		fail(c, http.StatusUnauthorized, "UNAUTHENTICATED", "请先登录。")
		return
	}
	c.Set("user", u)
	c.Next()
}

func (s *Server) needAdmin(c *gin.Context) {
	if !s.cfg.IsAdmin(user(c).Email) {
		fail(c, http.StatusForbidden, "FORBIDDEN", "该账号不是管理员。")
		return
	}
	c.Next()
}

func user(c *gin.Context) *store.User { return c.MustGet("user").(*store.User) }

func (s *Server) startSession(c *gin.Context, userID string) error {
	sid := randomToken()
	if err := s.store.NewSession(c, sid, userID); err != nil {
		return err
	}
	s.setCookie(c, sid, 30*24*3600)
	return nil
}

func (s *Server) setCookie(c *gin.Context, value string, maxAge int) {
	// TLS 在 Cloudflare 那层终止，走到这里是明文；是不是 https 看 Caddy 传过来的这个头。
	secure := strings.Contains(c.GetHeader("X-Forwarded-Proto"), "https")
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(sessionCookie, value, maxAge, "/", "", secure, true)
}

func randomToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func bearer(c *gin.Context) string {
	h := c.GetHeader("Authorization")
	if len(h) > 7 && strings.EqualFold(h[:7], "bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return ""
}

func ms(t *time.Time) *int64 {
	if t == nil {
		return nil
	}
	v := t.UnixMilli()
	return &v
}
