import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "安全与法律",
  description: "Enclave 的内核许可证、安全承诺边界与漏洞披露方式。",
};

export default function Page() {
  return (
    <main className="www-main">
      <section className="www-hero www-hero-page">
        <h1>安全与法律</h1>
        <p className="www-lead">
          我们防范什么、不防范什么、使用了哪些开源代码，以及如何向我们报告问题。
        </p>
      </section>

      <section className="www-section">
        <div className="www-section-head">
          <h2>内核许可</h2>
        </div>
        <div className="www-grid www-grid-2">
          <article className="www-card">
            <h3>fingerprint-chromium</h3>
            <p>
              基于 Ungoogled Chromium，BSD-3-Clause 许可证。我们不声称内核 100%
              自研，也不声称已对内核完成完整安全审计。
            </p>
          </article>
          <article className="www-card">
            <h3>内核来源</h3>
            <p>
              仅从上游官方发布通道获取安装包，来源地址、字节数与 SHA256
              均记录在清单中并公示于下载页。
            </p>
          </article>
        </div>
      </section>

      <section className="www-section">
        <div className="www-section-head">
          <h2>我们防范的</h2>
        </div>
        <div className="www-grid www-grid-2">
          <article className="www-card">
            <h3>被替换的内核</h3>
            <p>启动前校验实际执行的文件，哈希不符即拒绝启动。</p>
          </article>
          <article className="www-card">
            <h3>被冒充的安装包</h3>
            <p>
              安装包哈希公示于下载页。正式代码签名证书尚未购买，该项目前依靠用户自行核对哈希。
            </p>
          </article>
          <article className="www-card">
            <h3>本机接口被其他程序或网页调用</h3>
            <p>接口仅监听 127.0.0.1，要求令牌，并限制调用来源。</p>
          </article>
          <article className="www-card">
            <h3>环境间数据串用与代理泄露</h3>
            <p>
              每个环境拥有独立的 user-data 目录；启用代理时关闭 QUIC 与 DoH，WebRTC
              不使用非代理 UDP。代理密码加密存放，不写入日志。
            </p>
          </article>
        </div>
      </section>

      <section className="www-section">
        <div className="www-section-head">
          <h2>我们不承诺的</h2>
        </div>
        <div className="www-grid www-grid-3">
          <article className="www-card">
            <h3>不承诺过任何网站的风控</h3>
            <p>指纹隔离是工具，最终结果取决于具体的使用方式。</p>
          </article>
          <article className="www-card">
            <h3>不承诺防住已被控制的系统</h3>
            <p>操作系统本身被入侵时，本机软件无法提供保护。</p>
          </article>
          <article className="www-card">
            <h3>不承诺覆盖被主动关闭的防护</h3>
            <p>
              主动勾选关闭沙箱后产生的后果，由使用者自行承担。该操作会记入本机审计日志。
            </p>
          </article>
        </div>
      </section>

      <section className="www-section">
        <div className="www-section-head">
          <h2>漏洞披露</h2>
        </div>
        <div className="www-card www-card-narrow">
          <p>
            发现安全问题，请在
            <Link href="/account#contact">账号页的联系表单</Link>
            中选择「安全披露」提交，无需登录。我们将在 3
            个工作日内回复；修复完成前请勿公开细节。
          </p>
        </div>
      </section>
    </main>
  );
}
