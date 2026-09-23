package httpapi

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"enclave/api/internal/mail"
	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
)

/* 发信服务器。和支付通道、对象存储一样由管理员在后台填，密码封存入库，回显只给末几位。
   没配也能用：邀请链接照常生成，只是要所有者自己发给对方。 */

const (
	keySMTPHost     = "mail.smtp.host"
	keySMTPPort     = "mail.smtp.port"
	keySMTPUser     = "mail.smtp.username"
	keySMTPPass     = "mail.smtp.password"
	keySMTPFrom     = "mail.smtp.from"
	keySMTPFromName = "mail.smtp.from_name"
	keySMTPImplicit = "mail.smtp.implicit_tls"
)

func (s *Server) mailer() mail.Config {
	port, _ := strconv.Atoi(s.plainSetting(keySMTPPort))
	return mail.Config{
		Host: s.plainSetting(keySMTPHost), Port: port,
		Username: s.plainSetting(keySMTPUser), Password: s.plainSetting(keySMTPPass),
		From: s.plainSetting(keySMTPFrom), FromName: s.plainSetting(keySMTPFromName),
		Implicit: s.plainSetting(keySMTPImplicit) == "1",
	}
}

func (s *Server) adminMail(c *gin.Context) {
	cfg := s.mailer()
	ok(c, gin.H{
		"host": cfg.Host, "port": cfg.Port, "username": cfg.Username, "password": hint(cfg.Password),
		"from": cfg.From, "fromName": cfg.FromName, "implicitTLS": cfg.Implicit, "ready": cfg.Ready(),
	})
}

func (s *Server) putMail(c *gin.Context) {
	var in struct {
		Host, Username, Password, From, FromName string
		Port                                     int
		ImplicitTLS                              bool
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "请求内容不是合法的 JSON。")
		return
	}
	if in.Port < 0 || in.Port > 65535 {
		fail(c, http.StatusBadRequest, "BAD_MAIL", "端口无效。常用端口为 587（STARTTLS）或 465（TLS）。")
		return
	}
	from := strings.TrimSpace(in.From)
	if from != "" && !validEmail(from) {
		fail(c, http.StatusBadRequest, "BAD_MAIL", "发件人须为有效的邮箱地址。")
		return
	}
	put := func(key, value string, secret bool) error {
		if secret {
			sealed, err := s.box.Seal(value)
			if err != nil {
				return err
			}
			value = sealed
		}
		return s.store.PutSetting(store.Setting{Key: key, Value: value, Secret: secret})
	}
	// 这几项按填的原样存，留空就是清掉——「不需要登录就把账号留空」得真的做得到。
	// 只有密码是"留空 = 不改"：它回显不出来，不能要求每次重填。
	var err error
	for _, f := range [][2]string{
		{keySMTPHost, strings.TrimSpace(in.Host)},
		{keySMTPFrom, from},
		{keySMTPFromName, strings.TrimSpace(in.FromName)},
		{keySMTPUser, strings.TrimSpace(in.Username)},
	} {
		if err == nil {
			err = put(f[0], f[1], false)
		}
	}
	// 账号清掉了，密码留着没有意义，一起清。
	if err == nil && strings.TrimSpace(in.Username) == "" {
		err = put(keySMTPPass, "", true)
	}
	if err == nil && in.Port > 0 {
		err = put(keySMTPPort, strconv.Itoa(in.Port), false)
	}
	if err == nil {
		err = put(keySMTPImplicit, map[bool]string{true: "1", false: "0"}[in.ImplicitTLS], false)
	}
	// 密码留空 = 不改。要换就填新的。
	if v := strings.TrimSpace(in.Password); err == nil && v != "" {
		err = put(keySMTPPass, v, true)
	}
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "保存失败："+err.Error())
		return
	}
	s.adminMail(c)
}

// 发一封测试信给管理员自己。配好之后点一下，比等真用户报错强。
func (s *Server) testMail(c *gin.Context) {
	cfg := s.mailer()
	if !cfg.Ready() {
		fail(c, http.StatusConflict, "MAIL_NOT_READY", "尚未配置发信服务器。")
		return
	}
	to := user(c).Email
	err := cfg.Send(to, "Enclave 测试邮件", "这是一封测试邮件。收到它说明发信服务器配好了。")
	if err != nil {
		fail(c, http.StatusBadGateway, "MAIL_FAILED", "发送失败："+err.Error())
		return
	}
	ok(c, gin.H{"to": to})
}

// 邀请信。正文只有一条链接和一句话——收信的人要做的就是点开它。
func (s *Server) sendInvite(to, team, role, url string) bool {
	cfg := s.mailer()
	if !cfg.Ready() {
		return false
	}
	what := "成员"
	if role == store.RoleAdmin {
		what = "管理员"
	} else if role == store.RoleOperator {
		what = "操作员"
	}
	body := team + " 邀请以" + what + "的身份加入 Enclave 团队。\n\n" +
		"打开下方链接并设置密码即可加入。链接 7 天内有效，仅能使用一次：\n\n" +
		url + "\n\n" +
		"若不认识邀请人，忽略本邮件即可。\n"
	if err := cfg.Send(to, "加入 "+team+" 的邀请", body); err != nil {
		log.Printf("邀请信发送失败（%s）：%v", to, err)
		return false
	}
	return true
}
