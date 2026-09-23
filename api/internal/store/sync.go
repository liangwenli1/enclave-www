package store

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

/* 同步密钥的保管。服务器这一侧全程拿不到明文密钥：
   它只存"包装后的密钥"——用某台设备的公钥包的，或者用恢复码派生的密钥包的。
   拆包的钥匙只在用户的设备上（系统钥匙串）或者用户手里（恢复码）。 */

// SyncKey 一个团队的同步状态。KeyID 是当前这把数据密钥的编号，换密钥时它跟着换。
type SyncKey struct {
	OrgID string `gorm:"primaryKey"`
	KeyID string `gorm:"not null"`
	// 恢复码那一份包装。RecoveryParams 是派生参数（Argon2id 的内存、轮数），客户端要按它复算。
	RecoverySalt   string
	RecoveryParams string
	RecoveryBox    string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// SyncEnvelope 给某一台设备的那一份包装。只有那台设备的私钥拆得开。
type SyncEnvelope struct {
	OrgID    string `gorm:"primaryKey"`
	DeviceID string `gorm:"primaryKey"`
	KeyID    string `gorm:"not null"`
	// 包装时用的一次性公钥，和密文。
	Ephemeral string `gorm:"not null"`
	Box       string `gorm:"not null"`
	CreatedAt time.Time
}

var ErrNoSyncKey = errors.New("sync not enabled")

func (s *Store) SyncKey(orgID string) (*SyncKey, error) {
	var k SyncKey
	if err := s.DB.First(&k, "org_id = ?", orgID).Error; err != nil {
		return nil, ErrNoSyncKey
	}
	return &k, nil
}

// EnableSync 第一台设备开同步：登记恢复码那一份包装，和这台设备自己的那一份。
// 再开一次就是换密钥（比如忘了恢复码重来）：旧的那些包装全部作废，别的设备要重新批准。
func (s *Store) EnableSync(orgID string, key SyncKey, self SyncEnvelope) error {
	key.OrgID, self.OrgID, self.KeyID = orgID, orgID, key.KeyID
	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("org_id = ?", orgID).Delete(&SyncEnvelope{}).Error; err != nil {
			return err
		}
		// 换密钥时旧密文没人解得开了，一起清掉。
		if err := tx.Where("org_id = ?", orgID).Delete(&SyncDoc{}).Error; err != nil {
			return err
		}
		key.UpdatedAt = time.Now()
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "org_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"key_id", "recovery_salt", "recovery_params", "recovery_box", "updated_at"}),
		}).Create(&key).Error; err != nil {
			return err
		}
		self.CreatedAt = time.Now()
		return tx.Create(&self).Error
	})
}

// PutEnvelope 老设备批准新设备：把包好的密钥放进来。
func (s *Store) PutEnvelope(e SyncEnvelope) error {
	e.CreatedAt = time.Now()
	return s.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "org_id"}, {Name: "device_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"key_id", "ephemeral", "box", "created_at"}),
	}).Create(&e).Error
}

func (s *Store) Envelope(orgID, deviceID string) (*SyncEnvelope, error) {
	var e SyncEnvelope
	if err := s.DB.First(&e, "org_id = ? AND device_id = ?", orgID, deviceID).Error; err != nil {
		return nil, ErrNotFound
	}
	return &e, nil
}

// DeleteEnvelope 收回某台设备手里的那一份包装。人被移出团队时，他的每一台都要收回：
// 再装一次系统、换一台电脑，都换不到这个团队的密钥了。
func (s *Store) DeleteEnvelope(orgID, deviceID string) {
	s.DB.Where("org_id = ? AND device_id = ?", orgID, deviceID).Delete(&SyncEnvelope{})
}

// SetDeviceKey 登记这台设备的公钥。别人拿它包出来的东西，只有这台设备拆得开。
// 设备是挂在人名下的，所以这里认的是用户，不是组织。
func (s *Store) SetDeviceKey(deviceID, userID, publicKey string) error {
	return s.DB.Model(&Device{}).
		Where("id = ? AND user_id = ?", deviceID, userID).
		Update("sync_public_key", publicKey).Error
}

// DisableSync 关掉同步：密钥和全部包装都删掉。云端存的密文从此没人能解开，所以调用方要同时删掉那些密文。
func (s *Store) DisableSync(orgID string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("org_id = ?", orgID).Delete(&SyncEnvelope{}).Error; err != nil {
			return err
		}
		if err := tx.Where("org_id = ?", orgID).Delete(&SyncDoc{}).Error; err != nil {
			return err
		}
		return tx.Where("org_id = ?", orgID).Delete(&SyncKey{}).Error
	})
}
