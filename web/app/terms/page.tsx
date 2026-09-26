import type { Metadata } from "next";
import { LocaleLink as Link } from "@/components/locale-link";
import { LegalPage } from "@/components/legal";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return { title: english ? "Terms of Service" : "服务条款", alternates: { canonical: english ? "/en/terms" : "/zh-cn/terms" } };
}

export default async function TermsPage() {
  const english = (await getRequestLocale()) === "en";
  if (english) return (
    <LegalPage title="Terms of Service" updated="2026-09-24">
      <p>These terms apply to the Enclave desktop application and the account services provided through tapzm.com (together, the “Service”). Creating an account or using the Service means accepting these terms.</p>
      <h2>1. Service</h2><p>The Service includes the on-device multi-environment browser workspace and online account, entitlement, device, team, and encrypted-sync features. Browser environments run on the user&apos;s device.</p>
      <h2>2. Accounts</h2><ul><li>Registration requires a working email address. Account holders are responsible for securing their credentials and for activity under their account.</li><li>Team owners are responsible for the members they invite.</li><li>Device, environment, and concurrency limits follow the selected plan.</li></ul>
      <h2>3. Acceptable use</h2><p>The Service must be used in compliance with applicable law. It may not be used for fraud, account theft, unauthorized system access, malware distribution, or other unlawful activity.</p><p>Third-party sites set their own terms. Users remain responsible for complying with those terms and for activity performed through their accounts. The Service does not guarantee that an account will avoid restrictions.</p>
      <h2>4. Subscriptions and payment</h2><ul><li>Paid plans renew monthly at the prices shown on the <Link href="/pricing">pricing page</Link>. Creem processes payments.</li><li>Subscriptions may be cancelled from the account page. Access continues through the current billing period, then returns to the free plan.</li><li>See the <Link href="/refund">Refund Policy</Link> for eligibility.</li></ul>
      <h2>5. Availability</h2><p>Creating or starting an environment requires a connection to verify entitlement. Existing browser sessions continue during maintenance or a network interruption, but new environments cannot be created or started. Continuous availability is not guaranteed.</p>
      <h2>6. Data</h2><p>Environment data is stored on the user&apos;s device and should be backed up as appropriate. See the <Link href="/privacy">Privacy Policy</Link> for account-service data.</p>
      <h2>7. Limitation of liability</h2><p>To the extent permitted by law, the Service is provided as is. Enclave is not liable for indirect losses arising from use or inability to use the Service. Aggregate liability is limited to fees paid by the account during the previous 12 months.</p>
      <h2>8. Suspension and termination</h2><p>Accounts that violate these terms may be suspended or terminated. Users may stop using the Service at any time.</p>
      <h2>9. Changes</h2><p>Changes are published on this page with an updated date. Material changes affecting paid-plan benefits will be announced in advance.</p>
      <h2>10. Contact</h2><p>Questions may be submitted through the <Link href="/contact">contact form</Link>.</p>
    </LegalPage>
  );
  return (
    <LegalPage title="服务条款" updated="2026-09-24">
      <p>
        本条款适用于 Enclave 工作台软件以及 tapzm.com 提供的账号服务（以下合称「本服务」）。注册账号或使用本服务，即表示同意本条款。
      </p>
      <h2>1. 服务内容</h2>
      <p>本服务包括：在本机运行的多环境浏览器工作台；账号、额度、设备、团队与加密同步等在线服务。浏览器始终运行在用户自己的电脑上。</p>
      <h2>2. 账号</h2>
      <ul>
        <li>注册需要一个可以收信的邮箱。账号的密码由账号持有人保管，账号下发生的操作由账号持有人负责。</li>
        <li>团队的所有者对其邀请的成员在团队内的使用负责。</li>
        <li>每个账号可登录的电脑数、环境数与同时运行数以所选档位为准。</li>
      </ul>
      <h2>3. 使用规范</h2>
      <p>使用本服务须遵守适用的法律法规。不得利用本服务从事欺诈、盗用他人账号、未经授权访问计算机系统、传播恶意程序等活动。</p>
      <p>
        各网站与平台有各自的用户协议。遵守这些协议、以及账号在平台上的操作所产生的后果，由用户自行承担。本服务不保证任何账号不被平台限制或封禁。
      </p>
      <h2>4. 订阅与付款</h2>
      <ul>
        <li>
          付费档按月订阅、自动续费，价格以<Link href="/pricing">套餐页</Link>为准。付款由 Creem 处理。
        </li>
        <li>可以随时在账号页取消订阅。取消后，本期结束之前仍按原档位使用，到期后回到免费档。</li>
        <li>
          退款规则见<Link href="/refund">退款政策</Link>。
        </li>
      </ul>
      <h2>5. 服务的可用性</h2>
      <p>
        新建与启动环境需要连接服务器确认额度。服务器维护或网络中断期间，已经打开的浏览器不受影响，但不能新建或启动环境。我们会尽力保持服务可用，但不承诺不中断。
      </p>
      <h2>6. 数据</h2>
      <p>
        环境数据保存在用户的电脑上，建议自行备份。我们如何处理账号相关的数据，见<Link href="/privacy">隐私政策</Link>。
      </p>
      <h2>7. 责任限制</h2>
      <p>
        在法律允许的范围内，本服务按现状提供。对于因使用或无法使用本服务造成的间接损失，我们不承担责任；我们承担的责任总额，不超过该账号在此前 12 个月内为本服务支付的费用。
      </p>
      <h2>8. 暂停与终止</h2>
      <p>违反本条款的账号，我们可以暂停或终止其服务。用户可以随时停止使用本服务。</p>
      <h2>9. 条款的变更</h2>
      <p>条款更新后在本页公布并更新日期；涉及付费档权益的重大变更，会提前通知。</p>
      <h2>10. 联系</h2>
      <p>
        对本条款有疑问，请通过<Link href="/contact">联系我们</Link>提交。
      </p>
    </LegalPage>
  );
}
