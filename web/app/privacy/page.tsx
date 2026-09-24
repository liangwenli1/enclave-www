import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "隐私政策",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
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
