package httpapi

import (
	"net/http"
	"strings"
	"time"

	"enclave/api/internal/blob"
	"enclave/api/internal/license"
	"enclave/api/internal/store"

	"github.com/gin-gonic/gin"
)

/* 对象存储：放加密后的登录态（Cookie）。
   密文不经过这里——我们只签一个有时限的地址，客户端直接和对象存储说话。
   凭据和支付密钥一样，由管理员在后台填，加密之后才落库。 */

const (
	keyS3Endpoint = "storage.s3.endpoint"
	keyS3Region   = "storage.s3.region"
	keyS3Bucket   = "storage.s3.bucket"
	keyS3Key      = "storage.s3.access_key"
	keyS3Secret   = "storage.s3.secret_key"
)

// 单个环境的登录态最多这么大。压缩加密之后，正常的 Cookie 包只有几十到几百 KB。
const maxBlobBytes = 5 << 20

func (s *Server) storage() blob.Config {
	return blob.Config{
		Endpoint:  s.plainSetting(keyS3Endpoint),
		Region:    s.plainSetting(keyS3Region),
		Bucket:    s.plainSetting(keyS3Bucket),
		AccessKey: s.plainSetting(keyS3Key),
		SecretKey: s.plainSetting(keyS3Secret),
	}
}

func (s *Server) adminStorage(c *gin.Context) {
	cfg := s.storage()
	ok(c, gin.H{
		"endpoint": cfg.Endpoint, "region": cfg.Region, "bucket": cfg.Bucket,
		"accessKey": hint(cfg.AccessKey), "secretKey": hint(cfg.SecretKey),
		"ready": cfg.Ready(), "maxBytes": maxBlobBytes,
	})
}

func (s *Server) putStorage(c *gin.Context) {
	var in struct{ Endpoint, Region, Bucket, AccessKey, SecretKey string }
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, http.StatusBadRequest, "BAD_REQUEST", "请求内容不是合法的 JSON。")
		return
	}
	endpoint := strings.TrimRight(strings.TrimSpace(in.Endpoint), "/")
	// 正式环境只许 https；本机调试时允许回环和 docker 网桥（172.16/12 私有段）。
	local := strings.HasPrefix(endpoint, "http://127.0.0.1") || strings.HasPrefix(endpoint, "http://172.")
	if endpoint != "" && !strings.HasPrefix(endpoint, "https://") && !local {
		fail(c, http.StatusBadRequest, "BAD_STORAGE", "地址须使用 https（本机调试可使用 http://127.0.0.1）。")
		return
	}
	put := func(key, value string, secret bool) error {
		if secret {
			sealed, err := s.box.Seal(value)
			if err != nil {
				return err
			}
			value = sealed
		}
		return s.store.PutSetting(store.Setting{Key: key, Value: value, Secret: secret})
	}
	var err error
	if endpoint != "" {
		err = put(keyS3Endpoint, endpoint, false)
	}
	if v := strings.TrimSpace(in.Region); err == nil && v != "" {
		err = put(keyS3Region, v, false)
	}
	if v := strings.TrimSpace(in.Bucket); err == nil && v != "" {
		err = put(keyS3Bucket, v, false)
	}
	// 密钥留空 = 不改。要换就填新的。
	if v := strings.TrimSpace(in.AccessKey); err == nil && v != "" {
		err = put(keyS3Key, v, true)
	}
	if v := strings.TrimSpace(in.SecretKey); err == nil && v != "" {
		err = put(keyS3Secret, v, true)
	}
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "保存失败："+err.Error())
		return
	}
	s.adminStorage(c)
}

/* ── 客户端这一侧 ───────────────────────────────────────────────── */

// 这个账号能不能用同步。免费档不含。
func (s *Server) syncAllowed(c *gin.Context) bool {
	o := org(c)
	plan, _ := license.Effective(o.PlanTier, o.SubscriptionExpiresAt, time.Now())
	return plan.Plan != "free"
}

type blobBody struct {
	EnvID   string
	Version int64
	KeyID   string
	Bytes   int64
}

