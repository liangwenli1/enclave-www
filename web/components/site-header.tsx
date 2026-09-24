"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "cn";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { NAV } from "@/lib/site";

/** 顶栏：左标志，中间导航，右边「登录」是文字，「免费下载」是这一栏唯一的主按钮。 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => !href.startsWith("/#") && pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="site-wrap grid h-16 grid-cols-[1fr_auto] items-center md:grid-cols-[1fr_auto_1fr]">
        <Brand />
        <nav aria-label="主导航" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[14.5px] text-body transition-colors hover:text-foreground",
                active(item.href) && "font-medium text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-2">
          <Link href="/account" className="hidden rounded-full px-3.5 py-1.5 text-[14.5px] text-body hover:text-foreground sm:block">
            登录
          </Link>
          <Link href="/download" className={cn(buttonVariants({ size: "sm" }), "h-9 px-4 text-[14px]")}>
            免费下载
          </Link>
          <button
            type="button"
            className="-mr-2 grid size-10 place-items-center rounded-full text-foreground hover:bg-accent md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "收起菜单" : "打开菜单"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="主导航" className="border-t border-border bg-background md:hidden">
          <div className="site-wrap grid py-2">
            {[...NAV, { href: "/account", label: "登录" }].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-border py-3.5 text-[16px] text-foreground last:border-0"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
