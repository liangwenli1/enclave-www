import { DocsNav } from "@/components/docs-nav";
import { DOCS, GROUPS } from "@/content/docs";
import { DOCS_EN, GROUPS_EN } from "@/content/docs-en";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export default async function DocsLayout({ children }: LayoutProps<"/docs">) {
  const english = (await getRequestLocale()) === "en";
  const docs = english ? DOCS_EN : DOCS;
  const sourceGroups = english ? GROUPS_EN : GROUPS;
  const groups = sourceGroups.map((group) => ({
    group,
    items: docs.filter((d) => d.group === group).map(({ slug, title }) => ({ slug, title })),
  }));
  return (
    <div className="site-wrap grid gap-8 py-10 lg:grid-cols-[220px_1fr] lg:gap-14 lg:py-14">
      <aside className="lg:self-start">
        <DocsNav groups={groups} english={english} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
