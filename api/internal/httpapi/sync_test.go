package httpapi

import "testing"

// 这串数字是用户在两台设备上肉眼核对的东西：同一把公钥必须永远得到同一串，
// 换一把就要变。服务器要是把公钥换成自己的，两边显示的数字对不上，用户就不会点允许。
func TestPairingDigitsPinAPublicKey(t *testing.T) {
	const key = "MCowBQYDK2VuAyEAGb9ECWmEzf6FQbrBZ9w7lshQhqowtrbLDFw4rXAxZuE="
	got := pairingDigits(key)
	if len(got) != 6 {
		t.Fatalf("要 6 位，得到 %q", got)
	}
	for _, c := range got {
		if c < '0' || c > '9' {
			t.Fatalf("只许数字，得到 %q", got)
		}
	}
	if again := pairingDigits(key); again != got {
		t.Fatalf("同一把公钥算出两个结果：%q 和 %q", got, again)
	}
	// 只差一个字符的公钥。
	if other := pairingDigits(key[:len(key)-2] + "F="); other == got {
		t.Fatal("换了公钥数字却一样")
	}
	if pairingDigits("") == got {
		t.Fatal("空公钥不该撞上")
	}
}

func TestOnlyBase64ShapedKeysAreAccepted(t *testing.T) {
	for _, ok := range []string{
		"MCowBQYDK2VuAyEAGb9ECWmEzf6FQbrBZ9w7lshQhqowtrbLDFw4rXAxZuE=",
		"YWJjZGVmZ2hpamtsbW5vcA==",
	} {
		if !b64Re.MatchString(ok) {
			t.Fatalf("该收的没收：%q", ok)
		}
	}
	for _, bad := range []string{
		"", "short", "../../etc/passwd", "AAAA AAAA AAAA AAAA",
		"<script>alert(1)</script>xxxxxxxx",
	} {
		if b64Re.MatchString(bad) {
			t.Fatalf("不该收的收了：%q", bad)
		}
	}
}
