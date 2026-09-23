package mail

import (
	"strings"
	"testing"
)

func cfg() Config {
	return Config{
		Host: "smtp.example.com", Port: 587,
		From: "no-reply@example.com", FromName: "Enclave 团队",
	}
}

// 收件人和主题是外面来的（邀请谁由用户填）。带上换行就能往信头里塞任意内容——
// 抄送给别人、伪造发件人、甚至塞进第二封信的正文。一律不发。
func TestHeaderInjectionIsRefused(t *testing.T) {
	for _, bad := range []string{
		"a@b.com\r\nBcc: victim@example.com",
		"a@b.com\nBcc: victim@example.com",
		"a@b.com\r\n\r\n伪造的正文",
	} {
		if err := (cfg()).Send(bad, "主题", "正文"); err == nil {
			t.Fatalf("收件人 %q 居然发出去了", bad)
		} else if err != ErrBadHeader {
			t.Fatalf("收件人 %q 应该在拼信之前就被拒，得到：%v", bad, err)
		}
		if err := (cfg()).Send("a@b.com", bad, "正文"); err != ErrBadHeader {
			t.Fatalf("主题 %q 应该在拼信之前就被拒，得到：%v", bad, err)
		}
	}
	// 正文里有换行是正常的，不该被拦。
	if err := (cfg()).Send("a@b.com", "主题", "第一行\n第二行"); err == ErrBadHeader {
		t.Fatal("正文里的换行不该被当成信头注入")
	}
}

func TestMessageHeadersAreWellFormed(t *testing.T) {
	msg := cfg().message("tongshi@example.com", "邀请你加入 某某团队", "第一行\n第二行")

	head, body, found := strings.Cut(msg, "\r\n\r\n")
	if !found {
		t.Fatal("信头和正文之间要有一个空行")
	}
	// 非 ASCII 的主题和发件人名字要编码，不能裸奔。
	if strings.Contains(head, "邀请你加入") || strings.Contains(head, "团队") {
		t.Fatalf("信头里有没编码的中文：%q", head)
	}
	for _, want := range []string{
		"From: =?utf-8?q?", "<no-reply@example.com>",
		"To: tongshi@example.com",
		"Subject: =?utf-8?q?",
		"Content-Type: text/plain; charset=utf-8",
	} {
		if !strings.Contains(head, want) {
			t.Fatalf("信头里少了 %q：\n%s", want, head)
		}
	}
	// 正文按 SMTP 的规矩用 CRLF。
	if strings.Contains(body, "\n第二行") && !strings.Contains(body, "\r\n第二行") {
		t.Fatalf("正文的换行没转成 CRLF：%q", body)
	}
}

func TestNotReadyUntilItCanActuallySend(t *testing.T) {
	full := cfg()
	if !full.Ready() {
		t.Fatal("配齐了却说没配好")
	}
	for name, c := range map[string]Config{
		"没有服务器": {Port: 587, From: "a@b.com"},
		"没有端口":  {Host: "smtp.example.com", From: "a@b.com"},
		"没有发件人": {Host: "smtp.example.com", Port: 587},
		"什么都没有": {},
	} {
		if c.Ready() {
			t.Fatalf("%s 也算配好了", name)
		}
		if err := c.Send("a@b.com", "主题", "正文"); err == nil {
			t.Fatalf("%s 也能发信", name)
		}
	}
}
