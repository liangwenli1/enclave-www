package billing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

func TestVerifyNeedsTheRawBodyAndTheRightSecret(t *testing.T) {
	s := Settings{WebhookSecret: "whsec_test"}
	body := []byte(`{"id":"evt_1","eventType":"subscription.paid","object":{}}`)
	if !s.Verify(body, sign("whsec_test", body)) {
		t.Fatal("正确的签名应该通过")
	}
	if s.Verify(body, sign("other", body)) {
		t.Fatal("别的密钥签的不该通过")
	}
	if s.Verify(append(body, ' '), sign("whsec_test", body)) {
		t.Fatal("请求体改过一个字节就不该通过")
	}
	if (Settings{}).Verify(body, sign("", body)) {
		t.Fatal("没配置 Webhook 密钥时一律不通过，不能用空密钥验")
	}
}

// 这两段是 Creem 文档里的示例请求体（精简过）：同一个字段，在两种事件里形状不一样。
const checkoutCompleted = `{"id":"evt_5WHH","eventType":"checkout.completed","object":{"id":"ch_4l0N","request_id":"user-42",
 "order":{"id":"ord_4aDw","customer":"cust_1OcI","product":"prod_d1AY","status":"paid","type":"recurring"},
 "product":{"id":"prod_d1AY","name":"Monthly"},
 "customer":{"id":"cust_1OcI","email":"customer@example.com"},
 "subscription":{"id":"sub_6pC2","product":"prod_d1AY","customer":"cust_1OcI","status":"active","metadata":{"user_id":"user-42","plan":"pro"}}}}`

const subscriptionPaid = `{"id":"evt_21mO","eventType":"subscription.paid","object":{"id":"sub_6pC2","object":"subscription",
 "product":{"id":"prod_d1AY","name":"Monthly"},"customer":{"id":"cust_1OcI","email":"customer@example.com"},
 "status":"active","current_period_end_date":"2024-11-12T11:58:38.000Z","metadata":{"user_id":"user-42"}}}`

func TestParseReadsBothShapesOfTheSameFields(t *testing.T) {
	c, err := Parse([]byte(checkoutCompleted))
	if err != nil || c.Status != "active" || c.UserID != "user-42" || c.CustomerID != "cust_1OcI" ||
		c.SubscriptionID != "sub_6pC2" || c.ProductID != "prod_d1AY" {
		t.Fatalf("checkout.completed: %+v %v", c, err)
	}
	p, err := Parse([]byte(subscriptionPaid))
	if err != nil || p.Status != "active" || p.ProductID != "prod_d1AY" || p.CustomerID != "cust_1OcI" ||
		p.PeriodEnd == nil || p.PeriodEnd.Year() != 2024 || p.PeriodEnd.Month() != 11 {
		t.Fatalf("subscription.paid: %+v %v", p, err)
	}
}

func TestParseMapsLifecycleEventsToOurThreeStates(t *testing.T) {
	for event, want := range map[string]string{
		"subscription.active": "active", "subscription.paid": "active", "subscription.update": "active",
		"subscription.canceled": "canceled", "subscription.expired": "expired", "subscription.paused": "expired",
		"refund.created": "", "dispute.created": "",
	} {
		body := []byte(`{"id":"evt_x","eventType":"` + event + `","object":{"id":"sub_1","product":"prod_1","customer":"cust_1","metadata":{"user_id":"u"}}}`)
		c, err := Parse(body)
		if err != nil || c.Status != want {
			t.Errorf("%s → %q（想要 %q）%v", event, c.Status, want, err)
		}
	}
	if _, err := Parse([]byte(`{"hello":"world"}`)); err == nil {
		t.Error("没有事件 ID 的请求体不该被当成事件")
	}
}

func TestPlanOfProduct(t *testing.T) {
	s := Settings{Products: map[string]string{"solo": "prod_a", "pro": "prod_b"}}
	if s.PlanOfProduct("prod_b") != "pro" || s.PlanOfProduct("prod_zzz") != "" {
		t.Fatal("产品 ID 要能反查到档位，不认识的产品返回空")
	}
}
