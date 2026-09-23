#!/usr/bin/env bash
# 工作台这一侧的端到端自检：官网授权登录、环境名额、启动授权、心跳、独占锁、降档。
# 对着一套已经起好的 compose 跑（CI 里就是这么用的）。管理员邮箱要和 config.yaml 里的一致。
#   ./scripts/e2e-desktop.sh [官网地址] [管理员邮箱] [管理员密码，账号已存在时才需要]
set -uo pipefail
B="${1:-http://127.0.0.1:3011}/api"; ADMIN="${2:-ci@example.test}"; PW='e2e-password-123'; ADMIN_PW="${3:-$PW}"
export no_proxy='*' NO_PROXY='*'
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT; FAILED=0

J() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1], {'d': d}))" "$1" 2>/dev/null; }
site() { local jar=$1 m=$2 p=$3; shift 3; curl -sS -b "$T/$jar" -c "$T/$jar" -X "$m" -H 'content-type: application/json' "$@" "$B$p"; }
desk() { local tok=$1 m=$2 p=$3; shift 3; curl -sS -X "$m" -H "authorization: Bearer $tok" -H 'content-type: application/json' "$@" "$B$p"; }
check() { if [ "$2" = "$3" ]; then echo "ok    $1"; else echo "FAIL  $1: want [$2] got [$3]"; FAILED=1; fi; }
pkce() { V=$(openssl rand -hex 32); C=$(printf '%s' "$V" | openssl dgst -sha256 -binary | openssl base64 -A | tr '+/' '-_' | tr -d '='); }
authorize() { site "$1" POST /auth/device/authorize -d "{\"challenge\":\"$C\",\"deviceId\":\"$2\",\"deviceName\":\"$3\"}"; }
exchange() { curl -sS -X POST -H 'content-type: application/json' -d "{\"code\":\"$1\",\"verifier\":\"$2\"}" "$B/v1/device/exchange"; }
login() { pkce; local r; r=$(authorize "$1" "$2" "$3" | J 'd["redirect"]'); exchange "${r#enclave://auth?code=}" "$V"; }
redis() { docker compose exec -T redis redis-cli "$@"; }

N=$RANDOM; U="desk$N@example.test"; O="other$N@example.test"
site adm POST /auth/register -d "{\"email\":\"$ADMIN\",\"password\":\"$ADMIN_PW\"}" >/dev/null
site adm POST /auth/login -d "{\"email\":\"$ADMIN\",\"password\":\"$ADMIN_PW\"}" >/dev/null
site u POST /auth/register -d "{\"email\":\"$U\",\"password\":\"$PW\"}" >/dev/null
site o POST /auth/register -d "{\"email\":\"$O\",\"password\":\"$PW\"}" >/dev/null
setplan() { site adm POST /admin/plan -d "{\"email\":\"$U\",\"plan\":\"$1\"}" | J 'd.get("plan")'; }

