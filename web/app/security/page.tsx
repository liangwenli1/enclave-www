import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = {
  title: "安全",
  description: "Enclave 的数据放在哪里、加密同步怎么工作、团队成员移出后会发生什么，以及如何报告安全问题。",
  alternates: { canonical: "/security" },
};

const WHERE: [string, string, string][] = [
  ["环境的指纹画像与设置", "本机", "开启同步后加密上传，服务器只存密文"],
  ["Cookie 与登录态", "本机", "开启同步后，停止环境时加密上传"],
  ["代理地址与代理密码", "本机（密码加密保存）", "开启同步后加密上传；界面读不回密码明文"],
  ["浏览记录、缓存、localStorage", "本机", "不上传"],
  ["环境的编号、名称、内核版本", "服务器", "用于统计环境名额"],
  ["账号邮箱、登录的电脑、操作日志", "服务器", "操作日志保留 90 天"],
];

export default function SecurityPage() {
  return (
    <main>
      <PageHead
        eyebrow="安全"
        title="数据在本机，同步的只有密文"
        lead="Enclave 的浏览器运行在本机。需要上云的部分，在本机加密之后才离开这台电脑；服务器没有解开的钥匙。"
      />
      <div className="site-wrap py-14 sm:py-16">
        <div className="doc">
          <h2>数据放在哪里</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>数据</th>
                  <th>存放位置</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {WHERE.map(([what, where, note]) => (
                  <tr key={what}>
                    <td>{what}</td>
                    <td>{where}</td>
                    <td>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>加密同步</h2>
          <ul>
            <li>加密用的数据密钥随机生成，保存在系统钥匙串（Windows 凭据管理器、macOS 钥匙串）里，平时不需要输入任何口令。</li>
            <li>每条同步数据用 AES-256-GCM 单独加密，并绑定账号、类型、编号与版本：把一条密文挪给另一条、拿旧版本冒充新版本，都解不开。</li>
            <li>新电脑取得密钥，需要已有的一台电脑点「允许」并核对 6 位数字。数字由两台电脑各自根据公钥计算，服务器无法替换。</li>
            <li>恢复码只显示一次，用于手边没有旧电脑时找回密钥；服务器上保存的是用恢复码加密后的密钥包装。</li>
          </ul>

          <h2>团队</h2>
          <ul>
            <li>每个环境有自己的一把密钥。没有分配给操作员的环境，服务器不会把密文发给这位操作员。</li>
            <li>移出成员后，其电脑立即解绑，经手过的环境在后台更换密钥，此后新的内容无法再解开。</li>
            <li>已经同步到成员电脑上的内容无法收回。要让其中的 Cookie 失效，需要在各平台执行「退出所有设备」。</li>
          </ul>

          <h2>本机</h2>
          <ul>
            <li>工作台与本机服务之间用每次启动随机生成的令牌通信，同一台电脑上的其他程序无法调用。</li>
            <li>内核清单由官方签名发布；每次启动内核前校验文件哈希，被改动过的内核拒绝启动。</li>
            <li>代理由本机服务接入，账号密码不出现在浏览器的启动参数里；域名交给代理解析，本机不做 DNS 查询。</li>
            <li>给脚本用的本机 API 默认关闭，使用独立的令牌，并拒绝一切来自网页的请求。</li>
          </ul>

          <h2>做不到的</h2>
          <p>
            Enclave 让平台看不出多个账号来自同一台电脑，但不能保证账号不被封：账号本身的操作是否合规，仍然决定它的命运。坐在电脑前的人有意复制浏览器数据，任何软件都拦不住。
          </p>

          <h2>报告安全问题</h2>
          <p>
            发现安全问题，请通过<Link href="/contact">联系我们</Link>选择「安全披露」提交，写明复现步骤。确认后会尽快修复，并在更新日志中说明。
          </p>
        </div>
      </div>
    </main>
  );
}
