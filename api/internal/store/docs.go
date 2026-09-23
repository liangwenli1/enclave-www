package store

import (
	"errors"
	"time"

	"gorm.io/gorm/clause"
)

/* 云端存的"文档"：环境和代理的配置，每一条都是客户端加密好才送上来的。
   服务器看得到的只有：属于谁、哪一类、编号、第几版、多大、什么时候改的。里面是什么，它不知道。 */

type SyncDoc struct {
	OrgID string `gorm:"primaryKey"`
	// environment / proxy
	Kind string `gorm:"primaryKey"`
	ID   string `gorm:"primaryKey"`
	// 客户端每改一次加一。两台电脑同时改时，版本小的那次会被挡下来（客户端拉下来合并后重试）。
	Version int64  `gorm:"not null"`
	KeyID   string `gorm:"not null"`
	// 密文（nonce ‖ 密文，base64）。删掉的条目 Box 为空、Deleted 为真：
	// 另一台电脑要知道"这条被删了"，不然它又会把它推回来。
	Box       string
	Deleted   bool
	UpdatedAt time.Time
}

// 单条最大多少。环境带着时间线，密文几十 KB；留足余量，也挡住拿它当网盘用。
const MaxDocBytes = 1 << 20

var ErrStaleVersion = errors.New("stale version")

// PutDoc 写一条。版本必须比服务器上那条新，否则拒绝——两台电脑同时改，后到的那次要先拉再推。
func (s *Store) PutDoc(d SyncDoc) error {
	d.UpdatedAt = time.Now()
	res := s.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "org_id"}, {Name: "kind"}, {Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"version", "key_id", "box", "deleted", "updated_at"}),
		Where:     clause.Where{Exprs: []clause.Expression{clause.Lt{Column: "sync_docs.version", Value: d.Version}}},
	}).Create(&d)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrStaleVersion
	}
	return nil
}

// Docs 这个团队下的全部文档（含已删的墓碑）。客户端登录后拉一次。
func (s *Store) Docs(orgID string) ([]SyncDoc, error) {
	var list []SyncDoc
	err := s.DB.Where("org_id = ?", orgID).Order("updated_at ASC").Find(&list).Error
	return list, err
}

// DropDocs 关掉同步、或者换了密钥：旧密文留着也没人解得开，一起删。
func (s *Store) DropDocs(orgID string) error {
	return s.DB.Where("org_id = ?", orgID).Delete(&SyncDoc{}).Error
}

/* 登录态（Cookie）放在对象存储里，这张表只记"有这么一份、第几版、多大"。 */

type SyncBlob struct {
	OrgID     string `gorm:"primaryKey"`
	EnvID     string `gorm:"primaryKey"`
	Version   int64  `gorm:"not null"`
	KeyID     string `gorm:"not null"`
	Bytes     int64
	UpdatedAt time.Time
}

func (s *Store) PutBlob(b SyncBlob) error {
	b.UpdatedAt = time.Now()
	res := s.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "org_id"}, {Name: "env_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"version", "key_id", "bytes", "updated_at"}),
		Where:     clause.Where{Exprs: []clause.Expression{clause.Lt{Column: "sync_blobs.version", Value: b.Version}}},
	}).Create(&b)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrStaleVersion
	}
	return nil
}

func (s *Store) Blobs(orgID string) ([]SyncBlob, error) {
	var list []SyncBlob
	err := s.DB.Where("org_id = ?", orgID).Order("updated_at ASC").Find(&list).Error
	return list, err
}

func (s *Store) DeleteBlob(orgID, envID string) error {
	return s.DB.Where("org_id = ? AND env_id = ?", orgID, envID).Delete(&SyncBlob{}).Error
}

// BlobKeys 这个团队在对象存储里的全部对象。关掉同步时要一个个删。
func (s *Store) BlobKeys(orgID string) []string {
	list, _ := s.Blobs(orgID)
	out := make([]string, 0, len(list))
	for _, b := range list {
		out = append(out, b.EnvID)
	}
	return out
}
