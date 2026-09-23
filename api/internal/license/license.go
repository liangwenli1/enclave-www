// Package license 定义档位，并给内核清单签名。
//
// 订阅状态不签成凭据发给客户端：工作台每次都来问服务器（见 httpapi/desktop.go）。
// 要签名的只有内核清单——它决定用户电脑下载并执行哪个文件，本机服务用内置的公钥验它：
//
//	k1.<base64url(payload)>.<base64url(sig)>    签的是 "enclave-kernels-v1." + payload
package license

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"os"
	"path/filepath"
	"time"
)

type Plan struct {
	Plan  string `json:"plan"`
	Label string `json:"label"`
	// 环境数、同时运行数按团队算；可登录的电脑数按人算。
	EnvLimit    int `json:"envLimit"`
	Concurrent  int `json:"concurrent"`
	DeviceLimit int `json:"deviceLimit"`
	// Seats 这个团队最多几个人（含所有者）。除 Team 外都是一个人。
	Seats int    `json:"seats"`
	API   string `json:"api"`
}

// 档位只在这里定义。官网的套餐页和客户端都从这里取，不自己抄数字。
var Plans = []Plan{
	{"free", "Solo Free", 3, 1, 1, 1, "off"},
	{"solo", "Solo", 50, 3, 1, 1, "discover"},
	{"pro", "Pro", 200, 8, 2, 1, "full"},
	{"team", "Team", 200, 8, 1, 6, "full"},
}

func PlanOf(id string) Plan {
	for _, p := range Plans {
		if p.Plan == id {
			return p
		}
	}
	return Plans[0]
}

// Effective 订阅过期的账号实际就是免费档。签许可证和官网账号页都用这一个判断。
func Effective(planID string, expiresAt *time.Time, now time.Time) (plan Plan, expired bool) {
	if expiresAt != nil && expiresAt.Before(now) {
		return Plans[0], true
	}
	return PlanOf(planID), false
}

type Signer struct{ key ed25519.PrivateKey }

// LoadOrCreate 读数据目录里的私钥；第一次启动时生成。PKCS#8 PEM，和之前的服务用同一个文件，
// 所以换实现不换钥匙，已发出的客户端不受影响。
func LoadOrCreate(dataDir string) (*Signer, error) {
	file := filepath.Join(dataDir, "license-key.pem")
	if raw, err := os.ReadFile(file); err == nil {
		block, _ := pem.Decode(raw)
		if block == nil {
			return nil, errors.New("license-key.pem 不是 PEM")
		}
		parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return nil, err
		}
		key, ok := parsed.(ed25519.PrivateKey)
		if !ok {
			return nil, errors.New("license-key.pem 不是 Ed25519 私钥")
		}
		return &Signer{key}, nil
	}
	_, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(dataDir, 0o700); err != nil {
		return nil, err
	}
	if err := os.WriteFile(file, pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der}), 0o600); err != nil {
		return nil, err
	}
	return &Signer{key}, nil
}

var b64 = base64.RawURLEncoding

// PublicKey 客户端要内置的公钥：32 字节，base64url。
func (s *Signer) PublicKey() string {
	return b64.EncodeToString(s.key.Public().(ed25519.PublicKey))
}

const kernelDomain = "enclave-kernels-v1."

// KernelRecord 字段名和客户端安装包里的 kernels.manifest.json 一致。
// Engine 内核的类。两类各有自己的上游项目和一串版本；客户端按类决定怎么启动。
type Engine struct {
	// 签进清单里的名字："chromium" / "firefox"。
	Class string
	// 这一类用的构建。
	BuildID, Publisher, Upstream, License string
	// 只登记这个目录下的下载地址。客户端那边是同一条规则。
	URLPrefix string
}

var Engines = []Engine{
	{"chromium", "fingerprint-chromium", "adryfish", "Ungoogled Chromium", "BSD-3-Clause",
		"https://github.com/adryfish/fingerprint-chromium/releases/download/"},
	{"firefox", "camoufox", "daijro", "Mozilla Firefox", "MPL-2.0",
		"https://github.com/daijro/camoufox/releases/download/"},
}

func EngineOf(class string) (Engine, bool) {
	for _, e := range Engines {
		if e.Class == class {
			return e, true
		}
	}
	return Engine{}, false
}

type KernelRecord struct {
	ID         string `json:"id"`
	Engine     string `json:"engine"`
	Version    string `json:"version"`
	Platform   string `json:"platform"`
	Channel    string `json:"channel"`
	URL        string `json:"url"`
	Filename   string `json:"filename"`
	SHA256     string `json:"sha256"`
	Bytes      int64  `json:"bytes"`
	Publisher  string `json:"publisher"`
	ReleasedAt string `json:"releasedAt"`
	Upstream   string `json:"upstream"`
	License    string `json:"license"`
	Notes      string `json:"notes"`
}

func (s *Signer) SignKernelList(kernels []KernelRecord, now time.Time) string {
	if kernels == nil {
		kernels = []KernelRecord{}
	}
	raw, _ := json.Marshal(map[string]any{"v": 1, "issuedAt": now.UnixMilli(), "kernels": kernels})
	body := b64.EncodeToString(raw)
	return "k1." + body + "." + b64.EncodeToString(ed25519.Sign(s.key, []byte(kernelDomain+body)))
}
