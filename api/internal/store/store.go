// Package store 是数据层：PostgreSQL 放账号、订阅、设备、内核、设置；Redis 放会话和限流。
package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

// Organization 是计费单位。现在每个账号注册时得到一个只有自己的组织；团队席位在这上面加成员。
type Organization struct {
	ID       string `gorm:"primaryKey"`
	Name     string
	PlanTier string `gorm:"not null;default:free"`
	// 订阅到期时间。空 = 不过期（免费档，或管理员手动开的长期档）。
	SubscriptionExpiresAt *time.Time
	// 管理员手动改过的设备上限。空 = 用档位自带的。
	DeviceLimit *int
	// 支付通道那边的客户和订阅编号，Webhook 靠它们认人。
	BillingCustomerID     string `gorm:"index"`
	BillingSubscriptionID string `gorm:"index"`
	// active / canceled（已取消，到期前仍有效）/ expired / 空
	BillingStatus string
	CreatedAt     time.Time
}

type User struct {
	ID        string `gorm:"primaryKey"`
	OrgID     string `gorm:"index;not null"`
	Email     string `gorm:"uniqueIndex;not null"`
	PassHash  string `gorm:"not null"`
	Role      string `gorm:"not null;default:owner"`
	CreatedAt time.Time
}

// Device 一台登录过工作台的电脑。ID 由客户端生成；令牌只存哈希。
type Device struct {
	ID        string `gorm:"primaryKey"`
	UserID    string `gorm:"index;not null"`
	Name      string
	TokenHash string `gorm:"uniqueIndex;not null"`
	// 这台设备的同步公钥（X25519）。别的设备用它包住数据密钥，只有这台拆得开。
	SyncPublicKey string
	CreatedAt     time.Time
	LastSeenAt    time.Time
}

type Kernel struct {
	Version  string `gorm:"primaryKey"`
	Platform string `gorm:"primaryKey"`
	// 内核的类：chromium / firefox。见 license.Engines。
	Engine    string `gorm:"not null"`
	Channel   string `gorm:"not null"`
	URL       string `gorm:"not null"`
	Filename  string `gorm:"not null"`
	SHA256    string `gorm:"column:sha256;not null"`
	Bytes     int64  `gorm:"not null"`
	Notes     string
	CreatedAt time.Time
}

type Message struct {
	ID        uint `gorm:"primaryKey"`
	Topic     string
	Email     string
	Message   string
	CreatedAt time.Time
}

// Setting 管理后台里填的配置。Secret=true 的值是密文。
type Setting struct {
	Key       string `gorm:"primaryKey"`
	Value     string
	Secret    bool
	UpdatedAt time.Time
}

// BillingEvent 处理过的 Webhook 事件。支付通道会重发，同一个事件只能生效一次。
type BillingEvent struct {
	ID         string `gorm:"primaryKey"`
	Type       string
	ReceivedAt time.Time
}

type Store struct {
	DB    *gorm.DB
	Redis *redis.Client
}

func Open(dsn string, rdb *redis.Client) (*Store, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Warn)})
	if err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(&Organization{}, &User{}, &Device{}, &Kernel{}, &Message{}, &Setting{}, &BillingEvent{}, &Profile{}, &Invite{}, &Folder{}, &FolderMember{}, &SyncSlot{}, &SyncGrant{}, &SyncKey{}, &SyncEnvelope{}, &SyncDoc{}, &SyncBlob{}, &Event{}); err != nil {
		return nil, err
	}
	return &Store{DB: db, Redis: rdb}, nil
}

var ErrNotFound = errors.New("not found")

func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

/* ── 账号 ───────────────────────────────────────────────── */

// CreateUser 建账号，同时建它自己的组织（免费档）。邮箱重复时返回 gorm.ErrDuplicatedKey。
func (s *Store) CreateUser(email, passHash string) (*User, error) {
	u := &User{ID: uuid.NewString(), Email: email, PassHash: passHash, Role: "owner"}
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		org := &Organization{ID: uuid.NewString(), Name: email, PlanTier: "free"}
		if err := tx.Create(org).Error; err != nil {
			return err
		}
		// 每个组织都得有默认文件夹：环境必须落在某个文件夹里，
		// 不然它就是谁的授权范围都不覆盖的孤儿。
		if err := tx.Create(&Folder{OrgID: org.ID, ID: DefaultFolder, Name: "默认", CreatedAt: time.Now()}).Error; err != nil {
			return err
		}
		u.OrgID = org.ID
		return tx.Create(u).Error
	})
	return u, err
}

func (s *Store) UserByEmail(email string) (*User, error) { return s.user("email = ?", email) }
func (s *Store) UserByID(id string) (*User, error)       { return s.user("id = ?", id) }