# ── 登录：官网授权 → 一次性授权码 → 设备令牌 ──
pkce
check "没登录官网不能授权"        UNAUTHENTICATED "$(curl -sS -X POST -H 'content-type: application/json' -d "{\"challenge\":\"$C\"}" "$B/auth/device/authorize" | J 'd.get("code")')"
check "challenge 不合法"          BAD_REQUEST     "$(site u POST /auth/device/authorize -d '{"challenge":"short"}' | J 'd.get("code")')"
R=$(authorize u dev-a "A box" | J 'd["redirect"]'); CODE=${R#enclave://auth?code=}
check "跳回工作台的地址"          enclave://auth  "${R%%\?*}"
check "verifier 不对换不出令牌"   BAD_CODE        "$(exchange "$CODE" wrong | J 'd.get("code")')"
check "授权码只能用一次"          BAD_CODE        "$(exchange "$CODE" "$V" | J 'd.get("code")')"
A=$(login u dev-a "A box" | J 'd["token"]')
check "拿到设备令牌"              43              "${#A}"
check "免费档第二台电脑"          DEVICE_LIMIT    "$(login u dev-b "B box" | J 'd.get("code")')"
check "没令牌"                    UNAUTHENTICATED "$(curl -sS "$B/v1/entitlement" | J 'd.get("code")')"
check "免费档额度"                "('free', 3, 1, 0, 0)" "$(desk "$A" GET /v1/entitlement | J '(d["plan"]["plan"], d["plan"]["envLimit"], d["plan"]["concurrent"], d["profiles"], d["running"])')"

# ── 名额：8 个并发新建，免费档只能成 3 个 ──
for i in 1 2 3 4 5 6 7 8; do desk "$A" PUT "/v1/profiles/env-$N-$i" -d "{\"name\":\"env $i\"}" > "$T/put-$i" & done; wait
check "并发新建不超额"            "3 5 3"         "$(cat "$T"/put-* | grep -o '"ok":true' | wc -l | tr -d ' ') $(cat "$T"/put-* | grep -o PLAN_ENV_LIMIT | wc -l | tr -d ' ') $(desk "$A" GET /v1/entitlement | J 'd["profiles"]')"
set -- $(desk "$A" GET /v1/profiles | J '" ".join(p["id"] for p in d["profiles"])'); P1=$1; P2=$2
check "名额满了还能改已有的"      True            "$(desk "$A" PUT "/v1/profiles/$P1" -d '{"name":"renamed"}' | J 'd["ok"]')"
OT=$(login o dev-o "O box" | J 'd["token"]')
check "别的账号启动不了我的环境"  PROFILE_UNKNOWN "$(desk "$OT" POST "/v1/profiles/$P1/start" | J 'd.get("code")')"
# 同一个环境包导进了另一个账号（ID 相同）：各数各的名额、各锁各的，互不相干
check "同一个 ID 在另一个账号下登记" 1            "$(desk "$OT" PUT "/v1/profiles/$P1" -d '{"name":"imported"}' | J 'd["profiles"]')"
check "不占我的名额也改不了我的"  "3 renamed"     "$(desk "$A" GET /v1/entitlement | J 'd["profiles"]') $(desk "$A" GET /v1/profiles | J '[p["name"] for p in d["profiles"] if p["id"]=="'"$P1"'"][0]')"
check "另一个账号开着不影响我开"  "True True"     "$(desk "$OT" POST "/v1/profiles/$P1/start" | J 'd["ok"]') $(desk "$A" POST "/v1/profiles/$P1/start" | J 'd["ok"]')"
desk "$OT" DELETE "/v1/profiles/$P1" >/dev/null; desk "$A" POST "/v1/profiles/$P1/stop" >/dev/null
check "另一个账号删的是它自己的"  3               "$(desk "$A" GET /v1/entitlement | J 'd["profiles"]')"

# ── 启动授权、心跳 ──
check "启动"                      "(True, 60)"    "$(desk "$A" POST "/v1/profiles/$P1/start" | J '(d["ok"], d["leaseSeconds"])')"
check "同一台重复启动不多占名额"  True            "$(desk "$A" POST "/v1/profiles/$P1/start" | J 'd["ok"]')"
check "免费档同时只能跑 1 个"     PLAN_CONCURRENT_LIMIT "$(desk "$A" POST "/v1/profiles/$P2/start" | J 'd.get("code")')"
check "心跳"                      True            "$(desk "$A" POST "/v1/profiles/$P1/heartbeat" | J 'd["held"]')"

# ── 改档立刻生效；第二台电脑抢同一个环境 ──
check "管理员改成 Pro"            pro             "$(setplan pro)"
check "工作台下一次问就是 Pro"    pro             "$(desk "$A" GET /v1/entitlement | J 'd["plan"]["plan"]')"
BT=$(login u dev-b "B box" | J 'd["token"]')
check "另一台电脑启动同一个环境"  "('PROFILE_LOCKED', True)" "$(desk "$BT" POST "/v1/profiles/$P1/start" | J '(d.get("code"), "A box" in str(d))')"
check "另一台电脑删不了在跑的"    PROFILE_RUNNING "$(desk "$BT" DELETE "/v1/profiles/$P1" | J 'd.get("code")')"
check "官网删不了在跑的"          PROFILE_RUNNING "$(site u DELETE "/profiles/$P1" | J 'd.get("code")')"
check "别人的心跳不算数"          False           "$(desk "$BT" POST "/v1/profiles/$P1/heartbeat" | J 'd["held"]')"
desk "$BT" POST "/v1/profiles/$P1/stop" >/dev/null
check "别人停不掉我的"            PROFILE_LOCKED  "$(desk "$BT" POST "/v1/profiles/$P1/start" | J 'd.get("code")')"
check "官网能看到在哪台电脑上跑"  dev-a           "$(site u GET /profiles | J '[p["runningOn"] for p in d["profiles"] if p["id"]=="'"$P1"'"][0]')"
desk "$A" POST "/v1/profiles/$P1/stop" >/dev/null
for t in "$A" "$BT" "$A" "$BT" "$A" "$BT"; do desk "$t" POST "/v1/profiles/$P1/start" > "$T/race-$RANDOM$RANDOM" & done; wait
ORG=$(docker compose exec -T postgres psql -U enclave -d enclave -Atc "select org_id from users where email='$U'" | tr -d '\r')
OWNER=$(redis get "lock:profile:$ORG:$P1" | tr -d '\r'); [ "$OWNER" = dev-a ] && WIN=$A || WIN=$BT
check "两台同时点启动只成一台"    3               "$(cat "$T"/race-* | grep -o PROFILE_LOCKED | wc -l | tr -d ' ')"
desk "$WIN" POST "/v1/profiles/$P1/stop" >/dev/null

# ── 60 秒没心跳：锁和名额自己释放（这里直接把锁删掉、把到期时刻改到过去） ──
desk "$A" POST "/v1/profiles/$P2/start" >/dev/null
redis del "lock:profile:$ORG:$P2" >/dev/null; redis zadd "org:$ORG:running" 1 "$P2" >/dev/null
check "过期的不再占运行名额"      0               "$(desk "$A" GET /v1/entitlement | J 'd["running"]')"
check "另一台电脑可以接手"        True            "$(desk "$BT" POST "/v1/profiles/$P2/start" | J 'd["ok"]')"
check "原来那台的心跳得知已丢"    False           "$(desk "$A" POST "/v1/profiles/$P2/heartbeat" | J 'd["held"]')"
# 断网几分钟又回来、期间没人接手：心跳自己把锁拿回来
desk "$A" POST "/v1/profiles/$P1/start" >/dev/null; redis del "lock:profile:$ORG:$P1" >/dev/null; redis zadd "org:$ORG:running" 1 "$P1" >/dev/null
check "没人接手时心跳重新拿到锁"  "True dev-a"    "$(desk "$A" POST "/v1/profiles/$P1/heartbeat" | J 'd["held"]') $(redis get "lock:profile:$ORG:$P1" | tr -d '\r')"
desk "$A" POST "/v1/profiles/$P1/stop" >/dev/null
site u DELETE /devices/dev-b >/dev/null
check "解绑立刻还回运行名额"      0               "$(desk "$A" GET /v1/entitlement | J 'd["running"]')"
check "解绑后令牌作废"            DEVICE_REVOKED  "$(desk "$BT" GET /v1/entitlement | J 'd.get("code")')"

# ── 降档：登记数超过名额时，只有最早建的那几个能启动 ──
desk "$A" PUT "/v1/profiles/env-$N-x4" -d '{}' >/dev/null; desk "$A" PUT "/v1/profiles/env-$N-x5" -d '{}' >/dev/null
setplan free >/dev/null
check "降档后最早建的能启动"      True            "$(desk "$A" POST "/v1/profiles/$P1/start" | J 'd["ok"]')"
desk "$A" POST "/v1/profiles/$P1/stop" >/dev/null
check "降档后超出名额的不能启动"  PLAN_ENV_LIMIT  "$(desk "$A" POST "/v1/profiles/env-$N-x5/start" | J 'd.get("code")')"
check "降档后不能再新建"          PLAN_ENV_LIMIT  "$(desk "$A" PUT "/v1/profiles/env-$N-x6" -d '{}' | J 'd.get("code")')"
check "删一个还一个名额"          4               "$(desk "$A" DELETE "/v1/profiles/$P2" | J 'd["profiles"]')"
check "退出登录"                  DEVICE_REVOKED  "$(desk "$A" POST /v1/device/logout >/dev/null; desk "$A" GET /v1/entitlement | J 'd.get("code")')"

exit $FAILED
