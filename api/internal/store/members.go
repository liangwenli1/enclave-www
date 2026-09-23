package store

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

/* 团队成员。一个组织里的人：一个所有者，若干管理员和操作员。

   角色只有三个，含义写死在这里，别处只做判断不重新解释：
     owner    —— 付费、邀请和移除成员、分配环境，什么都能做。一个组织只有一个。
     admin    —— 管环境和分配，不能动订阅，也不能移除成员。
     operator —— 只能打开分配给他的环境。看不到代理密码，导不出任何东西。 */

const (
	RoleOwner    = "owner"
	RoleAdmin    = "admin"
	RoleOperator = "operator"
)

func ValidRole(role string) bool { return role == RoleAdmin || role == RoleOperator }

// Invite 一张邀请。没有邮件服务，所以这里只生成链接，由邀请人自己发给对方。
// 主键存的是令牌的哈希：数据库被看到也换不出一次可用的邀请。
type Invite struct {
	TokenHash  string `gorm:"primaryKey"`
	OrgID      string `gorm:"index;not null"`
	Email      string `gorm:"not null"`
	Role       string `gorm:"not null"`
	InvitedBy  string `gorm:"not null"`
	CreatedAt  time.Time
	ExpiresAt  time.Time
	AcceptedAt *time.Time
}

var (
	ErrSeatLimit      = errors.New("seat limit")
	ErrInviteUnusable = errors.New("invite unusable")
)

func (s *Store) Members(orgID string) ([]User, error) {
	var list []User
	err := s.DB.Where("org_id = ?", orgID).Order("created_at").Find(&list).Error
	return list, err
}

func (s *Store) RenameOrg(orgID, name string) error {
	return s.DB.Model(&Organization{}).Where("id = ?", orgID).Update("name", name).Error
}

func (s *Store) MemberCount(orgID string) int64 {
	var n int64
	s.DB.Model(&User{}).Where("org_id = ?", orgID).Count(&n)
	return n
}

// DevicesOfOrg 这个组织里所有人的电脑。所有者批准新设备时要看到成员的那一台。
func (s *Store) DevicesOfOrg(orgID string) ([]Device, error) {
	var list []Device
	err := s.DB.Where("user_id IN (?)", s.DB.Model(&User{}).Select("id").Where("org_id = ?", orgID)).
		Order("last_seen_at DESC").Find(&list).Error
	return list, err
}

// PendingInvites 还没被用掉、也还没过期的邀请。
func (s *Store) PendingInvites(orgID string) ([]Invite, error) {
	var list []Invite
	err := s.DB.Where("org_id = ? AND accepted_at IS NULL AND expires_at > ?", orgID, time.Now()).
		Order("created_at DESC").Find(&list).Error
	return list, err
}

// CreateInvite 席位算的是"已经在团队里的人 + 还没用掉的邀请"，两边加起来不能超过档位给的席位数。
func (s *Store) CreateInvite(orgID, email, role, invitedBy, token string, seats int, ttl time.Duration) (*Invite, error) {
	inv := &Invite{
		TokenHash: HashToken(token), OrgID: orgID, Email: email, Role: role, InvitedBy: invitedBy,
		CreatedAt: time.Now(), ExpiresAt: time.Now().Add(ttl),
	}
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		var org Organization
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&org, "id = ?", orgID).Error; err != nil {
			return err
		}
		var people, pending int64
		tx.Model(&User{}).Where("org_id = ?", orgID).Count(&people)
		tx.Model(&Invite{}).Where("org_id = ? AND accepted_at IS NULL AND expires_at > ?", orgID, time.Now()).Count(&pending)
		if int(people+pending) >= seats {
			return ErrSeatLimit
		}
		// 同一个邮箱重复邀请：旧的那张作废，只留最新的一张。
		if err := tx.Where("org_id = ? AND email = ? AND accepted_at IS NULL", orgID, email).Delete(&Invite{}).Error; err != nil {
			return err
		}
		return tx.Create(inv).Error
	})
	return inv, err
}

func (s *Store) Invite(token string) (*Invite, error) {
	var inv Invite
	if err := s.DB.First(&inv, "token_hash = ?", HashToken(token)).Error; err != nil {
		return nil, ErrNotFound
	}
	if inv.AcceptedAt != nil || inv.ExpiresAt.Before(time.Now()) {
		return nil, ErrInviteUnusable
	}
	return &inv, nil
}

func (s *Store) DeleteInvite(orgID, tokenHash string) (bool, error) {
	res := s.DB.Where("org_id = ? AND token_hash = ? AND accepted_at IS NULL", orgID, tokenHash).Delete(&Invite{})
	return res.RowsAffected > 0, res.Error
}

// AcceptInvite 用这张邀请建一个账号，直接落在邀请方的组织里。席位在事务里再数一遍。
func (s *Store) AcceptInvite(token, email, passHash string, seats int) (*User, error) {
	u := &User{ID: uuid.NewString(), Email: email, PassHash: passHash}
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		var inv Invite
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&inv, "token_hash = ?", HashToken(token)).Error; err != nil {
			return ErrNotFound
		}
		if inv.AcceptedAt != nil || inv.ExpiresAt.Before(time.Now()) {
			return ErrInviteUnusable
		}
		var people int64
		tx.Model(&User{}).Where("org_id = ?", inv.OrgID).Count(&people)
		if int(people) >= seats {
			return ErrSeatLimit
		}
		u.OrgID, u.Role, u.CreatedAt = inv.OrgID, inv.Role, time.Now()
		if err := tx.Create(u).Error; err != nil {
			return err
		}
		now := time.Now()
		return tx.Model(&Invite{}).Where("token_hash = ?", inv.TokenHash).Update("accepted_at", now).Error
	})
	return u, err
}

// RemoveMember 把人移出团队：他的账号还在，只是回到一个属于他自己的空组织。
// 同时断掉他和团队数据的所有联系——设备解绑（令牌立刻失效）、密钥包装删掉、分配收回。
// 他电脑上已经解开过的那份收不回来，界面上要说清楚。
func (s *Store) RemoveMember(orgID, userID string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var u User
		if err := tx.First(&u, "id = ? AND org_id = ?", userID, orgID).Error; err != nil {
			return ErrNotFound
		}
		if u.Role == RoleOwner {
			return errors.New("owner")
		}
		if err := tx.Where("user_id = ?", userID).Delete(&Device{}).Error; err != nil {
			return err
		}
		if err := tx.Where("org_id = ? AND user_id = ?", orgID, userID).Delete(&FolderMember{}).Error; err != nil {
			return err
		}
		own := &Organization{ID: uuid.NewString(), Name: u.Email, PlanTier: "free", CreatedAt: time.Now()}
		if err := tx.Create(own).Error; err != nil {
			return err
		}
		if err := tx.Create(&Folder{OrgID: own.ID, ID: DefaultFolder, Name: "默认", CreatedAt: time.Now()}).Error; err != nil {
			return err
		}
		return tx.Model(&User{}).Where("id = ?", userID).
			Updates(map[string]any{"org_id": own.ID, "role": RoleOwner}).Error
	})
}

func (s *Store) SetMemberRole(orgID, userID, role string) error {
	res := s.DB.Model(&User{}).Where("id = ? AND org_id = ? AND role <> ?", userID, orgID, RoleOwner).
		Update("role", role)
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return res.Error
}
