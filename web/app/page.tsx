import type { Metadata } from "next";
import Link from "next/link";
import { Ledger } from "@/components/ledger";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  description:
    "内核运行在本机。每个环境拥有独立的 Cookie、指纹与出口，启动前校验哈希，不符即拒启。",
};

export default function Page() {
  return (
    <main className="www-main">
      <section className="www-hero">
        <h1>一台电脑，很多个互不相认的浏览器。</h1>
        <p className="www-lead">
          每个环境拥有独立的指纹、Cookie 与出口
          IP，全部运行在本机。店铺、广告账户、社媒矩阵各自独立，
          网站无法看出它们来自同一个人。
        </p>
        <div className="www-actions">
          <Link className={buttonVariants({ size: "lg" })} href="/download">
            下载
          </Link>
          <Link
            className={buttonVariants({ variant: "outline", size: "lg" })}
            href="/pricing"
          >
            看套餐
          </Link>
        </div>
        <p className="www-note">
          安装包免费，额度由账号解锁。支持 Windows 与 macOS（Apple Silicon）。
        </p>
      </section>

      <Ledger />

      <section className="www-section">
        <div className="www-section-head">
          <h2>它和「网页版指纹浏览器」的区别</h2>
        </div>
        <div className="www-grid www-grid-3">
          <article className="www-card">
            <h3>浏览器运行在本机</h3>
            <p>
              并非在我们的服务器上运行 Chrome 再将画面传回。内核进程、user-data
              目录与调试端口均在本机，调试端口仅监听 127.0.0.1。
            </p>
          </article>
          <article className="www-card">
            <h3>一个环境一套画像</h3>
            <p>
              种子锁定后重启保持稳定。WebRTC 默认不暴露真实 IP；启用代理时关闭
              QUIC 与 DoH，避免绕过代理直连。
            </p>
          </article>
          <article className="www-card">
            <h3>失败就说失败</h3>
            <p>
              哈希不符、内核缺失、沙箱不可用、调试握手失败，各有对应原因码，并停留在错误状态，
              不会在失败时仍显示 Running。
            </p>
          </article>
        </div>
      </section>

      <section className="www-section">
        <div className="www-section-head">
          <h2>六步开始</h2>
          <p>从注册到本机打开第一个环境窗口</p>
        </div>
        <div className="www-steps">
          <div className="www-step">
            <b>01</b>
            <span>注册账号，免费档含 3 个环境。</span>
          </div>
          <div className="www-step">
            <b>02</b>
            <span>下载安装包，核对 SHA256 后安装。</span>
          </div>
          <div className="www-step">
            <b>03</b>
            <span>打开工作台登录，额度随账号同步。</span>
          </div>
          <div className="www-step">
            <b>04</b>
            <span>内核页一键准入，自动下载并校验。</span>
          </div>
          <div className="www-step">
            <b>05</b>
            <span>创建环境、配置代理、锁定指纹并启动。</span>
          </div>
          <div className="www-step">
            <b>06</b>
            <span>本机打开独立内核窗口，开始工作。</span>
          </div>
        </div>
      </section>

      <section className="www-section">
        <div className="www-section-head">
          <h2>可核对的事实</h2>
          <p>此处仅列出可验证的内容</p>
        </div>
        <div className="www-stats">
          <div className="www-stat">
            <b>127.0.0.1</b>
            <span>
              内核调试端口与本机接口的唯一监听地址；接口需令牌，不接受网页跨域调用。
            </span>
          </div>
          <div className="www-stat">
            <b>SHA256</b>
            <span>
              内核与安装包的哈希全部公示在下载页，启动前逐次校验实际执行的文件。
            </span>
          </div>
          <div className="www-stat">
            <b>BSD-3</b>
            <span>
              内核基于 Ungoogled Chromium，许可证公开。我们不声称内核 100% 自研。
            </span>
          </div>
        </div>
      </section>

      <section className="www-cta">
        <h2>先核哈希，再安装。</h2>
        <p>
          下载页公示安装包与内核的完整 SHA256
          与字节数。安装前花十秒核对一遍，这是无需依赖我们即可完成的最有效验证。
        </p>
        <div className="www-actions">
          <Link className={buttonVariants({ size: "lg" })} href="/download">
            去下载页
          </Link>
        </div>
      </section>

      <section className="www-section">
        <div className="www-section-head">
          <h2>我们不承诺什么</h2>
        </div>
        <div className="www-grid www-grid-2">
          <article className="www-card">
            <h3>不承诺过任何网站的风控</h3>
            <p>
              指纹隔离是工具，不是保证。任何声称「保证通过某站风控」的说法都不可信，我们也不作此承诺。
            </p>
          </article>
          <article className="www-card">
            <h3>不承诺防住已经被控的电脑</h3>
            <p>
              操作系统本身一旦被入侵，本机运行的任何软件都无法提供保护。我们防范的是恶意内核包、环境间数据串用、代理泄露这些具体问题。
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
