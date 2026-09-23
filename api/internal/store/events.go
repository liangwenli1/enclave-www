package store

import (
	"time"

	"gorm.io/gorm/clause"
)

/* 操作日志。记在服务器上，不记在本机——记在本机的日志，老板看不到，也没法信。

   记的是"谁、什么时候、在哪台电脑上、对哪个环境做了什么"。
   环境里发生了什么我们一概不知道（那些是密文，也不该知道），
   这里只有我们本来就要经手的那些动作：启动、停止、增删环境、成员变动、钥匙交接。

   不提供删除接口：能被删掉的审计日志没有意义。到期自动清理，别的方式都没有。 */

const (
	// 留多久。同行里 Octo 是 30 天，我们给 90 天——店铺出事往往是一两个月后才发现。
	EventTTL = 90 * 24 * time.Hour
	// 一次最多回多少条。
	EventPageSize = 200
)

type Event struct {
	ID    uint   `gorm:"primaryKey"`
	OrgID string `gorm:"index:idx_events_org_time,priority:1;not null"`
	// 人被移出团队之后，日志还要看得懂，所以邮箱在这里冗余一份。
	UserID   string
	Email    string
	DeviceID string
	// 动作的名字，点分：profile.start / member.remove / sync.rotate …
	Action string `gorm:"index;not null"`
	// 动作落在谁身上：环境编号，或者成员的邮箱。
	Target string
	// 一句补充，给人看的。不放任何密文里的东西。
	Detail    string
	IP        string
	CreatedAt time.Time `gorm:"index:idx_events_org_time,priority:2,sort:desc"`
}

// Record 记一条。失败只当没记上，绝不能因此让用户的操作失败。
func (s *Store) Record(e Event) {
	e.CreatedAt = time.Now()
	_ = s.DB.Create(&e).Error
}

type EventFilter struct {
	UserID string
	Action string
	Before time.Time
	Limit  int
}

func (s *Store) Events(orgID string, f EventFilter) ([]Event, error) {
	q := s.DB.Where("org_id = ?", orgID)
	if f.UserID != "" {
		q = q.Where("user_id = ?", f.UserID)
	}
	if f.Action != "" {
		q = q.Where("action = ?", f.Action)
	}
	if !f.Before.IsZero() {
		q = q.Where("created_at < ?", f.Before)
	}
	limit := f.Limit
	if limit <= 0 || limit > EventPageSize {
		limit = EventPageSize
	}
	var list []Event
	err := q.Order(clause.OrderByColumn{Column: clause.Column{Name: "created_at"}, Desc: true}).
		Limit(limit).Find(&list).Error
	return list, err
}

// PruneEvents 清掉过期的。调用方顺手调一下就行，不值得单起一个定时任务。
func (s *Store) PruneEvents() {
	s.DB.Where("created_at < ?", time.Now().Add(-EventTTL)).Delete(&Event{})
}
