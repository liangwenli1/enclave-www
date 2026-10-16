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
	// NeedsRotation 有拿得到团队密钥的人离开了（或被降成操作员）。
	// 旧密钥还能解开今后的包装，所以要换一把。由所有者的电脑做，做完清掉。
	NeedsRotation bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
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

// ErrRotationLost 另一台所有者的电脑刚换完。这一次不能再换，免得两把新密钥互相覆盖。
var ErrRotationLost = errors.New("rotation already finished")

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
		key.NeedsRotation = false
		key.UpdatedAt = time.Now()
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "org_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"key_id", "recovery_salt", "recovery_params", "recovery_box", "needs_rotation", "updated_at"}),
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

// SetNeedsRotation 标记这把团队密钥该换了。同步还没开时没有这一行，什么都不做。
func (s *Store) SetNeedsRotation(orgID string) error {
	return s.DB.Model(&SyncKey{}).Where("org_id = ?", orgID).Update("needs_rotation", true).Error
}

// RotateTeamKey 换成一把新的团队密钥。
//
// 和 EnableSync 的差别：那里会把已经上传的密文全部删掉（旧密钥没人留着，密文也没用了）。
// 轮换不是重来——环境和登录态还在，所有者的电脑会用新钥匙重传。这里只换包装和槽位，不动密文。
func (s *Store) RotateTeamKey(orgID string, key SyncKey, envelopes []SyncEnvelope, slots []SyncSlot) error {
	if _, err := s.SyncKey(orgID); err != nil {
		return err
	}
	return s.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		// 用 map：NeedsRotation 的 false 是零值，按结构体更新会被 GORM 跳过。
		// 条件里带着 needs_rotation：两台电脑同时来换，只有先到的那次改得了这一行。
		res := tx.Model(&SyncKey{}).Where("org_id = ? AND needs_rotation = ?", orgID, true).Updates(map[string]any{
			"key_id":          key.KeyID,
			"recovery_salt":   key.RecoverySalt,
			"recovery_params": key.RecoveryParams,
			"recovery_box":    key.RecoveryBox,
			"needs_rotation":  false,
			"updated_at":      now,
		})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return ErrRotationLost
		}
		if err := tx.Where("org_id = ?", orgID).Delete(&SyncEnvelope{}).Error; err != nil {
			return err
		}
		for i := range envelopes {
			envelopes[i].OrgID = orgID
			envelopes[i].KeyID = key.KeyID
			envelopes[i].CreatedAt = now
			if err := tx.Create(&envelopes[i]).Error; err != nil {
				return err
			}
		}
		// 旧的槽位授予对不上新编号，全部作废，等所有者的电脑重新发。
		if err := tx.Where("org_id = ?", orgID).Delete(&SyncGrant{}).Error; err != nil {
			return err
		}
		for i := range slots {
			slots[i].OrgID = orgID
			slots[i].Stale = false
			slots[i].UpdatedAt = now
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "org_id"}, {Name: "slot"}},
				DoUpdates: clause.AssignmentColumns([]string{"key_id", "box_team", "stale", "updated_at"}),
			}).Create(&slots[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
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
