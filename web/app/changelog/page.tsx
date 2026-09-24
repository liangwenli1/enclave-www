import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
import { CHANGELOG } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "更新日志",
  description: "Enclave 各版本带来的变化。",
  alternates: { canonical: "/changelog" },
};

export default function ChangelogPage() {
  return (
    <main>
      <PageHead eyebrow="更新日志" title="新版本带来了什么" />
      <section className="py-14 sm:py-16">
        <div className="site-wrap grid gap-14">
          {CHANGELOG.map((e) => (
            <article key={e.version} className="grid gap-4 md:grid-cols-[200px_1fr] md:gap-10">
              <div>
                <p className="font-mono text-[22px] font-medium">{e.version}</p>
                <p className="mt-1 text-[13.5px] text-muted-foreground">
                  <time dateTime={e.date}>{e.date}</time>
                </p>
              </div>
              <div className="border-t border-border pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-10">
                <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{e.title}</h2>
                <ul className="mt-5 grid gap-3 text-body">
                  {e.items.map((item) => (
                    <li key={item} className="grid grid-cols-[14px_1fr] gap-2.5">
                      <i className="mt-[11px] size-1.5 rounded-full bg-primary" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