func (s *Store) user(query string, arg any) (*User, error) {
	var u User
	if err := s.DB.Where(query, arg).First(&u).Error; err != nil {
		return nil, ErrNotFound
	}
	return &u, nil
}

func (s *Store) Org(id string) (*Organization, error) {
	var o Organization
	if err := s.DB.First(&o, "id = ?", id).Error; err != nil {
		return nil, ErrNotFound
	}
	return &o, nil
}

/* ── 设备 ───────────────────────────────────────────────── */

func (s *Store) Devices(userID string) ([]Device, error) {
	var list []Device
	err := s.DB.Where("user_id = ?", userID).Order("last_seen_at DESC").Find(&list).Error
	return list, err
}

func (s *Store) DeviceByToken(token string) (*Device, error) {
	var d Device
	if err := s.DB.First(&d, "token_hash = ?", HashToken(token)).Error; err != nil {
		return nil, ErrNotFound
	}
	return &d, nil
}

// ErrDeviceLimit 这个账号绑满了。
var ErrDeviceLimit = errors.New("device limit")

// BindDevice 给这台设备发一个新令牌。同一个设备 ID 曾经绑在别的账号上的，那一行先清掉。
// 数设备和插入在同一个事务里并锁住组织那一行，两台电脑同时登录也不会超过上限。
func (s *Store) BindDevice(u *User, deviceID, name, token string, limit int) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var org Organization
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&org, "id = ?", u.OrgID).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ? AND user_id <> ?", deviceID, u.ID).Delete(&Device{}).Error; err != nil {
			return err
		}
		var existing Device
		found := tx.First(&existing, "id = ? AND user_id = ?", deviceID, u.ID).Error == nil
		if !found {
			var count int64
			tx.Model(&Device{}).Where("user_id = ?", u.ID).Count(&count)
			if int(count) >= limit {
				return ErrDeviceLimit
			}
		}
		now := time.Now()
		d := Device{ID: deviceID, UserID: u.ID, Name: name, TokenHash: HashToken(token), CreatedAt: now, LastSeenAt: now}
		return tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "token_hash", "last_seen_at"}),
		}).Create(&d).Error
	})
}

func (s *Store) TouchDevice(id string) {
	s.DB.Model(&Device{}).Where("id = ?", id).Update("last_seen_at", time.Now())
}

func (s *Store) DeleteDevice(id, userID string) (bool, error) {
	res := s.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&Device{})
	return res.RowsAffected > 0, res.Error
}

// TrimDevices 降档后超出上限的设备：留最近用过的，其余解绑。返回解绑了几台。
func (s *Store) TrimDevices(userID string, limit int) int {
	list, _ := s.Devices(userID)
	removed := 0
	for i, d := range list {
		if i >= limit {
			if ok, _ := s.DeleteDevice(d.ID, userID); ok {
				removed++
			}
		}
	}
	return removed
}

/* ── 会话与限流（Redis） ─────────────────────────────────── */

const sessionTTL = 30 * 24 * time.Hour

func (s *Store) NewSession(ctx context.Context, sid, userID string) error {
	return s.Redis.Set(ctx, "sess:"+sid, userID, sessionTTL).Err()
}

func (s *Store) SessionUser(ctx context.Context, sid string) string {
	id, _ := s.Redis.Get(ctx, "sess:"+sid).Result()
	return id
}

func (s *Store) EndSession(ctx context.Context, sid string) { s.Redis.Del(ctx, "sess:"+sid) }

// Allow 固定窗口限流：同一个键一分钟内最多 max 次。Redis 不通时放行——宁可少拦，不能把登录整个挡死。
func (s *Store) Allow(ctx context.Context, key string, max int64) bool {
	k := "rl:" + key
	n, err := s.Redis.Incr(ctx, k).Result()
	if err != nil {
		return true
	}
	if n == 1 {
		s.Redis.Expire(ctx, k, time.Minute)
	}
	return n <= max
}

/* ── 设置 ───────────────────────────────────────────────── */

func (s *Store) Setting(key string) (Setting, bool) {
	var v Setting
	ok := s.DB.First(&v, "key = ?", key).Error == nil
	return v, ok
}

func (s *Store) PutSetting(v Setting) error {
	v.UpdatedAt = time.Now()
	return s.DB.Clauses(clause.OnConflict{UpdateAll: true}).Create(&v).Error
}

/* ── 支付事件 ───────────────────────────────────────────── */

// FirstTime 记下这个事件；已经记过就返回 false。
func (s *Store) FirstTime(id, typ string) bool {
	res := s.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&BillingEvent{ID: id, Type: typ, ReceivedAt: time.Now()})
	return res.Error == nil && res.RowsAffected == 1
}
