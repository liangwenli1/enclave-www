package httpapi

import (
	"net/http"
	"regexp"

	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
)

/* 文件夹：授权的单位。

   给成员开一个文件夹，里面的环境他全都看得到，之后新建进去的也自动跟着。
   钥匙还是每个环境一把——文件夹只是算出"该给谁发哪几把"的规则。 */

var folderIDRe = regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)

func (s *Server) listFolders(c *gin.Context) {
	o := org(c)
	_ = s.store.EnsureDefaultFolder(o.ID)
	list, _ := s.store.Folders(o.ID)
	// 每个文件夹里有几个环境：界面上删之前要知道会影响多少个。
	profiles, _ := s.store.Profiles(o.ID)
	count := map[string]int{}
	for _, p := range profiles {
		count[p.FolderID]++
	}
	// 操作员只看得到开给他的那几个——文件夹名字本身也是团队的信息。
	seen := map[string]bool{}
	if user(c).Role == store.RoleOperator {
		ids, _ := s.store.AssignedFolders(o.ID, user(c).ID)
		for _, id := range ids {
			seen[id] = true
		}
	}
	out := make([]gin.H, 0, len(list))
	for _, f := range list {
		if user(c).Role == store.RoleOperator && !seen[f.ID] {
			continue
		}
		out = append(out, gin.H{
			"id": f.ID, "name": f.Name, "profiles": count[f.ID],
			"createdAt": f.CreatedAt.UnixMilli(),
		})
	}
	ok(c, gin.H{"folders": out})
}

func (s *Server) putFolder(c *gin.Context) {
	var in struct{ Name string }
	id := c.Param("id")
	if err := c.ShouldBindJSON(&in); err != nil || !folderIDRe.MatchString(id) {
		fail(c, http.StatusBadRequest, "BAD_FOLDER", "文件夹 ID 无效。")
		return
	}
	name := clip(in.Name, 60)
	if name == "" {
		fail(c, http.StatusBadRequest, "BAD_FOLDER", "文件夹名称不能为空。")
		return
	}
	o := org(c)
	_ = s.store.EnsureDefaultFolder(o.ID)
	// 上限拦一下：文件夹是授权单位，几百个就没法管了。
	if list, _ := s.store.Folders(o.ID); len(list) >= 200 {
		exists := false
		for _, f := range list {
			exists = exists || f.ID == id
		}
		if !exists {
			fail(c, http.StatusConflict, "FOLDER_LIMIT", "最多 200 个文件夹。")
			return
		}
	}
	if err := s.store.PutFolder(o.ID, id, name); err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "保存失败，请稍后再试。")
		return
	}
	s.log(c, evFolderPut, id, name)
	ok(c, gin.H{"id": id, "name": name})
}

func (s *Server) deleteFolder(c *gin.Context) {
	o, id := org(c), c.Param("id")
	if id == store.DefaultFolder {
		fail(c, http.StatusConflict, "FOLDER_DEFAULT", "默认文件夹不能删除。")
		return
	}
	// 谁原先看得到这里面的环境，删完之后可能就看不到了——钥匙要跟着收。
	members, _ := s.store.Members(o.ID)
	before := map[string][]string{}
	for _, m := range members {
		if m.Role == store.RoleOperator {
			before[m.ID], _ = s.store.AssignedProfiles(o.ID, m.ID)
		}
	}
	if err := s.store.DeleteFolder(o.ID, id); err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "删除失败，请稍后再试。")
		return
	}
	for uid, was := range before {
		now, _ := s.store.AssignedProfiles(o.ID, uid)
		s.revokeGone(c, uid, was, now)
	}
	s.log(c, evFolderDelete, id, "")
	ok(c, gin.H{"ok": true})
}

/* 环境换文件夹会改变谁看得到它，所以 putProfile 不能只改一个字段。
   换之前先记下每个操作员看得到什么，换完再对一次账，少掉的就收钥匙。 */

// seenByOperators 现在每个操作员看得到哪些环境。
func (s *Server) seenByOperators(orgID string) map[string][]string {
	members, _ := s.store.Members(orgID)
	out := map[string][]string{}
	for _, m := range members {
		if m.Role != store.RoleOperator {
			continue
		}
		out[m.ID], _ = s.store.AssignedProfiles(orgID, m.ID)
	}
	return out
}
