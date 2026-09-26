import type { ReactNode } from "react";
import { PageHead } from "@/components/page-head";
import { getRequestLocale } from "@/lib/i18n/request-locale";

/** 条款类页面的壳：标题、生效日期、正文。 */
export async function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const english = (await getRequestLocale()) === "en";
  return (
    <main>
      <PageHead title={title} lead={`${english ? "Updated" : "更新于"} ${updated}`} />
      <div className="site-wrap py-14 sm:py-16">
        <div className="doc">{children}</div>
      </div>
    </main>
  );
}
