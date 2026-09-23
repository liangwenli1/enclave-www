package httpapi

import (
	"crypto/sha256"
	"time"

	"enclave/api/internal/blob"
	"errors"
	"net/http"
	"regexp"

	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
)

/* 同步密钥的交接。服务器在这里只做三件事：保管包装后的密钥、转交、以及记住每台设备的公钥。
   它自己拆不开任何一份包装——数据密钥的明文从不离开用户的设备。

   新设备怎么拿到密钥：
     新设备 ──公钥──> 服务器 ──> 老设备看到它和那 6 位数字
     用户在两台设备上核对数字一致 → 老设备用新设备的公钥包住密钥 ──> 服务器 ──> 新设备拆开
   服务器就算把公钥换成自己的，两边的数字也对不上，用户不会点允许。 */

// base64（标准字母表），够放一把 X25519 公钥或一小段密文。
var b64Re = regexp.MustCompile(`^[A-Za-z0-9+/]{16,512}={0,2}$`)

func badSync(c *gin.Context, message string) {
	fail(c, http.StatusBadRequest, "BAD_SYNC", message)
}

// / 两边都按这个算：同一把公钥得到同一串数字。服务器换了公钥，数字就对不上。
func pairingDigits(publicKey string) string {
	sum := sha256.Sum256(append([]byte("enclave-sync-pairing-v1:"), []byte(publicKey)...))
	n := (uint32(sum[0])<<16 | uint32(sum[1])<<8 | uint32(sum[2])) % 1_000_000
	return string([]byte{
		byte('0' + n/100000%10), byte('0' + n/10000%10), byte('0' + n/1000%10),
		byte('0' + n/100%10), byte('0' + n/10%10), byte('0' + n%10),
	})
}

// 这台设备现在处在同步的哪一步。工作台据此显示"开启同步"、"等待另一台电脑批准"还是"已在同步"。
func (s *Server) syncStatus(c *gin.Context) {
	o, d := org(c), device(c)
	out := gin.H{
		"ok": true, "enabled": false, "hasKey": false, "deviceId": d.ID,
		"role": user(c).Role, "holdsTeamKey": holdsTeamKey(c),
	}
	key, err := s.store.SyncKey(o.ID)
	if err != nil {
		ok(c, out)
		return
	}
	out["enabled"] = true
	out["keyId"] = key.KeyID
	out["recovery"] = gin.H{"salt": key.RecoverySalt, "params": key.RecoveryParams, "box": key.RecoveryBox}
	if e, err := s.store.Envelope(o.ID, d.ID); err == nil && e.KeyID == key.KeyID {
		out["hasKey"] = true
		out["envelope"] = gin.H{"ephemeral": e.Ephemeral, "box": e.Box}
	}
	// 还没拿到密钥的设备要让另一台核对这串数字。
	if d.SyncPublicKey != "" {
		out["digits"] = pairingDigits(d.SyncPublicKey)
	}
	ok(c, out)
}

type keyBody struct{ PublicKey string }

// 登记这台设备的公钥。新装的电脑登录后第一件事。
func (s *Server) syncRegister(c *gin.Context) {
	var in keyBody
	if err := c.ShouldBindJSON(&in); err != nil || !b64Re.MatchString(in.PublicKey) {
		badSync(c, "公钥不合法。")
		return
	}
	if err := s.store.SetDeviceKey(device(c).ID, user(c).ID, in.PublicKey); err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "登记失败，请稍后再试。")
		return
	}
	ok(c, gin.H{"digits": pairingDigits(in.PublicKey)})
}

type enableBody struct {
	KeyID                                     string
	RecoverySalt, RecoveryParams, RecoveryBox string
	Ephemeral, Box                            string
}

// 开启同步（或者换一把密钥）：交上恢复码那一份包装，和这台设备自己的那一份。
// 换密钥会让别的设备手里的旧包装全部作废，它们要重新被批准。
func (s *Server) syncEnable(c *gin.Context) {
	var in enableBody
	if err := c.ShouldBindJSON(&in); err != nil {
		badSync(c, "请求内容不完整。")
		return
	}
	// 免费档不含同步。
	if !s.syncAllowed(c) {
		fail(c, http.StatusConflict, "PLAN_NO_SYNC", "免费档不含同步功能。升级后，环境与登录态可加密同步至云端。")
		return
	}
	for _, v := range []string{in.RecoverySalt, in.RecoveryBox, in.Ephemeral, in.Box} {
		if !b64Re.MatchString(v) {
			badSync(c, "包装的格式不对。")
			return
		}
	}
	if len(in.KeyID) < 8 || len(in.KeyID) > 64 || len(in.RecoveryParams) > 120 {
		badSync(c, "密钥编号或派生参数不合法。")
		return
	}
	err := s.store.EnableSync(org(c).ID,
		store.SyncKey{KeyID: in.KeyID, RecoverySalt: in.RecoverySalt, RecoveryParams: in.RecoveryParams, RecoveryBox: in.RecoveryBox},
		store.SyncEnvelope{DeviceID: device(c).ID, Ephemeral: in.Ephemeral, Box: in.Box})
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "开启失败，请稍后再试。")
		return
	}
	s.log(c, evSyncEnable, "", "")
	ok(c, gin.H{"keyId": in.KeyID})
}

