package blob

import (
	"net/url"
	"strings"
	"testing"
	"time"
)

func cfg() Config {
	return Config{
		Endpoint: "https://acct.r2.cloudflarestorage.com", Region: "auto", Bucket: "enclave-sync",
		AccessKey: "AKIAIOSFODNN7EXAMPLE", SecretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
	}
}

func TestPresignedURLCarriesEverythingAndNothingElse(t *testing.T) {
	now := time.Date(2026, 9, 22, 1, 2, 3, 0, time.UTC)
	got, err := cfg().Presign("PUT", ObjectKey("usr_1", "env_a"), 10*time.Minute, now)
	if err != nil {
		t.Fatal(err)
	}
	u, err := url.Parse(got)
	if err != nil {
		t.Fatal(err)
	}
	if u.Path != "/enclave-sync/u/usr_1/cookies/env_a" {
		t.Fatalf("路径不对：%s", u.Path)
	}
	q := u.Query()
	for _, k := range []string{"X-Amz-Algorithm", "X-Amz-Credential", "X-Amz-Date", "X-Amz-Expires", "X-Amz-SignedHeaders", "X-Amz-Signature"} {
		if q.Get(k) == "" {
			t.Fatalf("少了 %s", k)
		}
	}
	if strings.Contains(got, cfg().SecretKey) {
		t.Fatal("地址里带上了密钥")
	}
	if q.Get("X-Amz-Expires") != "600" {
		t.Fatalf("有效期不对：%s", q.Get("X-Amz-Expires"))
	}
	again, _ := cfg().Presign("PUT", ObjectKey("usr_1", "env_a"), 10*time.Minute, now)
	if again != got {
		t.Fatal("同样的输入签出了两个地址")
	}
	for _, other := range []struct {
		method, key string
		at          time.Time
	}{
		{"GET", ObjectKey("usr_1", "env_a"), now},
		{"PUT", ObjectKey("usr_2", "env_a"), now},
		{"PUT", ObjectKey("usr_1", "env_a"), now.Add(time.Hour)},
	} {
		if s, _ := cfg().Presign(other.method, other.key, 10*time.Minute, other.at); s == got {
			t.Fatalf("换了 %v 签名却没变", other)
		}
	}
}

func TestBadConfigIsRefused(t *testing.T) {
	if _, err := (Config{}).Presign("PUT", "k", time.Minute, time.Now()); err == nil {
		t.Fatal("没配置也签出来了")
	}
	bad := cfg()
	bad.Endpoint = "not a url"
	if _, err := bad.Presign("PUT", "k", 10*time.Minute, time.Now()); err == nil {
		t.Fatal("地址不合法也签出来了")
	}
	for _, d := range []time.Duration{time.Second, 30 * 24 * time.Hour} {
		if _, err := cfg().Presign("PUT", "k", d, time.Now()); err == nil {
			t.Fatalf("有效期 %v 也签出来了", d)
		}
	}
}

func TestObjectKeysStayInsideTheirAccount(t *testing.T) {
	if k := ObjectKey("usr_1", "env_a"); k != "u/usr_1/cookies/env_a" {
		t.Fatalf("对象名不对：%s", k)
	}
	// 编号里带路径成分：整段转义之后还是这个账号底下的一个对象，跳不出去。
	got, err := cfg().Presign("PUT", ObjectKey("usr_1", "../../usr_2/cookies/env_b"), 10*time.Minute, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(got)
	if err != nil {
		t.Fatal(err)
	}
	// 看的是没解码过的那一份：编号整段被转义成了一个对象名，后面不再有斜杠。
	const prefix = "/enclave-sync/u/usr_1/cookies/"
	raw := parsed.EscapedPath()
	if !strings.HasPrefix(raw, prefix) || strings.Contains(strings.TrimPrefix(raw, prefix), "/") {
		t.Fatalf("逃出去了：%s", raw)
	}
	// 直接给一个带 .. 的对象名，签名这一层也要拒。
	if _, err := cfg().Presign("PUT", "u/usr_1/../usr_2/x", 10*time.Minute, time.Now()); err == nil {
		t.Fatal("带 .. 的对象名也签出来了")
	}
}
