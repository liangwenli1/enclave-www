package license

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// 官网套餐页的数字抄在 web/lib/plans.json（页面要在服务器端直接渲染出来，不能等接口）。
// 这里钉住两边一致：改了这里的额度却没改官网，或者反过来，测试先叫。
func TestTheWebsiteShowsTheSameLimitsAsTheServerEnforces(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "..", "web", "lib", "plans.json"))
	if err != nil {
		t.Fatalf("读不到官网的套餐表：%v", err)
	}
	var site struct {
		Plans []struct {
			Plan        string `json:"plan"`
			EnvLimit    int    `json:"envLimit"`
			Concurrent  int    `json:"concurrent"`
			DeviceLimit int    `json:"deviceLimit"`
			Seats       int    `json:"seats"`
			API         string `json:"api"`
		} `json:"plans"`
	}
	if err := json.Unmarshal(raw, &site); err != nil {
		t.Fatalf("官网的套餐表不是合法 JSON：%v", err)
	}
	if len(site.Plans) != len(Plans) {
		t.Fatalf("档位数不一致：服务器 %d 个，官网 %d 个", len(Plans), len(site.Plans))
	}
	for i, want := range Plans {
		got := site.Plans[i]
		if got.Plan != want.Plan || got.EnvLimit != want.EnvLimit || got.Concurrent != want.Concurrent ||
			got.DeviceLimit != want.DeviceLimit || got.Seats != want.Seats || got.API != want.API {
			t.Errorf("第 %d 档对不上：\n服务器 %+v\n官网   %+v", i+1, want, got)
		}
	}
}