// 还在等着被批准的设备：本账号下登记了公钥、但手里还没有当前这把密钥的。
func (s *Server) syncPending(c *gin.Context) {
	o, self := org(c), device(c)
	key, err := s.store.SyncKey(o.ID)
	if err != nil {
		fail(c, http.StatusConflict, "SYNC_OFF", "该账号尚未开启同步。")
		return
	}
	list, _ := s.store.DevicesOfOrg(o.ID)
	operators := s.operatorIDs(o.ID)
	out := make([]gin.H, 0)
	for _, d := range list {
		if d.ID == self.ID || d.SyncPublicKey == "" {
			continue
		}
		// 操作员的电脑也要在这里露面（所有者要核对数字、点允许），
		// 但它拿到的不是团队密钥，而是一把把单独的环境钥匙。
		// 判断它批准过没有：看那把大家共用的钥匙发给它没有。
		operator := operators[d.UserID]
		if operator {
			if g, err := s.store.GrantsFor(o.ID, d.ID); err == nil {
				shared, _ := s.store.Slot(o.ID, store.SharedSlot)
				for _, one := range g {
					if shared != nil && one.Slot == store.SharedSlot && one.KeyID == shared.KeyID {
						operator = false // 已经批准过了
					}
				}
			}
			if !operator {
				continue
			}
		} else if e, err := s.store.Envelope(o.ID, d.ID); err == nil && e.KeyID == key.KeyID {
			continue
		}
		out = append(out, gin.H{
			"deviceId": d.ID, "name": d.Name, "publicKey": d.SyncPublicKey,
			"digits": pairingDigits(d.SyncPublicKey), "lastSeenAt": d.LastSeenAt.UnixMilli(),
			"operator": operators[d.UserID],
		})
	}
	ok(c, gin.H{"devices": out, "keyId": key.KeyID})
}

type approveBody struct {
	DeviceID, Ephemeral, Box string
}

// 老设备批准新设备：把用新设备公钥包好的密钥交上来。服务器只是转交。
func (s *Server) syncApprove(c *gin.Context) {
	var in approveBody
	if err := c.ShouldBindJSON(&in); err != nil || !b64Re.MatchString(in.Ephemeral) || !b64Re.MatchString(in.Box) {
		badSync(c, "请求内容不完整。")
		return
	}
	o := org(c)
	key, err := s.store.SyncKey(o.ID)
	if err != nil {
		fail(c, http.StatusConflict, "SYNC_OFF", "该账号尚未开启同步。")
		return
	}
	// 只能批准自己团队里的设备。
	list, _ := s.store.DevicesOfOrg(o.ID)
	operators := s.operatorIDs(o.ID)
	found := false
	for _, d := range list {
		if d.ID == in.DeviceID && d.SyncPublicKey != "" {
			if operators[d.UserID] {
				fail(c, http.StatusConflict, "OPERATOR_DEVICE",
					"这是操作员的电脑，不能把团队密钥给它。它只会收到分配给他的那几个环境的钥匙。")
				return
			}
			found = true
		}
	}
	if !found {
		fail(c, http.StatusNotFound, "NO_DEVICE", "该设备不存在，或尚未登记公钥。")
		return
	}
	e := store.SyncEnvelope{OrgID: o.ID, DeviceID: in.DeviceID, KeyID: key.KeyID, Ephemeral: in.Ephemeral, Box: in.Box}
	if err := s.store.PutEnvelope(e); err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "提交失败，请稍后再试。")
		return
	}
	s.log(c, evSyncApprove, in.DeviceID, "")
	ok(c, nil)
}

