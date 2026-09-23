import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "套餐",
  description: "安装包免费，按环境数订阅。内核安全更新对所有档位开放。",
};

export default function Page() {
  return (
    <main className="www-main">
      <section className="www-hero www-hero-page">
        <h1>按环境数订阅。</h1>
        <p className="www-lead">
          安装包不收费，功能由账号额度解锁。内核的安全更新面向所有套餐开放，
          不会将已修复漏洞的内核限制在更高档位。
        </p>
      </section>

      <section className="www-section www-plans">
        <div className="www-scroll">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>
                  <b>免费</b>注册就有
                </th>
                <th>
                  <b>Solo</b>个人使用
                </th>
                <th className="is-pick">
                  <b>Pro</b>多台设备与脚本接入
                </th>
                <th>
                  <b>Team</b>含成员席位
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>环境数量</td>
                <td>3</td>
                <td>50</td>
                <td className="is-pick">200</td>
                <td>200 起</td>
              </tr>
              <tr>
                <td>同时运行</td>
                <td>1</td>
                <td>3</td>
                <td className="is-pick">8</td>
                <td>8</td>
              </tr>
              <tr>
                <td>成员席位</td>
                <td>1 人</td>
                <td>1 人</td>
                <td className="is-pick">1 人</td>
                <td>6 人</td>
              </tr>
              <tr>
                <td>可登录设备</td>
                <td>1</td>
                <td>1</td>
                <td className="is-pick">2</td>
                <td>每人 1 台</td>
              </tr>
              <tr>
                <td>成员权限</td>
                <td>—</td>
                <td>—</td>
                <td className="is-pick">—</td>
                <td>按文件夹授权成员；操作员无法查看代理密码，也无法导出</td>
              </tr>
              <tr>
                <td>脚本接口（Puppeteer / Playwright）</td>
                <td>不含</td>
                <td>只读</td>
                <td className="is-pick">可启动和停止</td>
                <td>可启动与停止</td>
              </tr>
              <tr>
                <td>环境导出与导入</td>
                <td>有</td>
                <td>有</td>
                <td className="is-pick">有</td>
                <td>有</td>
              </tr>
              <tr>
                <td></td>
                <td>
                  <Link
                    className={buttonVariants({
                      variant: "outline",
                      size: "lg",
                    })}
                    href="/account"
                  >
                    注册
                  </Link>
                </td>
                <td>
                  <Link
                    className={buttonVariants({
                      variant: "outline",
                      size: "lg",
                    })}
                    href="/account#upgrade"
                  >
                    申请开通
                  </Link>
                </td>
                <td className="is-pick">
                  <Link
                    className={buttonVariants({ size: "lg" })}
                    href="/account#upgrade"
                  >
                    申请开通
                  </Link>
                </td>
                <td>
                  <Link
                    className={buttonVariants({
                      variant: "outline",
                      size: "lg",
                    })}
                    href="/account#contact"
                  >
                    联系我们
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="www-note u-mt-4">
          付费套餐按环境数与设备数报价：在账号页提交申请，我们将在一个工作日内回复具体价格与开通方式。
          需要更多环境或私有部署，同样通过该入口联系我们。
        </p>
      </section>

      <section className="www-section">
        <div className="www-section-head">
          <h2>额度如何生效</h2>
        </div>
        <div className="www-grid www-grid-3">
          <article className="www-card">
            <h3>订阅一变，立刻生效</h3>
            <p>
              新建与启动环境前，工作台都会向服务器确认一次。升级、续订、到期均无需等待同步，也无需重新登录。
            </p>
          </article>
          <article className="www-card">
            <h3>所有设备合并计算</h3>
            <p>
              环境数与同时运行数按账号计算，而非按设备计算。同一环境在同一时刻只能在一台设备上打开，避免两端同时写入导致数据损坏。
            </p>
          </article>
          <article className="www-card">
            <h3>服务器仅用于计数</h3>
            <p>
              我们仅登记环境名称与内核版本，用于统计额度。指纹、代理与 Cookie
              始终保存在本机，我们无法读取。
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
