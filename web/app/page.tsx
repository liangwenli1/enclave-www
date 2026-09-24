import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FAQ: [string, string][] = [
  [
    "能保证账号不被封吗？",
    "不能，任何承诺「保证不封」的说法都不可信。Enclave 让平台看不出多个账号来自同一台电脑；账号本身的操作是否合规，仍然决定它会不会被封。",
  ],
  [
    "数据存在哪里？",
    "环境、代理和登录态默认只保存在本机。开启加密同步后，登录态和代理密码在本机加密后才上传，服务器只保存密文。环境名称和内核版本会登记在服务器上，用于统计额度。",
  ],
  [
    "员工离职了怎么办？",
    "在账号页将其移出团队：对应的电脑立即解绑，其经手过的环境自动更换密钥。已经同步到那台电脑上的内容无法收回；要让其中的 Cookie 失效，需要在各平台执行「退出所有设备」。",
  ],
  [
    "免费版有什么限制？",
    "3 个环境、同时运行 1 个、登录 1 台电脑，不含加密同步。内核的安全更新与付费档相同，批量执行和自动化同样可用。",
  ],
  [
    "支持哪些系统？",
    "Windows 10 / 11 与 macOS（Apple Silicon）。安装包的 SHA256 公布在下载页，安装前可以自行核对。",
  ],
];

export default function Home() {
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
            <p className="eyebrow">指纹清单</p>
            <h2 className="display-3 mt-3">只写实测过的</h2>
            <p className="lead mt-5">
              每一格都在真实内核上测过。标「跟随本机」的，是这类内核本身改不了的项；需要跨系统的画像时，选 Firefox 类。
            </p>
          </div>
          <div className="mt-10">
            <FingerprintTable />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-[13.5px] text-muted-foreground">
            <p>「尚未实测」的项，测过之前不打勾。</p>
            <Link href="/check" className="inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
              检测当前浏览器的指纹
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
              <p className="eyebrow">套餐</p>
              <h2 className="display-3 mt-3">按环境数付费，安装包免费</h2>
            </div>
            <Link href="/pricing" className="inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
              完整对比
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-10">
            <PlanCards />
          </div>
          <div className="mt-5 grid gap-2">
            <p className="text-[13.5px] text-muted-foreground">
              每一档都能下载内核的安全更新；批量执行与自动化各档都有，同时运行数按档位。
            </p>
            <OfflineNote />
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-border py-24 sm:py-28">
        <div className="site-wrap grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">常见问题</p>
            <h2 className="display-3 mt-3">购买之前</h2>
          </div>
          <Faq items={FAQ} />
        </div>
      </section>

      <Closing />
    </main>
  );
}