// 关掉同步。云端存的密文一起删（没有密钥，它们对谁都只是乱码）。
func (s *Server) syncDisable(c *gin.Context) {
	o := org(c)
	// 对象存储里的登录态也删掉：没有密钥它们对谁都只是乱码，留着白占地方。
	cfg := s.storage()
	for _, envID := range s.store.BlobKeys(o.ID) {
		_ = cfg.Delete(blob.ObjectKey(o.ID, envID), time.Now())
	}
	if err := s.store.DisableSync(o.ID); err != nil && !errors.Is(err, store.ErrNoSyncKey) {
		fail(c, http.StatusInternalServerError, "INTERNAL", "关闭失败，请稍后再试。")
		return
	}
	ok(c, nil)
}

/* ── 加密之后的环境和代理 ─────────────────────────────────────────
   服务器只按编号存取密文，看不到里面。同一条同时被两台电脑改时，版本小的那次会被挡下来。 */

var docIDRe = regexp.MustCompile(`^[A-Za-z0-9_:-]{1,80}$`)

// 一条文档归哪个槽位管：环境各归各的；代理和代理密码共用一把
// （操作员也要用代理，所以密码必须到得了他的电脑上）。
func docSlot(kind, id string) string {
	if kind == "environment" {
		return store.EnvSlot(id)
	}
	return store.SharedSlot
}

// 能同步的三类。secret 是代理密码：密文里是密码本身，服务器解不开。
func knownKind(kind string) bool {
	// workflow 是自动化流程：团队资产，和代理一样走共用的那把钥匙。
	return kind == "environment" || kind == "proxy" || kind == "secret" || kind == "workflow"
}

func (s *Server) docsPull(c *gin.Context) {
	list, err := s.store.Docs(org(c).ID)
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "读取失败，请稍后再试。")
		return
	}
	// 操作员只拿得到分配给他的那几个环境的密文，别人的根本不下发。
	// 代理是例外：服务器看不见环境里绑的是哪个代理（那是密文），所以代理照单全发。
	// 代理密码本来就不上云，他拿到的只是地址和用户名。
	seen := s.visible(c)
	out := make([]gin.H, 0, len(list))
	for _, d := range list {
		if seen != nil && d.Kind == "environment" && !seen[d.ID] {
			continue
		}
		out = append(out, gin.H{
			"kind": d.Kind, "id": d.ID, "version": d.Version, "keyId": d.KeyID,
			"box": d.Box, "deleted": d.Deleted, "updatedAt": d.UpdatedAt.UnixMilli(),
		})
	}
	ok(c, gin.H{"docs": out})
}

type docBody struct {
	Kind, ID, KeyID, Box string
	Version              int64
	Deleted              bool
}

func (s *Server) docsPush(c *gin.Context) {
	var in struct{ Docs []docBody }
	if err := c.ShouldBindJSON(&in); err != nil || len(in.Docs) == 0 || len(in.Docs) > 200 {
		badSync(c, "一次最多送 200 条。")
		return
	}
	if _, err := s.store.SyncKey(org(c).ID); err != nil {
		fail(c, http.StatusConflict, "SYNC_OFF", "该账号尚未开启同步。")
		return
	}
	stale := make([]string, 0)
	for _, d := range in.Docs {
		if !knownKind(d.Kind) || !docIDRe.MatchString(d.ID) || d.Version < 1 {
			badSync(c, "条目的编号、类型或版本不合法。")
			return
		}
		// 每条用的是它自己那个槽位的钥匙：环境用自己的，代理用共用的那一把。
		// 钥匙换过之后，拿旧钥匙加密的东西别再往上送——别的设备解不开。
		if d.KeyID != s.slotKeyID(org(c).ID, docSlot(d.Kind, d.ID)) {
			fail(c, http.StatusConflict, "SYNC_KEY_CHANGED", "该记录的密钥已更换，请重新获取密钥后再同步。")
			return
		}
		if len(d.Box) > store.MaxDocBytes || (!d.Deleted && d.Box == "") {
			badSync(c, "内容为空或者太大。")
			return
		}
		row := store.SyncDoc{
			OrgID: org(c).ID, Kind: d.Kind, ID: d.ID, Version: d.Version,
			KeyID: d.KeyID, Box: d.Box, Deleted: d.Deleted,
		}
		if err := s.store.PutDoc(row); errors.Is(err, store.ErrStaleVersion) {
			// 服务器上那条更新：告诉客户端哪几条要先拉下来。
			stale = append(stale, d.Kind+"/"+d.ID)
		} else if err != nil {
			fail(c, http.StatusInternalServerError, "INTERNAL", "保存失败，请稍后再试。")
			return
		}
	}
	ok(c, gin.H{"stale": stale})
}
