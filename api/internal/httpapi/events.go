package httpapi

import (
	"net/http"
	"strconv"
	"time"

	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
)

/* 操作日志。谁能看：所有者和管理员。操作员看不到——他看得到的话，
   就能知道自己有没有被盯着，这条日志也就失去了一半意义。 */

// 动作的名字集中在这里，别处只引用不自己拼字符串。
const (
	evProfileStart  = "profile.start"
	evProfileDenied = "profile.denied"
	evProfileStop   = "profile.stop"
	evProfileLost   = "profile.lost"
	evProfileCreate = "profile.create"
	evProfileDelete = "profile.delete"
	evDeviceLogin   = "device.login"
	evDeviceRemove  = "device.remove"
	evMemberInvite  = "member.invite"
	evMemberJoin    = "member.join"
	evMemberRole    = "member.role"
	evMemberRemove  = "member.remove"
	evMemberAssign  = "member.assign"
	evFolderPut     = "folder.put"
	evFolderDelete  = "folder.delete"
	evSyncEnable    = "sync.enable"
	evSyncApprove   = "sync.approve"
	evSyncRotate    = "sync.rotate"
	evPlanChange    = "plan.change"
)

// 给界面用的中文说法。服务器这边只存动作名，翻译放一处。
var eventLabels = map[string]string{
	evProfileStart:  "打开环境",
	evProfileDenied: "打开被拒",
	evProfileStop:   "关闭环境",
	evProfileLost:   "被另一台接管",
	evProfileCreate: "新建环境",
	evFolderPut:     "新建或改名文件夹",
	evFolderDelete:  "删除文件夹",
	evProfileDelete: "删除环境",
	evDeviceLogin:   "电脑登录",
	evDeviceRemove:  "解绑电脑",
	evMemberInvite:  "邀请成员",
	evMemberJoin:    "成员加入",
	evMemberRole:    "改成员角色",
	evMemberRemove:  "移出团队",
	evMemberAssign:  "分配环境",
	evSyncEnable:    "开启同步",
	evSyncApprove:   "批准电脑",
	evSyncRotate:    "更换钥匙",
	evPlanChange:    "改档位",
}

// 从请求里记一条。用户和设备能认出来就带上，认不出来就留空。
func (s *Server) log(c *gin.Context, action, target, detail string) {
	e := store.Event{Action: action, Target: target, Detail: detail, IP: c.ClientIP()}
	if u, ok := c.Get("user"); ok {
		user := u.(*store.User)
		e.UserID, e.Email, e.OrgID = user.ID, user.Email, user.OrgID
	}
	if o, ok := c.Get("org"); ok {
		e.OrgID = o.(*store.Organization).ID
	}
	if d, ok := c.Get("device"); ok {
		e.DeviceID = d.(*store.Device).ID
	}
	if e.OrgID == "" {
		return // 认不出是哪个团队的事，不记——宁可少一条，也不要一条挂不上的。
	}
	s.store.Record(e)
}

func (s *Server) listEvents(c *gin.Context) {
	f := store.EventFilter{
		UserID: c.Query("user"),
		Action: c.Query("action"),
	}
	if n, err := strconv.Atoi(c.Query("limit")); err == nil {
		f.Limit = n
	}
	// 翻页：把上一页最后一条的时间传回来。
	if ms, err := strconv.ParseInt(c.Query("before"), 10, 64); err == nil && ms > 0 {
		f.Before = time.UnixMilli(ms)
	}
	list, err := s.store.Events(org(c).ID, f)
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "读取失败，请稍后再试。")
		return
	}
	// 顺手清一次过期的，不值得为此单起一个定时任务。
	go s.store.PruneEvents()

	names := map[string]string{}
	if devices, err := s.store.DevicesOfOrg(org(c).ID); err == nil {
		for _, d := range devices {
			names[d.ID] = d.Name
		}
	}
	out := make([]gin.H, 0, len(list))
	for _, e := range list {
		out = append(out, gin.H{
			"at": e.CreatedAt.UnixMilli(), "action": e.Action,
			"label": eventLabels[e.Action], "email": e.Email, "target": e.Target,
			"detail": e.Detail, "device": names[e.DeviceID], "ip": e.IP,
		})
	}
	ok(c, gin.H{"events": out, "days": int(store.EventTTL.Hours() / 24)})
}
