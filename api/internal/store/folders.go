package store

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

/* 文件夹：授权挂在它身上。

   给一个成员开一个文件夹，里面的环境他全都看得到，之后新建进去的也自动跟着——
   这正是按单个环境分配做不到的事：每建一个新环境都要回来再分配一次，
   而漏掉的那次没人会发现。同行（AdsPower 的授权分组、GoLogin 的指定文件夹、
   Dolphin 的分享文件夹）都是这个形状。

   服务器这边只管"谁能看到哪些环境"。钥匙还是每个环境一把，由所有者的电脑包好，
   文件夹只是算出"该给谁发哪几把"的规则。 */

// DefaultFolder 每个组织都有的那一个，删不掉。环境必须属于且只属于一个文件夹。
const DefaultFolder = "default"

type Folder struct {
	OrgID     string `gorm:"primaryKey"`
	ID        string `gorm:"primaryKey"`
	Name      string
	CreatedAt time.Time
}

// FolderMember 把一个文件夹开给一个成员。
// 所有者和管理员不查这张表——他们看得到团队的全部。
type FolderMember struct {
	OrgID     string `gorm:"primaryKey"`
	FolderID  string `gorm:"primaryKey"`
	UserID    string `gorm:"primaryKey"`
	CreatedAt time.Time
}

// ErrFolderInUse 默认文件夹删不得。
var ErrFolderInUse = errors.New("folder in use")

func (s *Store) Folders(orgID string) ([]Folder, error) {
	var rows []Folder
	err := s.DB.Where("org_id = ?", orgID).Order("created_at").Find(&rows).Error
	return rows, err
}

// EnsureDefaultFolder 组织建起来、或者老库第一次跑到这里时，补上默认文件夹。
func (s *Store) EnsureDefaultFolder(orgID string) error {
	return s.DB.Clauses(clause.OnConflict{DoNothing: true}).
		Create(&Folder{OrgID: orgID, ID: DefaultFolder, Name: "默认", CreatedAt: time.Now()}).Error
}

func (s *Store) PutFolder(orgID, id, name string) error {
	f := Folder{OrgID: orgID, ID: id, Name: name, CreatedAt: time.Now()}
	return s.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "org_id"}, {Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name"}),
	}).Create(&f).Error
}

// DeleteFolder 删掉一个文件夹。里面的环境回到默认文件夹——
// 不能因为删了个文件夹就把环境也弄丢。授权跟着一起没。
func (s *Store) DeleteFolder(orgID, id string) error {
	if id == DefaultFolder {
		return ErrFolderInUse
	}
	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&Profile{}).Where("org_id = ? AND folder_id = ?", orgID, id).
			Update("folder_id", DefaultFolder).Error; err != nil {
			return err
		}
		if err := tx.Where("org_id = ? AND folder_id = ?", orgID, id).Delete(&FolderMember{}).Error; err != nil {
			return err
		}
		return tx.Where("org_id = ? AND id = ?", orgID, id).Delete(&Folder{}).Error
	})
}

/* ── 授权 ─────────────────────────────────────────────── */

// AssignFolders 重设某个成员手上的文件夹。给空的就是全部收回。
func (s *Store) AssignFolders(orgID, userID string, folderIDs []string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("org_id = ? AND user_id = ?", orgID, userID).Delete(&FolderMember{}).Error; err != nil {
			return err
		}
		if len(folderIDs) == 0 {
			return nil
		}
		rows := make([]FolderMember, 0, len(folderIDs))
		for _, id := range folderIDs {
			rows = append(rows, FolderMember{OrgID: orgID, FolderID: id, UserID: userID, CreatedAt: time.Now()})
		}
		return tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&rows).Error
	})
}

func (s *Store) AssignedFolders(orgID, userID string) ([]string, error) {
	var ids []string
	err := s.DB.Model(&FolderMember{}).Where("org_id = ? AND user_id = ?", orgID, userID).
		Order("folder_id").Pluck("folder_id", &ids).Error
	return ids, err
}

// FolderAssignmentsOf 这个组织里所有的文件夹授权，按成员归好。成员管理页一次要看全。
func (s *Store) FolderAssignmentsOf(orgID string) (map[string][]string, error) {
	var rows []FolderMember
	if err := s.DB.Where("org_id = ?", orgID).Order("folder_id").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := map[string][]string{}
	for _, r := range rows {
		out[r.UserID] = append(out[r.UserID], r.FolderID)
	}
	return out, nil
}

/* ── 从文件夹推出环境 ───────────────────────────────────

   下面两个是整套权限的接缝：发钥匙、算可见范围、收回授权都只经过它们。
   授权单位换成文件夹之后，改的就是这里，别处不用动。 */

// AssignedProfiles 这个成员看得到哪些环境——由他被开了哪些文件夹推出来。
func (s *Store) AssignedProfiles(orgID, userID string) ([]string, error) {
	var ids []string
	err := s.DB.Model(&Profile{}).
		Where("org_id = ? AND folder_id IN (?)", orgID,
			s.DB.Model(&FolderMember{}).Select("folder_id").
				Where("org_id = ? AND user_id = ?", orgID, userID)).
		Order("id").Pluck("id", &ids).Error
	return ids, err
}

// AssignmentsOf 组织里每个成员看得到哪些环境。
func (s *Store) AssignmentsOf(orgID string) (map[string][]string, error) {
	byFolder := map[string][]string{}
	var profiles []Profile
	if err := s.DB.Where("org_id = ?", orgID).Order("id").Find(&profiles).Error; err != nil {
		return nil, err
	}
	for _, p := range profiles {
		byFolder[p.FolderID] = append(byFolder[p.FolderID], p.ID)
	}
	var rows []FolderMember
	if err := s.DB.Where("org_id = ?", orgID).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := map[string][]string{}
	for _, r := range rows {
		out[r.UserID] = append(out[r.UserID], byFolder[r.FolderID]...)
	}
	return out, nil
}
