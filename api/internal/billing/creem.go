// Package billing 是支付通道这一层。现在接的是 Creem（Merchant of Record）。
// 换通道只换这个包：上层只认 Checkout / Portal / 一个"订阅变了"的事件。
//
// Creem 的接入方式（docs.creem.io）：
//   - 鉴权：x-api-key 头。正式 https://api.creem.io，测试 https://test-api.creem.io。
//   - 收银台：POST /v1/checkouts {product_id, success_url, request_id, customer, metadata} → checkout_url
//   - 客户自助页：POST /v1/customers/billing {customer_id} → customer_portal_link
//   - Webhook：creem-signature 头 = HMAC-SHA256(原始请求体, webhook 密钥) 的十六进制。
package billing

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Settings 管理员在管理后台里填的那几项。
type Settings struct {
	TestMode      bool
	APIKey        string
	WebhookSecret string
	// 档位 → Creem 产品 ID
	Products map[string]string
	// 测试用：覆盖 API 地址。
	BaseURL string
}

// Ready 能收钱、也能在收到钱之后开通。少了 Webhook 密钥，付款通知一律验不过签（见 Verify），
// 钱收了档位却开不了——所以它和 API key 一样是必需的。
func (s Settings) Ready() bool {
	return s.APIKey != "" && s.WebhookSecret != "" && len(s.Products) > 0
}

// Online 现在能在线订阅的档位：通道就绪，且这一档填了产品 ID。永远不是 nil（发出去是 []）。
func (s Settings) Online(plans []string) []string {
	out := []string{}
	if !s.Ready() {
		return out
	}
	for _, p := range plans {
		if s.Products[p] != "" {
			out = append(out, p)
		}
	}
	return out
}

func (s Settings) base() string {
	switch {
	case s.BaseURL != "":
		return s.BaseURL
	case s.TestMode:
		return "https://test-api.creem.io"
	default:
		return "https://api.creem.io"
	}
}

// PlanOfProduct 反查：这个产品 ID 是哪个档位。
func (s Settings) PlanOfProduct(productID string) string {
	for plan, id := range s.Products {
		if id == productID {
			return plan
		}
	}
	return ""
}

var client = &http.Client{Timeout: 20 * time.Second}

func (s Settings) post(ctx context.Context, path string, body any, out any) error {
	raw, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.base()+path, bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("x-api-key", s.APIKey)
	req.Header.Set("content-type", "application/json")
	res, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("连不上支付通道：%w", err)
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode/100 != 2 {
		return fmt.Errorf("支付通道返回 %d：%s", res.StatusCode, bytes.TrimSpace(data))
	}
	return json.Unmarshal(data, out)
}

// Checkout 建一个收银台会话，返回要把用户带去的地址。
// user_id 放进 metadata，Webhook 回来时靠它认人——邮箱用户可以在收银台改，不可靠。
func (s Settings) Checkout(ctx context.Context, plan, userID, email, successURL string) (string, error) {
	product := s.Products[plan]
	if product == "" {
		return "", errors.New("这个档位还没有配置产品")
	}
	var out struct {
		CheckoutURL string `json:"checkout_url"`
	}
	err := s.post(ctx, "/v1/checkouts", map[string]any{
		"product_id":  product,
		"success_url": successURL,
		"request_id":  userID,
		"customer":    map[string]string{"email": email},
		"metadata":    map[string]string{"user_id": userID, "plan": plan},
	}, &out)
	if err == nil && out.CheckoutURL == "" {
		err = errors.New("支付通道没有返回收银台地址")
	}
	return out.CheckoutURL, err
}

// Portal 客户自助页：换卡、取消订阅、看账单。
func (s Settings) Portal(ctx context.Context, customerID string) (string, error) {
	var out struct {
		Link string `json:"customer_portal_link"`
	}
	err := s.post(ctx, "/v1/customers/billing", map[string]string{"customer_id": customerID}, &out)
	return out.Link, err
}

