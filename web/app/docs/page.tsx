import type { Metadata } from "next";
import { LocaleLink as Link } from "@/components/locale-link";
import { ArrowRight } from "lucide-react";
import { DOCS, GROUPS } from "@/content/docs";
import { DOCS_EN, GROUPS_EN } from "@/content/docs-en";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return { title: english ? "Documentation" : "文档", description: english ? "Enclave documentation for environments, proxies, automation, encrypted sync, teams, and the local API." : "Enclave 使用文档：环境、代理、自动化、加密同步、团队权限与本机 API。", alternates: { canonical: english ? "/en/docs" : "/zh-cn/docs" } };
}

export default async function DocsIndex() {
  const english = (await getRequestLocale()) === "en";
  const docs = english ? DOCS_EN : DOCS;
  const groups = english ? GROUPS_EN : GROUPS;
  return (
    <main>
      <p className="eyebrow">{english ? "Documentation" : "文档"}</p>
      <h1 className="display-3 mt-3">{english ? "Enclave documentation" : "使用文档"}</h1>
      <p className="lead mt-4 max-w-[36em]">{english ? "From installation to team collaboration, based on the behavior of the current release." : "从安装到团队协作，所有内容均对应当前版本的实际行为。"}</p>
      <Link
        href="/docs/install"
        className="mt-8 flex max-w-[640px] items-center justify-between gap-6 rounded-2xl border border-primary/25 bg-card p-6 shadow-frame transition-colors hover:border-primary/50"
      >
        <span>
          <span className="text-[13px] font-semibold text-primary">{english ? "Start here" : "从这里开始"}</span>
          <span className="mt-1 block text-[19px] font-semibold">{english ? "Install and sign in" : "安装与登录"}</span>
          <span className="mt-1 block text-[14.5px] text-muted-foreground">{english ? "Install Enclave, verify the download, and authorize the workspace." : "下载安装包、核对 SHA256，并在浏览器中确认登录。"}</span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-primary" aria-hidden="true" />
      </Link>
      <div className="mt-12 grid gap-10">
        {groups.map((group) => (
          <section key={group}>
            <h2 className="text-[13px] font-semibold tracking-[0.04em] text-muted-foreground">{group}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {docs.filter((d) => d.group === group).map((d) => (
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
