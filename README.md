# Enclave 云端：官网 + API

这个仓库是 Enclave 的云端一侧，自己就能构建和部署，不依赖桌面客户端的仓库（`enclave`）。

| 目录 | 是什么 |
|---|---|
| `web/` | 官网：Next.js（App Router）+ Tailwind + shadcn/ui。按请求渲染，CSP 带 nonce（`web/proxy.ts`） |
| `api/` | 云端 API：Go + Gin + PostgreSQL + Redis。账号、Creem 订阅、设备绑定、环境名额与启动授权、内核上架、管理接口 |
| `Caddyfile` `docker-compose.yml` | Caddy 在最前面：页面交给 `web`，`/api/*` 交给 `api`，两者同源 |

| 服务 | 端口 |
|---|---|
| `www`（Caddy） | 主机 `127.0.0.1:3011` |
| `web`（Next.js） | 仅容器网络 `3000` |
| `api`（Go） | 仅容器网络 `3012`，外界只能经 `/api/*` 访问 |
| `postgres` `redis` | 仅容器网络 |

## 起服务

```bash
./scripts/init-config.sh https://你的域名 你的邮箱      # 生成 config.yaml 和数据库密码，都不进 git
docker compose up -d --build
```

密钥都在文件里，不走环境变量；支付通道（Creem）的密钥由管理员登录后在 `/admin` 里填。
部署、备份、管理后台、接入 Creem、上架内核：见 [docs/deploy.md](docs/deploy.md)。

## 和桌面客户端的约定

两个仓库之间只有四样东西要对得上，构建时互不依赖：

- **公钥**：API 的 Ed25519 公钥内置在客户端里，用来验内核清单（`curl <官网>/api/v1/pubkey` 可以核对）。
- **接口**：客户端的本机服务只调 `/api/v1/*`（设备令牌）。调用方不是浏览器，所以这里不开 CORS。
- **登录页**：客户端打开 `<官网>/device?challenge=…&device=…&name=…`，用户点允许后跳回 `enclave://auth?code=…`。
- **地址**：客户端打包时用 `ENCLAVE_CLOUD_URL` 指向官网域名（必须是 https）。

## 测试

```bash
cd api && go test ./...   # 需要 Go 1.25
cd web && npm run lint && npm run build
```

## 本地改页面

```bash
cd web && npm install && npm run dev      # http://localhost:3000
```

账号页需要账号服务：另开一个终端 `docker compose up -d api www`，然后从 `http://127.0.0.1:3011` 访问。
视觉规范在 `enclave` 仓库的 `DESIGN.md`；颜色令牌在 `web/app/globals.css`，映射到 shadcn/ui 的语义变量上。
