package license

import (
	"crypto/ed25519"
	"strings"
	"testing"
	"time"
)

func newSigner(t *testing.T) *Signer {
	t.Helper()
	s, err := LoadOrCreate(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func parts(t *testing.T, token string) (string, []byte, []byte) {
	t.Helper()
	p := strings.Split(token, ".")
	if len(p) != 3 {
		t.Fatalf("格式不对：%s", token)
	}
	sig, err := b64.DecodeString(p[2])
	if err != nil {
		t.Fatal(err)
	}
	return p[0], []byte(p[1]), sig
}

func TestKeySurvivesRestart(t *testing.T) {
	dir := t.TempDir()
	a, _ := LoadOrCreate(dir)
	b, _ := LoadOrCreate(dir)
	if a.PublicKey() != b.PublicKey() {
		t.Fatal("重启后必须还是同一把钥匙，否则已发出的客户端全部验不过")
	}
}

func TestKernelListIsSignedWithItsDomainPrefix(t *testing.T) {
	s := newSigner(t)
	pub := s.key.Public().(ed25519.PublicKey)
	tag, body, sig := parts(t, s.SignKernelList(nil, time.Now()))
	if tag != "k1" || !ed25519.Verify(pub, append([]byte(kernelDomain), body...), sig) {
		t.Fatal("内核清单签的是 域前缀 + body")
	}
	if ed25519.Verify(pub, body, sig) {
		t.Fatal("本机服务验的是 域前缀 + body；不带前缀也能验过说明签错了东西")
	}
	raw, _ := b64.DecodeString(string(body))
	if !strings.Contains(string(raw), `"kernels":[]`) {
		t.Fatalf("空清单要签成空数组，不是 null：%s", raw)
	}
}
