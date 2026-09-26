import type { Metadata } from "next";
import { LocaleLink as Link } from "@/components/locale-link";
import { PageHead } from "@/components/page-head";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return {
    title: english ? "Security" : "安全",
    description: english
      ? "How Enclave stores data, protects encrypted sync, and handles team access."
      : "Enclave 如何存储数据、保护加密同步并管理团队访问。",
    alternates: { canonical: english ? "/en/security" : "/zh-cn/security" },
  };
}

const WHERE: [string, string, string][] = [
  ["环境的指纹画像与设置", "本机", "开启同步后加密上传，服务器只存密文"],
  ["Cookie 与登录态", "本机", "开启同步后，停止环境时加密上传"],
  ["代理地址与代理密码", "本机（密码加密保存）", "开启同步后加密上传；界面读不回密码明文"],
  ["浏览记录、缓存、localStorage", "本机", "不上传"],
  ["环境的编号、名称、内核版本", "服务器", "用于统计环境名额"],
  ["账号邮箱、登录的电脑、操作日志", "服务器", "操作日志保留 90 天"],
];

const WHERE_EN: [string, string, string][] = [
  ["Fingerprint profile and environment settings", "On device", "Encrypted before upload when sync is enabled"],
  ["Cookies and sessions", "On device", "Encrypted and uploaded when the environment stops, if sync is enabled"],
  ["Proxy address and credentials", "On device", "Encrypted before upload; the password cannot be read back in the interface"],
  ["History, cache, and localStorage", "On device", "Never uploaded"],
  ["Environment ID, name, and engine version", "Server", "Used to enforce plan limits"],
  ["Account email, signed-in devices, and activity logs", "Server", "Activity logs are retained for 90 days"],
];

export default async function SecurityPage() {
  const english = (await getRequestLocale()) === "en";
  const rows = english ? WHERE_EN : WHERE;
  return (
    <main>
      <PageHead
        eyebrow={english ? "Security" : "安全"}
        title={english ? "Local by default. Encrypted when synced." : "默认保存在本机，同步前完成加密"}
        lead={english ? "Browser environments run on the device. Data selected for sync is encrypted before it leaves, and the server never receives the decryption key." : "浏览器环境在本机运行。需要同步的数据离开设备前已完成加密，服务器不持有解密密钥。"}
      />
      <div className="site-wrap py-14 sm:py-16">
        <div className="doc">
          <h2>{english ? "Where data is stored" : "数据存储位置"}</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{english ? "Data" : "数据"}</th>
                  <th>{english ? "Location" : "存放位置"}</th>
                  <th>{english ? "Details" : "说明"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([what, where, note]) => (
                  <tr key={what}>
                    <td>{what}</td>
                    <td>{where}</td>
                    <td>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>{english ? "Encrypted sync" : "加密同步"}</h2>
          {english ? (
            <ul>
              <li>Data keys are generated at random and stored in the operating system keychain.</li>
              <li>Each record is encrypted independently with AES-256-GCM and bound to its account, type, ID, and version.</li>
              <li>Adding a device requires approval from an existing device and verification of a six-digit code derived from both public keys.</li>
              <li>The one-time recovery code restores access when no approved device is available. The server stores only a wrapped copy of the key.</li>
            </ul>
          ) : (
            <ul>
              <li>数据密钥随机生成并保存在系统钥匙串中，日常使用无需重复输入口令。</li>
              <li>每条同步数据使用 AES-256-GCM 独立加密，并绑定账号、类型、编号与版本，避免密文被替换或回滚。</li>
              <li>新设备获取密钥前，需由已登录设备批准并核对 6 位数字；服务器无法替换该校验结果。</li>
              <li>恢复码仅显示一次，用于没有可用旧设备时恢复密钥。服务器仅保存由恢复码加密的密钥封装。</li>
            </ul>
          )}

          <h2>{english ? "Team access" : "团队访问"}</h2>
          {english ? (
            <ul>
              <li>Each environment has its own key. Operators receive ciphertext only for environments assigned to them.</li>
              <li>Removing a member unlinks their devices immediately and rotates keys for affected environments.</li>
              <li>Previously synced local data cannot be recalled. Revoke active sessions directly in the relevant third-party services.</li>
            </ul>
          ) : (
            <ul>
              <li>每个环境使用独立密钥。未分配给操作员的环境不会向其设备下发密文。</li>
              <li>成员移出后，其设备立即解绑，相关环境在后台轮换密钥。</li>
              <li>已同步到成员设备的本地数据无法远程收回。如需使 Cookie 失效，应在对应平台撤销登录会话。</li>
            </ul>
          )}

          <h2>{english ? "On-device safeguards" : "本机防护"}</h2>
          {english ? (
            <ul>
              <li>The desktop app and local service communicate with a fresh token generated on every launch.</li>
              <li>Engine manifests are signed, and file hashes are verified before each launch.</li>
              <li>Proxy credentials are handled by the local service and never exposed in browser launch arguments.</li>
              <li>The local automation API is disabled by default, uses a separate token, and rejects browser-originated requests.</li>
            </ul>
          ) : (
            <ul>
              <li>工作台与本机服务使用每次启动时随机生成的令牌通信。</li>
              <li>内核清单由官方签名发布，启动前校验文件哈希；被修改的内核将被拒绝启动。</li>
              <li>代理凭据由本机服务处理，不写入浏览器启动参数；域名解析交由代理完成。</li>
              <li>本机自动化 API 默认关闭，启用后使用独立令牌，并拒绝来自网页的请求。</li>
            </ul>
          )}

          <h2>{english ? "Scope and limitations" : "适用范围与限制"}</h2>
          <p>
            {english ? "Enclave reduces cross-account linkage caused by shared browser signals. It cannot guarantee that an account will avoid restrictions: account history, platform policy, and operating behavior still apply. Software also cannot prevent a person with device access from intentionally copying local data." : "Enclave 用于降低共享浏览器信号导致的跨账号关联风险，但不保证账号不受平台限制。账号历史、平台规则与操作行为仍会影响结果；任何软件也无法阻止拥有设备访问权限的人主动复制本地数据。"}
          </p>

          <h2>{english ? "Report a security issue" : "报告安全问题"}</h2>
          <p>
            {english ? <>Use the <Link href="/contact">contact form</Link>, select “Security disclosure,” and include clear reproduction steps. Confirmed issues will be prioritized and documented in the changelog when appropriate.</> : <>请通过<Link href="/contact">联系表单</Link>选择「安全披露」，并提供完整复现步骤。确认后的问题将优先处理，并在适当情况下记录于更新日志。</>}
          </p>
        </div>
      </div>
    </main>
  );
}
