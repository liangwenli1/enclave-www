import { DocsNav } from "@/components/docs-nav";
import { DOCS, GROUPS } from "@/content/docs";

export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  const groups = GROUPS.map((group) => ({
    group,
    items: DOCS.filter((d) => d.group === group).map(({ slug, title }) => ({ slug, title })),
  }));
  return (
    <div className="site-wrap grid gap-8 py-10 lg:grid-cols-[220px_1fr] lg:gap-14 lg:py-14">
      <aside className="lg:self-start">
        <DocsNav groups={groups} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
