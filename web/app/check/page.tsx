import type { Metadata } from "next";
import { LocaleLink as Link } from "@/components/locale-link";
import { FingerprintTable } from "@/components/fingerprint-table";
import { FingerprintCheck } from "@/components/fp-check";
import { PageHead } from "@/components/page-head";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return {
    title: english ? "Browser Fingerprint Check" : "浏览器指纹检测",
    description: english ? "Inspect the browser signals visible to websites. The check runs locally and uploads no data." : "查看网站可读取的浏览器指纹信号。检测在本机完成，不上传数据。",
    alternates: { canonical: english ? "/en/check" : "/zh-cn/check" },
  };
}

export default async function CheckPage() {
  const english = (await getRequestLocale()) === "en";
  return (
    <main>
      <PageHead
        eyebrow={english ? "Tool" : "工具"}
        title={english ? "Browser fingerprint check" : "浏览器指纹检测"}
        lead={english ? "Inspect the browser signals available to a website. The check runs entirely on this device and uploads no data." : "查看网站可读取的浏览器信号。检测完全在本机执行，不上传任何数据；在 Enclave 环境中打开可核对画像是否生效。"}
      />
      <section className="py-12 sm:py-14">
        <div className="site-wrap">
          <FingerprintCheck />
        </div>
      </section>
      <section className="border-t border-border bg-muted py-20">
        <div className="site-wrap">
          <h2 className="text-[24px] font-semibold tracking-[-0.01em]">{english ? "Signals Enclave can control" : "Enclave 可控制的信号"}</h2>
          <p className="mt-3 max-w-[40em] text-body">
            {english ? "The table reflects verified behavior in both engine families. Items marked “Follows host system” intentionally expose the device value in Chromium-based environments. See " : "下表列出两类内核的实测结果。标记为「跟随本机」的项目会在 Chromium 类环境中读取设备真实值，属于预期行为。详见"}
            <Link href="/docs/fingerprint" className="mx-0.5 text-link hover:underline">
              {english ? "Fingerprint profiles and engines" : "指纹与内核"}
            </Link>
            {english ? "." : "。"}
          </p>
          <div className="mt-8">
            <FingerprintTable />
          </div>
        </div>
      </section>
    </main>
  );
}