// Verify 验 Webhook 签名。必须用原始请求体，重新序列化过的 JSON 验不过。
func (s Settings) Verify(body []byte, signature string) bool {
	if s.WebhookSecret == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(s.WebhookSecret))
	mac.Write(body)
	want := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(want), []byte(signature))
}

/* ── 事件 ───────────────────────────────────────────────── */

// ref 是 Creem 里"有时是 ID 字符串、有时是整个对象"的那种字段。只取 ID。
type ref struct{ ID string }

func (r *ref) UnmarshalJSON(b []byte) error {
	if len(b) > 0 && b[0] == '"' {
		return json.Unmarshal(b, &r.ID)
	}
	var obj struct {
		ID string `json:"id"`
	}
	err := json.Unmarshal(b, &obj)
	r.ID = obj.ID
	return err
}

type subscription struct {
	ID        string            `json:"id"`
	Product   ref               `json:"product"`
	Customer  ref               `json:"customer"`
	Status    string            `json:"status"`
	PeriodEnd *time.Time        `json:"current_period_end_date"`
	Metadata  map[string]string `json:"metadata"`
}

type envelope struct {
	ID     string          `json:"id"`
	Type   string          `json:"eventType"`
	Object json.RawMessage `json:"object"`
}

// Change 一个事件对订阅意味着什么。上层照着改数据库，不需要知道 Creem 的事件名。
type Change struct {
	EventID, EventType string
	UserID             string // 我们自己的用户 ID（来自 metadata），可能为空
	CustomerID         string
	SubscriptionID     string
	ProductID          string
	// active：有效，PeriodEnd 是这一期的结束时间
	// canceled：用户取消了，到 PeriodEnd 之前仍然有效
	// expired：结束了，回到免费档
	// 空：这个事件不改变订阅（只记一笔）
	Status    string
	PeriodEnd *time.Time
}

// Parse 把 Creem 的事件翻译成 Change。
func Parse(body []byte) (Change, error) {
	var env envelope
	if err := json.Unmarshal(body, &env); err != nil || env.ID == "" {
		return Change{}, errors.New("不是一个事件")
	}
	c := Change{EventID: env.ID, EventType: env.Type}
	var sub subscription
	switch env.Type {
	case "checkout.completed":
		// 付款成功。订阅挂在 checkout 对象里面；周期结束时间要等 subscription.paid。
		var co struct {
			Subscription *subscription     `json:"subscription"`
			Customer     ref               `json:"customer"`
			Metadata     map[string]string `json:"metadata"`
			RequestID    string            `json:"request_id"`
		}
		if err := json.Unmarshal(env.Object, &co); err != nil {
			return c, err
		}
		if co.Subscription == nil {
			return c, nil
		}
		sub = *co.Subscription
		if sub.Customer.ID == "" {
			sub.Customer = co.Customer
		}
		if sub.Metadata["user_id"] == "" {
			if sub.Metadata == nil {
				sub.Metadata = map[string]string{}
			}
			sub.Metadata["user_id"] = firstNonEmpty(co.Metadata["user_id"], co.RequestID)
		}
		c.Status = "active"
	case "subscription.active", "subscription.paid", "subscription.update", "subscription.trialing":
		if err := json.Unmarshal(env.Object, &sub); err != nil {
			return c, err
		}
		c.Status = "active"
	case "subscription.canceled":
		if err := json.Unmarshal(env.Object, &sub); err != nil {
			return c, err
		}
		c.Status = "canceled"
	case "subscription.expired", "subscription.paused":
		if err := json.Unmarshal(env.Object, &sub); err != nil {
			return c, err
		}
		c.Status = "expired"
	default:
		return c, nil
	}
	c.UserID = sub.Metadata["user_id"]
	c.CustomerID = sub.Customer.ID
	c.SubscriptionID = sub.ID
	c.ProductID = sub.Product.ID
	c.PeriodEnd = sub.PeriodEnd
	return c, nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
