// Package mail 发信。只用标准库的 net/smtp，不引第三方。
// 我们发的信只有一种：邀请同事加入团队。所以这里没有模板引擎，只有一个纯文本正文。
package mail

import (
	"crypto/tls"
	"errors"
	"fmt"
	"mime"
	"net"
	"net/smtp"
	"strings"
	"time"
)

type Config struct {
	Host     string
	Port     int
	Username string
	Password string
	// 信封上的发件人地址，和显示的名字。
	From     string
	FromName string
	// 465 那种一上来就是 TLS 的端口填 true；587 / 25 走 STARTTLS 填 false。
	Implicit bool
}

func (c Config) Ready() bool {
	return c.Host != "" && c.Port > 0 && c.From != ""
}

// 收件人和主题要进信头，里面不能有换行——否则可以往信头里塞任意内容（抄送、伪造发件人）。
var ErrBadHeader = errors.New("收件人或主题里不能有换行")

func headerSafe(v string) bool {
	return !strings.ContainsAny(v, "\r\n")
}

// Send 发一封纯文本信。超时统一 20 秒：发不出去不能把请求卡住。
func (c Config) Send(to, subject, body string) error {
	if !c.Ready() {
		return errors.New("还没配置发信服务器")
	}
	if !headerSafe(to) || !headerSafe(subject) || !headerSafe(c.From) || !headerSafe(c.FromName) {
		return ErrBadHeader
	}
	addr := net.JoinHostPort(c.Host, fmt.Sprint(c.Port))
	conn, err := net.DialTimeout("tcp", addr, 20*time.Second)
	if err != nil {
		return fmt.Errorf("连不上发信服务器：%w", err)
	}
	_ = conn.SetDeadline(time.Now().Add(20 * time.Second))
	if c.Implicit {
		conn = tls.Client(conn, &tls.Config{ServerName: c.Host})
	}
	client, err := smtp.NewClient(conn, c.Host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("发信服务器没应答：%w", err)
	}
	defer client.Close()
	if !c.Implicit {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(&tls.Config{ServerName: c.Host}); err != nil {
				return fmt.Errorf("加密连接建不起来：%w", err)
			}
		}
	}
	if c.Username != "" {
		if err := client.Auth(smtp.PlainAuth("", c.Username, c.Password, c.Host)); err != nil {
			return fmt.Errorf("发信服务器不认这个账号：%w", err)
		}
	}
	if err := client.Mail(c.From); err != nil {
		return fmt.Errorf("发件人被拒：%w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("收件人被拒：%w", err)
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write([]byte(c.message(to, subject, body))); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("信没被收下：%w", err)
	}
	return client.Quit()
}

// message 信头 + 正文。主题和发件人名字可能是中文，按 RFC 2047 编码。
func (c Config) message(to, subject, body string) string {
	from := c.From
	if c.FromName != "" {
		from = mime.QEncoding.Encode("utf-8", c.FromName) + " <" + c.From + ">"
	}
	head := []string{
		"From: " + from,
		"To: " + to,
		"Subject: " + mime.QEncoding.Encode("utf-8", subject),
		"Date: " + time.Now().Format(time.RFC1123Z),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=utf-8",
	}
	return strings.Join(head, "\r\n") + "\r\n\r\n" + strings.ReplaceAll(body, "\n", "\r\n") + "\r\n"
}
