package store

import (
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

/* 一个环境一把钥匙。

   服务器这一侧仍然什么都解不开：它只存两种包装——
     box_team：用团队密钥包的，所有者和管理员的电脑解得开；
     grant：   用某台设备的公钥包的，只有那台设备解得开。

   槽位名是 "env:<环境编号>"，外加一个放代理那一包的 "shared"。
   移除成员时，把他碰过的槽位标成"该换钥匙了"，剩下的事由所有者的电脑在后台做。 */

// 槽位名。和 Host 的 sync.rs 里那两个函数必须一致：改这里就要改那边。
const SharedSlot = "shared"

func EnvSlot(envID string) string { return "env:" + envID }

type SyncSlot struct {
	OrgID string `gorm:"primaryKey"`
	Slot  string `gorm:"primaryKey"`
	KeyID string `gorm:"not null"`
	// 用团队密钥包住的那一份。
	BoxTeam string `gorm:"not null"`
	// 有人被移出团队、而他能解开这个槽位：标上，等所有者的电脑换一把新的。
	Stale     bool
	UpdatedAt time.Time
}

// SyncGrant 把一把槽位钥匙交给某台设备。只有那台设备的私钥拆得开。
type SyncGrant struct {
	OrgID     string `gorm:"primaryKey"`
	Slot      string `gorm:"primaryKey"`
	DeviceID  string `gorm:"primaryKey"`
	KeyID     string `gorm:"not null"`
	Ephemeral string `gorm:"not null"`
	Box       string `gorm:"not null"`
	CreatedAt time.Time
}

func (s *Store) Slots(orgID string) ([]SyncSlot, error) {
	var list []SyncSlot
	err := s.DB.Where("org_id = ?", orgID).Order("slot").Find(&list).Error
	return list, err
}

func (s *Store) Slot(orgID, slot string) (*SyncSlot, error) {
	var row SyncSlot
	if err := s.DB.First(&row, "org_id = ? AND slot = ?", orgID, slot).Error; err != nil {
		return nil, ErrNotFound
	}
	return &row, nil
}

// PutSlot 新建或换钥匙。换钥匙时编号跟着换，旧的授予自然作废（编号对不上）。
func (s *Store) PutSlot(row SyncSlot) error {
	row.UpdatedAt = time.Now()
	return s.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "org_id"}, {Name: "slot"}},
		DoUpdates: clause.AssignmentColumns([]string{"key_id", "box_team", "stale", "updated_at"}),
	}).Create(&row).Error
}

func (s *Store) DeleteSlot(orgID, slot string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("org_id = ? AND slot = ?", orgID, slot).Delete(&SyncGrant{}).Error; err != nil {
			return err
		}
		return tx.Where("org_id = ? AND slot = ?", orgID, slot).Delete(&SyncSlot{}).Error
	})
}

// GrantsFor 这台设备手里有哪些槽位的钥匙。
func (s *Store) GrantsFor(orgID, deviceID string) ([]SyncGrant, error) {
	var list []SyncGrant
	err := s.DB.Where("org_id = ? AND device_id = ?", orgID, deviceID).Order("slot").Find(&list).Error
	return list, err
}

func (s *Store) GrantsOf(orgID string) ([]SyncGrant, error) {
	var list []SyncGrant
	err := s.DB.Where("org_id = ?", orgID).Find(&list).Error
	return list, err
}

func (s *Store) PutGrant(g SyncGrant) error {
	g.CreatedAt = time.Now()
	return s.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "org_id"}, {Name: "slot"}, {Name: "device_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"key_id", "ephemeral", "box", "created_at"}),
	}).Create(&g).Error
}

// DropGrants 收回某台设备手里的钥匙。给了槽位名就只收那一个。
func (s *Store) DropGrants(orgID, deviceID string, slots ...string) error {
	q := s.DB.Where("org_id = ? AND device_id = ?", orgID, deviceID)
	if len(slots) > 0 {
		q = q.Where("slot IN ?", slots)
	}
	return q.Delete(&SyncGrant{}).Error
}

// MarkStale 这些槽位的钥匙该换了。参数为空就什么都不做。
func (s *Store) MarkStale(orgID string, slots []string) error {
	if len(slots) == 0 {
		return nil
	}
	return s.DB.Model(&SyncSlot{}).Where("org_id = ? AND slot IN ?", orgID, slots).
		Update("stale", true).Error
}
