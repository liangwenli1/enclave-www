# 部署与运维

## 组成

| 服务 | 是什么 | 端口 |
|---|---|---|
| `www` | Caddy。页面交给 `web`，`/api/*` 交给 `api`，两者同源 | 主机 `127.0.0.1:3011` |
| `web` | 官网，Next.js | 容器网络 `3000` |
| `api` | 云端 API，Go + Gin：账号、订阅、设备绑定、环境名额与启动授权、内核上架、管理接口 | 容器网络 `3012` |
| `postgres` | 账号、订阅、设备、内核、后台设置 | 容器网络 |
| `redis` | 登录会话、限流计数 | 容器网络 |

cloudflared 指到 `http://127.0.0.1:3011`。

## 第一次部署

```bash
./scripts/init-config.sh https://你的域名 你的邮箱
docker compose up -d --build
```

脚本生成两个文件，都不进 git：

- `config.yaml`：对外地址、**主密钥**、管理员邮箱、数据库和 Redis 的地址。
- `secrets/postgres_password`：数据库密码。postgres 容器和 API 读的是同一个文件。

**所有密钥都在文件里，没有一个走环境变量。** 环境变量会被子进程继承、会出现在 `docker inspect`
和各种诊断输出里；文件可以控制谁读得到。

升级：`git pull && docker compose up -d --build`。

## 要备份的三样东西

| 东西 | 在哪 | 丢了会怎样 |
|---|---|---|
| 内核清单签名私钥 | `vendor-data` 卷里的 `license-key.pem` | 已发出的客户端不再接受你上架的内核，必须发新版客户端 |
| 主密钥 | `config.yaml` 的 `master_key` | 管理后台里填过的支付密钥解不开，要重新填一遍 |
| 数据库 | `postgres-data` 卷 | 账号和订阅没了 |

## 管理后台

用 `config.yaml` 里 `admin_emails` 列出的邮箱在官网**照常注册**，登录后账号页会多一个「管理后台」，
地址是 `/admin`。谁是管理员只看这份配置；每个管理接口服务器都会再查一遍，页面只是界面。

后台里有六块：

- **支付通道**：Creem 的环境、API key、Webhook 密钥、三个档位的产品 ID。
- **同步存储**：放加密登录态的对象存储（R2 或任何 S3 兼容的）。
- **发信服务器**：发团队邀请信的 SMTP。没配也能用，邀请链接由所有者自己发。
- **用户与订阅**：看用户；手动开通 / 改档（线下收款、送测试号、支付通道出问题时应急）。
- **内核上架**：见下面。
- **留言**：联系表单收到的内容，包括安全披露。

## 接入 Creem

1. 在 Creem 后台（先用 Test Mode）建三个**订阅**产品：Solo、Pro、Team，记下各自的 `prod_…`。
2. 在 Creem 后台建一个 Webhook，地址填管理后台「支付通道」里显示的那个
   （`https://你的域名/api/webhooks/creem`），记下它的签名密钥。
3. 在管理后台「支付通道」里填：环境、API key、Webhook 密钥、三个产品 ID，保存。
   密钥加密后存数据库；之后页面上只显示末四位，原文不会再从服务器出来。
   **三样都填了**（API key、Webhook 密钥、这一档的产品 ID），官网套餐页上这一档才从「暂未开通」变成「订阅」——
   少了 Webhook 密钥时付款通知验不过签，钱收了档位开不出来，所以不算能买。
4. 用 Creem 的测试卡在账号页订阅一次，确认档位变了；再到「管理订阅」里取消，确认状态变成"已取消"。
5. 切正式：把环境改成「正式」，换成正式的 API key、Webhook 密钥和产品 ID。

官网套餐页上的价格写在 `web/lib/plans.json`（美元 / 月）。**Creem 里三个产品的价格要和它一致**；
额度那几列由 `api/internal/license/site_test.go` 钉住和服务器一致，价格没有办法自动核对，改价时两边一起改。

订阅状态完全由 Webhook 驱动：