// 要上传：给一个有时限的 PUT 地址。传完客户端再回来登记。
func (s *Server) blobUpload(c *gin.Context) {
	var in blobBody
	if err := c.ShouldBindJSON(&in); err != nil || !docIDRe.MatchString(in.EnvID) || in.Version < 1 {
		badSync(c, "请求内容不完整。")
		return
	}
	if !s.syncAllowed(c) {
		fail(c, http.StatusConflict, "PLAN_NO_SYNC", "免费档不含同步功能。升级后可将登录态加密同步至云端。")
		return
	}
	if in.Bytes > maxBlobBytes {
		fail(c, http.StatusConflict, "BLOB_TOO_BIG", "该环境的登录态超过 5 MB，未同步。可在环境中清理缓存与无用的站点数据。")
		return
	}
	// 操作员用完分配给他的环境，登录态照样要传回来；别人的环境他连密文都拿不到。
	if !s.canSee(c, in.EnvID) {
		fail(c, http.StatusForbidden, "ROLE_FORBIDDEN", "该环境未分配给当前账号。")
		return
	}
	cfg := s.storage()
	url, err := cfg.Presign(http.MethodPut, blob.ObjectKey(org(c).ID, in.EnvID), 15*time.Minute, time.Now())
	if err != nil {
		fail(c, http.StatusServiceUnavailable, "STORAGE_UNAVAILABLE", "云端存储尚未配置，暂时无法同步登录态。")
		return
	}
	ok(c, gin.H{"url": url, "maxBytes": maxBlobBytes})
}

// 传完了：核一遍真实大小（客户端报的不作数），再记下版本。
func (s *Server) blobCommit(c *gin.Context) {
	var in blobBody
	if err := c.ShouldBindJSON(&in); err != nil || !docIDRe.MatchString(in.EnvID) || in.Version < 1 {
		badSync(c, "请求内容不完整。")
		return
	}
	// 登录态用的是这个环境自己那把钥匙。换过了就别再拿旧的往上传。
	if in.KeyID != s.slotKeyID(org(c).ID, store.EnvSlot(in.EnvID)) {
		fail(c, http.StatusConflict, "SYNC_KEY_CHANGED", "该环境的密钥已更换，请重新获取密钥后再同步。")
		return
	}
	if !s.canSee(c, in.EnvID) {
		fail(c, http.StatusForbidden, "ROLE_FORBIDDEN", "该环境未分配给当前账号。")
		return
	}
	cfg := s.storage()
	objectKey := blob.ObjectKey(org(c).ID, in.EnvID)
	size, err := cfg.Size(objectKey, time.Now())
	if err != nil {
		fail(c, http.StatusConflict, "BLOB_MISSING", "云端未找到刚上传的内容，请重试。")
		return
	}
	if size > maxBlobBytes {
		_ = cfg.Delete(objectKey, time.Now())
		fail(c, http.StatusConflict, "BLOB_TOO_BIG", "该环境的登录态超过 5 MB，已丢弃。")
		return
	}
	row := store.SyncBlob{
		OrgID: org(c).ID, EnvID: in.EnvID, Version: in.Version, KeyID: in.KeyID, Bytes: size,
	}
	if err := s.store.PutBlob(row); err != nil {
		fail(c, http.StatusConflict, "STALE_VERSION", "云端已存在更新的版本，请先同步一次再上传。")
		return
	}
	ok(c, gin.H{"bytes": size})
}

// 云端有哪些环境的登录态，各是第几版；要取的那几个附一个有时限的 GET 地址。
func (s *Server) blobList(c *gin.Context) {
	rows, err := s.store.Blobs(org(c).ID)
	if err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "读取失败，请稍后再试。")
		return
	}
	cfg := s.storage()
	now := time.Now()
	seen := s.visible(c)
	out := make([]gin.H, 0, len(rows))
	var total int64
	for _, b := range rows {
		if seen != nil && !seen[b.EnvID] {
			continue
		}
		total += b.Bytes
		item := gin.H{"envId": b.EnvID, "version": b.Version, "keyId": b.KeyID, "bytes": b.Bytes, "updatedAt": b.UpdatedAt.UnixMilli()}
		if url, err := cfg.Presign(http.MethodGet, blob.ObjectKey(org(c).ID, b.EnvID), 15*time.Minute, now); err == nil {
			item["url"] = url
		}
		out = append(out, item)
	}
	ok(c, gin.H{"blobs": out, "totalBytes": total, "maxBytes": maxBlobBytes, "ready": cfg.Ready()})
}

// 删掉一个环境的登录态：环境被删了，或者用户把它改成「只存本机」。
func (s *Server) blobDelete(c *gin.Context) {
	envID := c.Param("id")
	if !docIDRe.MatchString(envID) {
		badSync(c, "环境编号不合法。")
		return
	}
	_ = s.storage().Delete(blob.ObjectKey(org(c).ID, envID), time.Now())
	if err := s.store.DeleteBlob(org(c).ID, envID); err != nil {
		fail(c, http.StatusInternalServerError, "INTERNAL", "删除失败，请稍后再试。")
		return
	}
	ok(c, nil)
}
