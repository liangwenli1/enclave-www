import type { Metadata } from "next";
import { LocaleLink as Link } from "@/components/locale-link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DOCS, docBySlug } from "@/content/docs";
import { DOCS_EN, docBySlugEn } from "@/content/docs-en";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata({ params }: PageProps<"/docs/[slug]">): Promise<Metadata> {
  const doc = docBySlug((await params).slug);
  const english = (await getRequestLocale()) === "en";
  const localizedDoc = english ? docBySlugEn((await params).slug) : doc;
  if (!localizedDoc) return {};
  return {
    title: `${localizedDoc.title} · ${english ? "Docs" : "文档"}`,
    description: localizedDoc.summary,
    alternates: { canonical: `/${english ? "en" : "zh-cn"}/docs/${localizedDoc.slug}` },
  };
}

export default async function DocPage({ params }: PageProps<"/docs/[slug]">) {
  const { slug } = await params;
  const english = (await getRequestLocale()) === "en";
  const docs = english ? DOCS_EN : DOCS;
  const doc = english ? docBySlugEn(slug) : docBySlug(slug);
  if (!doc) notFound();
  const i = docs.indexOf(doc);
  const prev = docs[i - 1];
  const next = docs[i + 1];

  return (
    <main>
      <article>
        <p className="text-[13px] font-semibold tracking-[0.04em] text-muted-foreground">{doc.group}</p>
        <h1 className="mt-2 text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[38px]">{doc.title}</h1>
        <p className="lead mt-3">{doc.summary}</p>
        <div className="doc mt-8">{doc.body}</div>
      </article>
      <nav aria-label={english ? "Previous and next article" : "上一篇与下一篇"} className="mt-14 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
        {prev ? (
          <Link href={`/docs/${prev.slug}`} className="rounded-xl border border-border p-4 hover:bg-muted/60">
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              {english ? "Previous" : "上一篇"}
            </span>
            <span className="mt-1 block font-medium">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/docs/${next.slug}`} className="rounded-xl border border-border p-4 text-right hover:bg-muted/60">
            <span className="flex items-center justify-end gap-1.5 text-[13px] text-muted-foreground">
              {english ? "Next" : "下一篇"}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
            <span className="mt-1 block font-medium">{next.title}</span>
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
