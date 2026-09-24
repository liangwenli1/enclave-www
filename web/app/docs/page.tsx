import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DOCS, GROUPS } from "@/content/docs";

export const metadata: Metadata = {
  title: "文档",
  description: "Enclave 使用文档：安装与登录、指纹与内核、代理与出口对齐、批量执行、自动化、加密同步、团队权限与本机 API。",
  alternates: { canonical: "/docs" },
};

export default function DocsIndex() {
  return (
    <main>
      <p className="eyebrow">文档</p>
      <h1 className="display-3 mt-3">使用文档</h1>
      <p className="lead mt-4 max-w-[36em]">从安装到团队协作。每一篇写的都是当前版本的实际行为。</p>
      <Link
        href="/docs/install"
        className="mt-8 flex max-w-[640px] items-center justify-between gap-6 rounded-2xl border border-primary/25 bg-card p-6 shadow-frame transition-colors hover:border-primary/50"
      >
        <span>
          <span className="text-[13px] font-semibold text-primary">从这里开始</span>
          <span className="mt-1 block text-[19px] font-semibold">安装与登录</span>
          <span className="mt-1 block text-[14.5px] text-muted-foreground">下载安装包、核对 SHA256、在浏览器里确认登录。</span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-primary" aria-hidden="true" />
      </Link>
      <div className="mt-12 grid gap-10">
        {GROUPS.map((group) => (
          <section key={group}>
            <h2 className="text-[13px] font-semibold tracking-[0.04em] text-muted-foreground">{group}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {DOCS.filter((d) => d.group === group).map((d) => (
                <Link key={d.slug} href={`/docs/${d.slug}`} className="rounded-xl border border-border p-5 transition-colors hover:border-input hover:bg-muted/60">
                  <span className="block text-[16px] font-semibold">{d.title}</span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-muted-foreground">{d.summary}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
