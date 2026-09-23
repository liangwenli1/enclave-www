package httpapi

import (
	"bytes"
	"encoding/json"
	"testing"
	"time"

	"enclave/api/internal/store"
)

// 角色只能被设成管理员或操作员。所有者是注册时定下的，不许经接口改——
// 否则一个管理员可以把自己提成所有者，连订阅一起接管。
func TestOwnerCannotBeHandedOutThroughTheAPI(t *testing.T) {
	for _, role := range []string{store.RoleAdmin, store.RoleOperator} {
		if !store.ValidRole(role) {
			t.Fatalf("该收的角色被拒了：%q", role)
		}
	}
	for _, bad := range []string{store.RoleOwner, "", "OWNER", "admin ", "root", "超级管理员"} {
		if store.ValidRole(bad) {
			t.Fatalf("不该收的角色收了：%q", bad)
		}
	}
}

// 席位数跟着档位走；订阅过期的团队按免费档算——过期之后不该还留着 6 个席位。
func TestSeatsFollowThePlanAndExpiry(t *testing.T) {
	now := time.Date(2026, 9, 22, 12, 0, 0, 0, time.UTC)
	past, future := now.Add(-time.Hour), now.Add(time.Hour)

	for _, tc := range []struct {
		plan    string
		expires *time.Time
		want    int
	}{
		{"free", nil, 1},
		{"solo", nil, 1},
		{"pro", nil, 1},
		{"team", nil, 6},
		{"team", &future, 6},
		{"team", &past, 1},
	} {
		got := seatsOf(&store.Organization{PlanTier: tc.plan, SubscriptionExpiresAt: tc.expires}, now)
		if got != tc.want {
			t.Fatalf("%s（到期 %v）应该是 %d 个席位，得到 %d", tc.plan, tc.expires, tc.want, got)
		}
	}
}

// 一个还没分配过环境的成员，发出去必须是 []，不能是 null。
//
// 这一条是被线上行为逼出来的：Go 把 nil 切片写成 null，界面上 m.profiles.length
// 直接抛错，Next 的全局错误边界把整页换成错误页——所有者一邀请人，账号页就打不开。
func TestMembersWithoutAssignmentsSerializeAsEmptyList(t *testing.T) {
	assigned := map[string][]string{"有分配的人": {"env-1"}}

	for _, who := range []string{"没分配过的人", "有分配的人"} {
		out, err := json.Marshal(map[string]any{"profiles": listOf(assigned[who])})
		if err != nil {
			t.Fatalf("%s：序列化失败 %v", who, err)
		}
		if bytes.Contains(out, []byte("null")) {
			t.Errorf("%s：发出去的是 %s，界面会在 .length 上炸掉", who, out)
		}
	}
}

// 环境必须落在一个真实存在的文件夹里。
//
// 授权是按文件夹算的：落到一个不存在的文件夹，这个环境就谁都看不见了——
// 所有者在界面上找不到它，操作员也拿不到它的钥匙，但它还占着名额。
func TestAProfileNeverLandsInAFolderThatIsNotThere(t *testing.T) {
	exists := map[string]bool{store.DefaultFolder: true, "shop-us": true}
	cases := []struct{ want, got string }{
		{"shop-us", "shop-us"},
		{"", store.DefaultFolder},
		{"删掉了的", store.DefaultFolder},
		{store.DefaultFolder, store.DefaultFolder},
	}
	for _, tc := range cases {
		if got := pickFolder(tc.want, exists); got != tc.got {
			t.Errorf("pickFolder(%q) = %q，应该是 %q", tc.want, got, tc.got)
		}
	}
}
