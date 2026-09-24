"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export type NavGroup = { group: string; items: { slug: string; title: string }[] };

/** 文档侧栏。宽屏常驻左侧；窄屏收成页面顶部的一个可展开列表。 */
export function DocsNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const list = (
    <nav aria-label="文档目录" className="grid gap-6 text-[14.5px]">
      <Link
        href="/docs"
        aria-current={pathname === "/docs" ? "page" : undefined}
        className={cn("-mx-3 rounded-lg px-3 py-1.5", pathname === "/docs" ? "bg-accent font-medium text-foreground" : "text-body hover:text-foreground")}
      >
        文档首页
      </Link>
      {groups.map((g) => (
        <div key={g.group}>
          <p className="text-[12.5px] font-semibold tracking-[0.04em] text-muted-foreground">{g.group}</p>
          <ul className="mt-2 grid gap-0.5">
            {g.items.map((d) => {
              const href = `/docs/${d.slug}`;
              const active = pathname === href;
              return (
                <li key={d.slug}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "-mx-3 block rounded-lg px-3 py-1.5",
                      active ? "bg-accent font-medium text-foreground" : "text-body hover:text-foreground",
                    )}
                  >
                    {d.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <details className="group rounded-xl border border-border lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
          文档目录
          <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="border-t border-border px-4 py-4">{list}</div>
      </details>
      <div className="hidden lg:sticky lg:top-24 lg:block">{list}</div>
    </>
  );
}
