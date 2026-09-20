# Enclave 官网

静态站 + 许可证服务。官网本体没有构建步骤：改 `site/` 下的 HTML / CSS / JS 就是全部。
视觉规范见 [DESIGN.md](DESIGN.md)，和工作台共用同一套 token。

对外发布的文件**只有 `site/`**，整个目录挂进容器。`.env`、`Caddyfile`、
这份 README 都在仓库根目录，不会被当成静态资源发出去。

## 组成

| 服务 | 是什么 | 端口 |
|---|---|---|
| `www` | Caddy 托管静态页，`/api/*` 反代到许可证服务 | 主机 `127.0.0.1:3011` |
| `api` | 许可证服务（账号、档位、设备绑定、签名许可证） | 仅容器网络 `3012` |

许可证服务的源码在 **enclave 仓库** 的 `apps/vendor`，这里只负责把它跑起来。

## 起服务

```bash
# 1. 先构建许可证服务镜像（在 enclave 仓库根目录）
docker build -t enclave-vendor:latest apps/vendor

# 2. 回到本仓库，配置管理员令牌
echo "ENCLAVE_ADMIN_TOKEN=$(openssl rand -hex 32)" > .env

# 3. 起来
docker compose up -d
```

cloudflared 指到 `http://127.0.0.1:3011`。

首次启动时许可证服务会生成 Ed25519 签名密钥，并在日志里打印公钥：

```bash
docker compose logs api | grep 'public key'
```

**这个公钥要填进工作台**（`enclave` 仓库的 `src/lib/license/public-key.ts`），
客户端用它验签许可证。换密钥等于让所有已签发的许可证失效。

## 开通付费档

用户在账号页提交申请后：

```bash
curl -X POST http://127.0.0.1:3011/api/admin/plan \
  -H "x-admin-token: $ENCLAVE_ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","plan":"pro","expiresAt":1790000000000}'
```

`expiresAt` 是毫秒时间戳，省略表示不过期。查看待处理的申请和留言：

```bash
curl -H "x-admin-token: $ENCLAVE_ADMIN_TOKEN" http://127.0.0.1:3011/api/admin/requests
```

## 本地预览（不带账号功能）

```bash
python3 -m http.server 8000 --directory site
```

账号页会显示"账号服务暂时不可用"，其余页面正常。
