package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Profile 一个浏览器环境在云端的登记。这里只有"它存在、叫什么、用哪个内核"——
// 指纹、代理、Cookie 都不在这里，它们留在用户的电脑上。
// 登记它是为了两件事：环境名额由服务器数，同一个环境同一时刻只许一台电脑打开。
//
// 主键是（组织，环境 ID）：环境 ID 是客户端生成的，同一个环境包可能被导进不同的账号，
// 同一台电脑也可能换一个账号登录。各个账号各数各的名额、各锁各的，互不相干。
type Profile struct {
	OrgID         string `gorm:"primaryKey"`
	ID            string `gorm:"primaryKey"`
	CreatedBy     string
	Name          string
	FolderID      string
	EngineType    string
	EngineVersion string
	OSTarget      string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// ErrProfileLimit 环境名额用完了。
var ErrProfileLimit = errors.New("profile limit")

// PutProfile 登记或更新一个环境。新登记要占一个名额：数数和插入在同一个事务里并锁住组织那一行，
// 两台电脑同时新建也不会超过上限。已经登记过的只更新资料，不再数。
func (s *Store) PutProfile(p Profile, limit int) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var org Organization
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&org, "id = ?", p.OrgID).Error; err != nil {
			return err
		}
		var existing Profile
		if tx.First(&existing, "org_id = ? AND id = ?", p.OrgID, p.ID).Error == nil {
			return tx.Model(&existing).Updates(map[string]any{
				"name": p.Name, "folder_id": p.FolderID, "engine_type": p.EngineType,
				"engine_version": p.EngineVersion, "os_target": p.OSTarget,
			}).Error
		}
		var count int64
		tx.Model(&Profile{}).Where("org_id = ?", p.OrgID).Count(&count)
		if int(count) >= limit {
			return ErrProfileLimit
		}
		return tx.Create(&p).Error
	})
}

func (s *Store) Profiles(orgID string) ([]Profile, error) {
	var list []Profile
	err := s.DB.Where("org_id = ?", orgID).Order("created_at DESC").Find(&list).Error
	return list, err
}

func (s *Store) ProfileCount(orgID string) int {
	var n int64
	s.DB.Model(&Profile{}).Where("org_id = ?", orgID).Count(&n)
	return int(n)
}

func (s *Store) ProfileOf(orgID, id string) bool {
	var n int64
	s.DB.Model(&Profile{}).Where("org_id = ? AND id = ?", orgID, id).Count(&n)
	return n == 1
}

// WithinLimit 这个环境是不是排在名额之内。名额够用时永远是 true；
// 订阅到期、降档之后登记数会超过名额，这时只有最早建的那 limit 个还能启动——
// 否则买一个月高档位、建满、再退订，就能一直用下去。
func (s *Store) WithinLimit(orgID, id string, limit int) bool {
	var p Profile
	if s.DB.First(&p, "id = ? AND org_id = ?", id, orgID).Error != nil {
		return false
	}
	var older int64
	s.DB.Model(&Profile{}).Where("org_id = ? AND (created_at < ? OR (created_at = ? AND id < ?))",
		orgID, p.CreatedAt, p.CreatedAt, id).Count(&older)
	return int(older) < limit
}

func (s *Store) DeleteProfile(orgID, id string) bool {
	return s.DB.Where("org_id = ? AND id = ?", orgID, id).Delete(&Profile{}).RowsAffected > 0
}

/* ── 运行租约（Redis） ───────────────────────────────────────────────
   一个环境正在哪台电脑上跑，记在 lock:profile:<组织>:<id>（值是设备 ID，60 秒过期）；
   一个组织有哪些环境在跑，记在有序集合 org:<id>:running（分数是过期时刻）。
   客户端每 20 秒续一次；电脑崩了、断网了，60 秒后名额和锁自己释放。
   启动和续约是同一个动作（"这把锁归我"，已经是我的就延长）：断网几分钟再回来，
   只要没人接手、名额也还有，心跳自己就把锁拿回来，不用用户重启环境。
   查和改在一个 Lua 脚本里是一步，两台电脑同时点启动也只有一台能成。 */

const LeaseSeconds = 60

var startScript = redis.NewScript(`
local owner = redis.call('GET', KEYS[1])
if owner and owner ~= ARGV[1] then return {'LOCKED', owner} end
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', ARGV[2])
if not redis.call('ZSCORE', KEYS[2], ARGV[5]) and redis.call('ZCARD', KEYS[2]) >= tonumber(ARGV[4]) then
  return {'LIMIT', ''}
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
redis.call('ZADD', KEYS[2], tonumber(ARGV[2]) + tonumber(ARGV[3]), ARGV[5])
return {'OK', ''}`)

var stopScript = redis.NewScript(`
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('DEL', KEYS[1])
  redis.call('ZREM', KEYS[2], ARGV[2])
end
return 'OK'`)

func leaseKeys(orgID, profileID string) []string {
	return []string{"lock:profile:" + orgID + ":" + profileID, "org:" + orgID + ":running"}
}

// StartLease 申请在这台设备上运行这个环境。返回 "OK"、"LOCKED"（附占着它的设备 ID）或 "LIMIT"。
func (s *Store) StartLease(ctx context.Context, orgID, profileID, deviceID string, concurrent int) (string, string, error) {
	res, err := startScript.Run(ctx, s.Redis, leaseKeys(orgID, profileID),
		deviceID, time.Now().Unix(), LeaseSeconds, concurrent, profileID).StringSlice()
	if err != nil || len(res) != 2 {
		return "", "", errors.Join(errors.New("lease"), err)
	}
	return res[0], res[1], nil
}

func (s *Store) StopLease(ctx context.Context, orgID, profileID, deviceID string) {
	stopScript.Run(ctx, s.Redis, leaseKeys(orgID, profileID), deviceID, profileID)
}

// Running 这个组织现在有哪些环境在跑（环境 ID → 设备 ID）。
func (s *Store) Running(ctx context.Context, orgID string) map[string]string {
	key := "org:" + orgID + ":running"
	s.Redis.ZRemRangeByScore(ctx, key, "-inf", itoa(time.Now().Unix()))
	ids, _ := s.Redis.ZRange(ctx, key, 0, -1).Result()
	out := map[string]string{}
	for _, id := range ids {
		if dev, err := s.Redis.Get(ctx, leaseKeys(orgID, id)[0]).Result(); err == nil {
			out[id] = dev
		}
	}
	return out
}

func itoa(n int64) string { b, _ := json.Marshal(n); return string(b) }

/* ── 桌面端登录用的一次性授权码（Redis） ───────────────────────────── */

type DeviceCode struct {
	UserID, Challenge, DeviceID, DeviceName string
}

func (s *Store) PutDeviceCode(ctx context.Context, code string, v DeviceCode) error {
	raw, _ := json.Marshal(v)
	return s.Redis.Set(ctx, "devcode:"+code, raw, 2*time.Minute).Err()
}

// TakeDeviceCode 取出并作废。一个码只能换一次。
func (s *Store) TakeDeviceCode(ctx context.Context, code string) (DeviceCode, bool) {
	var v DeviceCode
	raw, err := s.Redis.GetDel(ctx, "devcode:"+code).Bytes()
	if err != nil || json.Unmarshal(raw, &v) != nil {
		return v, false
	}
	return v, true
}