| Creem 的事件 | 账号变成 |
|---|---|
| `checkout.completed` `subscription.active` `subscription.paid` `subscription.update` | 对应档位，有效期到这一期结束（续费通知晚到有一天宽限） |
| `subscription.canceled` | 档位不变，到这一期结束为止 |
| `subscription.expired` `subscription.paused` | 回免费档，超出免费档上限的设备解绑 |

签名不对的请求一律拒绝；同一个事件重发只生效一次。认人先看我们放进订阅 metadata 的用户 ID，
再看 Creem 那边的订阅和客户编号——不靠邮箱，邮箱用户在收银台可以改。

## 上架一个内核版本

用户不用重装，工作台启动时（以及之后每 6 小时）会来取一次清单，新版本出现在「内核管理」页。

内核分两类，每一类有自己的上游和一串版本：

| 类 | 上游 | 版本号的样子 |
|---|---|---|
| Chromium 类 | https://github.com/adryfish/fingerprint-chromium/releases | `150.0.1.2` |
| Firefox 类 | https://github.com/daijro/camoufox/releases | `152.0.4-beta.30` |

1. 到对应的上游下载要上架的那个文件。
   **你自己下载、自己算哈希**：这一步就是"由你确认这个文件可以给用户跑"。

   ```bash
   sha256sum ungoogled-chromium_150.0.1.2-1.1_windows_x64.zip      # Windows 上用 Get-FileHash
   stat -c %s ungoogled-chromium_150.0.1.2-1.1_windows_x64.zip     # 字节数
   ```

2. 在管理后台「内核上架」里登记：哪一类、版本号、平台、通道、上游下载地址、SHA256、字节数。每个平台登记一次。
   - 先上「预览」，自己跑过没问题，再用同样的内容登记一次、把通道改成「稳定」
     （稳定版会成为新建环境的默认版本）。
   - 下载地址只接受**这一类**上游仓库的 Release 地址：选了 Firefox 类却填 Chromium 的地址（或者反过来）登记不进来，
     本机服务那边是同一条规则，签了名也不收。
   - Firefox 类的包很大（Windows 约 490 MB，解压后约 1.2 GB），上游自己标的是 beta，建议一直留在「预览」。

3. 下架：已经下载的用户照常能用，界面标"已下架"，删掉后不能再下载；没下载过的用户看不到它了。
   已有的环境**不会**自动换到新版本——换内核等于换浏览器版本，由用户自己在环境页里改。

安装包自带的那个版本永远在列表里，远程清单盖不掉它。

## 签名公钥

服务启动时在日志里打印公钥，也可以直接问：

```bash
curl https://你的域名/api/v1/pubkey
```

它要和 `enclave` 仓库 `crates/host/src/feed.rs` 里的 `VENDOR_PUBLIC_KEY` 一致（本机服务用它验内核清单）。
**换密钥 = 已发出的客户端不再接受你上架的内核**，必须同时发新版客户端。

订阅状态不靠签名：工作台每次新建、启动环境都来问这个服务，数据库里是什么就是什么。

## 打包客户端时要指对地址

在 `enclave` 仓库的 GitHub Actions 变量里设 `ENCLAVE_CLOUD_URL = https://你的域名`（不带路径和结尾的斜杠）。
工作台要登录后才能用，所以这一项是必填的，没有它不出包。客户端只接受 https 地址。

## 发布新版客户端后，更新下载页

下载页只列 `web/lib/release.json` 里登记的安装包；没登记时显示「即将开放下载」，不给任何链接。
安装包的文件名、SHA256、字节数由 `release.yml` 写进 Release 说明，下载页从那里取，**不手抄哈希**：

```bash
# 在任意装了 gh 的机器上（能读 enclave 仓库的 Release）
gh release view v0.10.4 -R liangwenli1/enclave --json tagName,publishedAt,body | node web/scripts/set-release.mjs
git commit -am "Download page: 0.10.4"
docker compose up -d --build web
```

只登记用正式域名打的包（`ENCLAVE_CLOUD_URL` 设好之后打的 tag）：没有域名的包装上去登录不了，不该出现在下载页。
更新日志在 `web/lib/changelog.ts`，按大版本写，只列用户看得到的变化。
