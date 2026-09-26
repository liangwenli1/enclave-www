import type { Metadata } from "next";
import { LocaleLink as Link } from "@/components/locale-link";
import { LegalPage } from "@/components/legal";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return { title: english ? "Privacy Policy" : "隐私政策", alternates: { canonical: english ? "/en/privacy" : "/zh-cn/privacy" } };
}

export default async function PrivacyPage() {
  const english = (await getRequestLocale()) === "en";
  if (english) return (
    <LegalPage title="Privacy Policy" updated="2026-09-24">
      <p>Enclave browser environments run on the device. This policy explains which data the account service stores and why. Browsing activity inside an environment is not included.</p>
      <h2>Data stored by the service</h2>
      <div className="table-scroll"><table><thead><tr><th>Data</th><th>Purpose</th></tr></thead><tbody>
        <tr><td>Email and password hash</td><td>Authentication. Plain-text passwords are never stored.</td></tr>
        <tr><td>Signed-in device name, ID, and last-seen time</td><td>Enforce device limits and support remote unlinking.</td></tr>
        <tr><td>Environment ID, name, engine version, and folder</td><td>Enforce plan limits and grant team access by folder.</td></tr>
        <tr><td>Activity action, actor, device, IP address, and time</td><td>Provide a 90-day activity log to owners and administrators.</td></tr>
        <tr><td>Synced environment, proxy, and session data</td><td>Stored only after on-device encryption. The server cannot decrypt it.</td></tr>
        <tr><td>Subscription status and checkout customer ID</td><td>Activate and renew paid plans. Creem processes payment details.</td></tr>
        <tr><td>Contact email and message</td><td>Respond to support requests.</td></tr>
        <tr><td>IP address</td><td>Rate-limit sign-in attempts and prevent abuse.</td></tr>
      </tbody></table></div>
      <h2>Data the service does not store</h2>
      <p>The pages visited and actions taken inside an environment, or plain-text cookies, proxy passwords, and fingerprint profiles. When sync is enabled, supported data exists on the server only as ciphertext.</p>
      <h2>Service providers</h2>
      <ul><li>Creem processes subscription payments.</li><li>Object-storage providers store encrypted session data.</li><li>Email providers deliver team invitations and service messages.</li></ul>
      <p>Enclave does not sell personal data or use it for advertising.</p>
      <h2>Cookies</h2><p>The website uses only cookies required for authentication and session security. It does not use analytics or advertising cookies.</p>
      <h2>Access, correction, and deletion</h2>
      <p>Use the <Link href="/contact">contact form</Link> from the account email address to request access, correction, or deletion. Activity logs are removed automatically after the retention period.</p>
      <h2>Changes</h2><p>Policy changes are published on this page with an updated effective date.</p>
    </LegalPage>
  );
  return (
    <LegalPage title="隐私政策" updated="2026-09-24">
      <p>
        Enclave 的浏览器运行在本机。本政策说明为了提供账号服务，服务器上会有哪些数据、用来做什么；环境里浏览的内容不在其中。
      </p>
      <h2>服务器上有的数据</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>数据</th>
              <th>用途</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>邮箱、密码的哈希值</td>
              <td>登录。密码原文不保存。</td>
            </tr>
            <tr>
              <td>登录的电脑：名称、设备编号、最后在线时间</td>
              <td>统计设备数量，供账号页解绑。</td>
            </tr>
            <tr>
              <td>环境的编号、名称、内核版本、所在文件夹</td>
              <td>统计环境名额，按文件夹向团队成员授权。</td>
            </tr>
            <tr>
              <td>操作日志：动作、操作人、电脑、IP、时间</td>
              <td>供所有者与管理员查看，保留 90 天。</td>
            </tr>
            <tr>
              <td>同步数据（环境、代理、登录态）</td>
              <td>在本机加密后上传，服务器只存密文，无法解开。</td>
            </tr>
            <tr>
              <td>订阅状态与收银台的客户编号</td>
              <td>开通和续期付费档。卡号等付款信息由 Creem 处理，不经过我们的服务器。</td>
            </tr>
            <tr>
              <td>联系表单：邮箱与留言内容</td>
              <td>回复咨询。</td>
            </tr>
            <tr>
              <td>访问 IP</td>
              <td>限制频繁的登录尝试，防止滥用。</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2>服务器上没有的数据</h2>
      <p>环境里浏览的网页与操作、Cookie 与代理密码的明文、指纹画像的明文。开启同步时它们只以密文形式存在，没有解开的钥匙。</p>
      <h2>与第三方共享</h2>
      <ul>
        <li>Creem：处理订阅付款。</li>
        <li>对象存储服务商：保存加密后的登录态，只接触密文。</li>
        <li>邮件发送服务：发送团队邀请邮件。</li>
      </ul>
      <p>我们不出售任何用户数据，也不用于广告。</p>
      <h2>Cookie</h2>
      <p>官网只使用维持登录所必需的会话 Cookie，不使用统计或广告类 Cookie。</p>
      <h2>查询、更正与删除</h2>
      <p>
        需要查询、更正或删除账号数据，请通过<Link href="/contact">联系我们</Link>提交，并使用账号邮箱联系以便核实身份。操作日志在保留期满后自动清理。
      </p>
      <h2>政策的变更</h2>
      <p>本政策更新后在本页公布并更新日期。</p>
    </LegalPage>
  );
}
