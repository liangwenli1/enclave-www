import type { Metadata } from "next";
import Link from "next/link";
import { FingerprintTable } from "@/components/fingerprint-table";
import { FingerprintCheck } from "@/components/fp-check";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = {
  title: "浏览器指纹检测",
  description: "查看网站能读到的浏览器指纹：User-Agent、时区、语言、屏幕、WebGL、Canvas、字体、WebRTC。在本地检测，不上传任何数据。",
  alternates: { canonical: "/check" },
};

export default function CheckPage() {
  return (
    <main>
      <PageHead
        eyebrow="工具"
        title="浏览器指纹检测"
        lead="这一页在浏览器本地读取网站能看到的指纹信息，不上传任何数据。在 Enclave 的环境里打开，可以核对画像是否生效。"
      />
      <section className="py-12 sm:py-14">
        <div className="site-wrap">
          <FingerprintCheck />
        </div>
      </section>
      <section className="border-t border-border bg-muted py-20">
        <div className="site-wrap">
          <h2 className="text-[24px] font-semibold tracking-[-0.01em]">Enclave 能设置哪些</h2>
          <p className="mt-3 max-w-[40em] text-body">
            下表是两类内核实测后的结果。标「跟随本机」的项在 Chromium 类里读到的是这台电脑的真实值，这是预期行为，详见
            <Link href="/docs/fingerprint" className="mx-0.5 text-link hover:underline">
              指纹与内核
            </Link>
            。
          </p>
          <div className="mt-8">
            <FingerprintTable />
          </div>
        </div>
      </section>
    </main>
  );
}
