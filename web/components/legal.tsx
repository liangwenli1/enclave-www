import type { ReactNode } from "react";
import { PageHead } from "@/components/page-head";

/** 条款类页面的壳：标题、生效日期、正文。 */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main>
      <PageHead title={title} lead={`更新于 ${updated}`} />
      <div className="site-wrap py-14 sm:py-16">
        <div className="doc">{children}</div>
      </div>
    </main>
  );
}
