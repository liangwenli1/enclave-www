import type { Metadata } from "next";
import { LocaleLink as Link } from "@/components/locale-link";
import { ArrowRight } from "lucide-react";
import { Faq } from "@/components/faq";
import { FingerprintTable } from "@/components/fingerprint-table";
import { Closing, Scenes } from "@/components/home/closing";
import { Facts, Hero } from "@/components/home/hero";
import { Linkage } from "@/components/home/linkage";
import { Product } from "@/components/home/product";
import { SecurityBand } from "@/components/home/security";
import { PlanCards } from "@/components/plan-cards";
import { OfflineNote } from "@/components/plan-action";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return {
    alternates: {
      canonical: english ? "/en" : "/zh-cn",
      languages: { en: "/en", "zh-CN": "/zh-cn", "x-default": "/en" },
    },
  };
}

const FAQ: [string, string][] = [
  [
    "是否能避免账号受限？",
    "不能。Enclave 通过隔离浏览器状态与网络出口降低跨账号关联风险，但账号历史、平台规则与操作行为仍会影响账号状态。",
  ],
  [
    "数据存在哪里？",
    "环境、代理和登录态默认只保存在本机。开启加密同步后，登录态和代理密码在本机加密后才上传，服务器只保存密文。环境名称和内核版本会登记在服务器上，用于统计额度。",
  ],
  [
    "成员离开团队后如何处理？",
    "在账号页移出成员后，其设备将立即解绑，相关环境自动轮换密钥。已同步到本机的数据无法远程收回；如需使 Cookie 失效，应在对应平台撤销全部登录会话。",
  ],
  [
    "免费套餐包含哪些额度？",
    "3 个环境、同时运行 1 个、登录 1 台电脑，不含加密同步。内核的安全更新与付费档相同，批量执行和自动化同样可用。",
  ],
  [
    "支持哪些操作系统？",
    "Windows 10 / 11 与 macOS（Apple Silicon）。安装包的 SHA256 公布在下载页，安装前可以自行核对。",
  ],
];

export default async function Home() {
  const english = (await getRequestLocale()) === "en";
  const faq = english
    ? ([
        ["Can Enclave guarantee that accounts will not be suspended?", "No. No browser can guarantee that. Enclave reduces cross-account linkage by isolating browser state and network exits; account activity must still comply with each platform's rules."],
        ["Where is data stored?", "Environment data, proxies, and login state stay on this computer by default. With encrypted sync enabled, data is encrypted locally before upload, and the server stores ciphertext only."],
        ["What happens when a team member leaves?", "Remove the member from the account page. Their device is revoked immediately and affected environments receive new encryption keys. Revoke active sessions on each platform when existing cookies must be invalidated."],
        ["What are the Free plan limits?", "3 environments, 1 concurrent session, and 1 device. Encrypted sync is not included. Security updates, batch actions, and automation remain available."],
        ["Which systems are supported?", "Windows 10/11 and macOS on Apple Silicon. SHA256 checksums are published on the download page."],
      ] as [string, string][])
    : FAQ;
  return (
    <main>
      <Hero />
      <Facts />
      <Linkage />
      <div className="border-t border-border" />
      <Product />
      <SecurityBand />

      <section id="fingerprints" className="bg-muted py-24 sm:py-28">
        <div className="site-wrap">
          <div className="max-w-[42em]">
            <p className="eyebrow">{english ? "Fingerprint coverage" : "指纹清单"}</p>
            <h2 className="display-3 mt-3">{english ? "Documented from real engine tests" : "只写实测过的"}</h2>
            <p className="lead mt-5">
              {english
                ? "Every item is verified against a real browser engine. Items marked as system-dependent cannot be changed by that engine family."
                : "每一项都在真实内核上完成验证。标记为“跟随本机”的项目由系统决定；需要跨系统配置时，可选择 Firefox 类内核。"}
            </p>
          </div>
          <div className="mt-10">
            <FingerprintTable />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-[13.5px] text-muted-foreground">
            <p>{english ? "Unverified items remain explicitly marked." : "尚未完成验证的项目会保持明确标记。"}</p>
            <Link href="/check" className="inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
              {english ? "Check this browser's fingerprint" : "检测当前浏览器的指纹"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <Scenes />

      <section id="pricing" className="border-t border-border py-24 sm:py-28">
        <div className="site-wrap">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[40em]">
              <p className="eyebrow">{english ? "Pricing" : "套餐"}</p>
              <h2 className="display-3 mt-3">{english ? "Plans based on environment capacity" : "按环境数付费，安装包免费"}</h2>
            </div>
            <Link href="/pricing" className="inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
              {english ? "Compare all plans" : "完整对比"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-10">
            <PlanCards />
          </div>
          <div className="mt-5 grid gap-2">
            <p className="text-[13.5px] text-muted-foreground">
              {english ? "Every plan includes kernel security updates, batch actions, and automation. Concurrent capacity varies by plan." : "所有套餐均包含内核安全更新、批量执行与自动化；同时运行数量由套餐决定。"}
            </p>
            <OfflineNote />
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-border py-24 sm:py-28">
        <div className="site-wrap grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">{english ? "FAQ" : "常见问题"}</p>
            <h2 className="display-3 mt-3">{english ? "Before choosing a plan" : "套餐常见问题"}</h2>
          </div>
          <Faq items={faq} />
        </div>
      </section>

      <Closing />
    </main>
  );
}
