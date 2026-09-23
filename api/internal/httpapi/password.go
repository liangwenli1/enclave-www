package httpapi

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Argon2id，参数取 OWASP 给的下限之上：64 MiB、3 轮、2 线程。
const (
	argonTime    = 3
	argonMemory  = 64 * 1024
	argonThreads = 2
	argonKeyLen  = 32
)

func hashPassword(password string) string {
	salt := make([]byte, 16)
	_, _ = rand.Read(salt)
	sum := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	e := base64.RawStdEncoding
	return "argon2id$" + e.EncodeToString(salt) + "$" + e.EncodeToString(sum)
}

func verifyPassword(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 3 || parts[0] != "argon2id" {
		return false
	}
	e := base64.RawStdEncoding
	salt, err1 := e.DecodeString(parts[1])
	want, err2 := e.DecodeString(parts[2])
	if err1 != nil || err2 != nil {
		return false
	}
	got := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1
}

// 查无此人时也算一次哈希，登录耗时不泄露"这个邮箱有没有注册"。
var dummyHash = hashPassword("enclave-dummy-password")
