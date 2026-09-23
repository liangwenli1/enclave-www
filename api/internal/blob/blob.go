// Package blob 给对象存储签一个临时地址，让客户端直接传上去、取下来。
//
// 密文不经过我们的服务器：客户端拿着这个地址直接和对象存储说话。
// 我们只签地址、记大小和版本——里面是什么，我们和对象存储都不知道。
//
// 签名是 AWS SigV4（Cloudflare R2、MinIO、S3 都认这一套）。这里手写，不引入整套 SDK：
// 用到的只有"预签名一个 PUT/GET/DELETE"这一件事，规则公开固定，自己写反而看得清、测得准。
package blob

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Config struct {
	// 例如 https://<账号>.r2.cloudflarestorage.com，或者本机的 http://127.0.0.1:9180
	Endpoint  string
	Region    string
	Bucket    string
	AccessKey string
	SecretKey string
}

func (c Config) Ready() bool {
	return c.Endpoint != "" && c.Bucket != "" && c.AccessKey != "" && c.SecretKey != ""
}

var ErrNotConfigured = errors.New("object storage not configured")

func hmacSHA256(key []byte, data string) []byte {
	h := hmac.New(sha256.New, key)
	h.Write([]byte(data))
	return h.Sum(nil)
}

// 路径里每一段单独转义：斜杠留着，别的按 RFC 3986 转。
func escapePath(p string) string {
	parts := strings.Split(p, "/")
	for i, s := range parts {
		parts[i] = strings.ReplaceAll(url.QueryEscape(s), "+", "%20")
	}
	return strings.Join(parts, "/")
}

// Presign 签一个有时限的地址。method 是 PUT / GET / DELETE。
func (c Config) Presign(method, key string, expires time.Duration, now time.Time) (string, error) {
	if !c.Ready() {
		return "", ErrNotConfigured
	}
	u, err := url.Parse(strings.TrimRight(c.Endpoint, "/"))
	if err != nil || u.Host == "" || (u.Scheme != "https" && u.Scheme != "http") {
		return "", errors.New("对象存储的地址不合法")
	}
	region := c.Region
	if region == "" {
		region = "auto"
	}
	// 对象名不许带路径成分：否则一个编号就能指到别的账号的目录下。
	for _, seg := range strings.Split(key, "/") {
		if seg == "" || seg == "." || seg == ".." {
			return "", errors.New("对象名不合法")
		}
	}
	seconds := int(expires.Seconds())
	if seconds < 60 || seconds > 7*24*3600 {
		return "", errors.New("有效期超出范围")
	}
	stamp := now.UTC().Format("20060102T150405Z")
	day := stamp[:8]
	scope := fmt.Sprintf("%s/%s/s3/aws4_request", day, region)
	canonicalURI := "/" + escapePath(strings.TrimPrefix(c.Bucket+"/"+key, "/"))
	if u.Path != "" && u.Path != "/" {
		canonicalURI = strings.TrimRight(u.Path, "/") + canonicalURI
	}

	q := url.Values{}
	q.Set("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
	q.Set("X-Amz-Credential", c.AccessKey+"/"+scope)
	q.Set("X-Amz-Date", stamp)
	q.Set("X-Amz-Expires", fmt.Sprint(seconds))
	q.Set("X-Amz-SignedHeaders", "host")
	// Encode 按键排序，正好是规范要求的顺序。
	canonicalRequest := strings.Join([]string{
		method, canonicalURI, q.Encode(),
		"host:" + u.Host + "\n", "host", "UNSIGNED-PAYLOAD",
	}, "\n")
	sum := sha256.Sum256([]byte(canonicalRequest))
	toSign := strings.Join([]string{"AWS4-HMAC-SHA256", stamp, scope, hex.EncodeToString(sum[:])}, "\n")

	k1 := hmacSHA256([]byte("AWS4"+c.SecretKey), day)
	k2 := hmacSHA256(k1, region)
	k3 := hmacSHA256(k2, "s3")
	signing := hmacSHA256(k3, "aws4_request")
	q.Set("X-Amz-Signature", hex.EncodeToString(hmacSHA256(signing, toSign)))
	return u.Scheme + "://" + u.Host + canonicalURI + "?" + q.Encode(), nil
}

// Size 问对象存储这个东西多大。客户端报的大小不作数，以这里为准。
func (c Config) Size(key string, now time.Time) (int64, error) {
	signed, err := c.Presign(http.MethodHead, key, 2*time.Minute, now)
	if err != nil {
		return 0, err
	}
	req, err := http.NewRequest(http.MethodHead, signed, nil)
	if err != nil {
		return 0, err
	}
	res, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return 0, err
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusNotFound {
		return 0, errors.New("对象不存在")
	}
	if res.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("对象存储回了 %d", res.StatusCode)
	}
	return res.ContentLength, nil
}

// Delete 删掉一个对象：用户关掉同步，或者删掉环境。
func (c Config) Delete(key string, now time.Time) error {
	signed, err := c.Presign(http.MethodDelete, key, 2*time.Minute, now)
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodDelete, signed, nil)
	if err != nil {
		return err
	}
	res, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 && res.StatusCode != http.StatusNotFound {
		return fmt.Errorf("对象存储回了 %d", res.StatusCode)
	}
	return nil
}

// 对象的名字。一个账号一个前缀；编号整段转义，里面就算有斜杠也变不成一层目录。
func ObjectKey(userID, envID string) string {
	seg := func(s string) string { return strings.ReplaceAll(url.QueryEscape(s), "+", "%20") }
	return "u/" + seg(userID) + "/cookies/" + seg(envID)
}
