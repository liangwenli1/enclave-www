"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "cn";
import { Brand } from "@/components/brand";
import { LocaleLink as Link } from "@/components/locale-link";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/locale";
import { NAV } from "@/lib/site";

/** 顶栏：左标志，中间导航，右边「登录」是文字，「免费下载」是这一栏唯一的主按钮。 */
const COPY = {
  en: {
    nav: { product: "Product", pricing: "Pricing", docs: "Docs", download: "Download" },
    primaryNav: "Primary navigation",
    signIn: "Sign in",
    download: "Free download",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },
  "zh-cn": {
    nav: { product: "产品", pricing: "套餐", docs: "文档", download: "下载" },
    primaryNav: "主导航",
    signIn: "登录",
    download: "免费下载",
    openMenu: "打开菜单",
    closeMenu: "收起菜单",
  },
} as const;

export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const copy = COPY[locale];
  const active = (href: string) => !href.startsWith("/#") && pathname.includes(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="site-wrap grid h-16 grid-cols-[1fr_auto] items-center md:grid-cols-[1fr_auto_1fr]">
        <Brand />
        <nav aria-label={copy.primaryNav} className="hidden items-center gap-1 md:flex">
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
              {copy.nav[item.key]}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-2">
          <Link href="/account" className="hidden rounded-full px-3.5 py-1.5 text-[14.5px] text-body hover:text-foreground sm:block">
            {copy.signIn}
          </Link>
          <Link href="/download" className={cn(buttonVariants({ size: "sm" }), "h-9 px-4 text-[14px]")}>
            {copy.download}
          </Link>
          <button
            type="button"
            className="-mr-2 grid size-10 place-items-center rounded-full text-foreground hover:bg-accent md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? copy.closeMenu : copy.openMenu}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label={copy.primaryNav} className="border-t border-border bg-background md:hidden">
          <div className="site-wrap grid py-2">
            {[...NAV.map((item) => ({ href: item.href, label: copy.nav[item.key] })), { href: "/account", label: copy.signIn }].map((item) => (
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
