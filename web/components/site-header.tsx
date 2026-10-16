"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "cn";
import { Brand } from "@/components/brand";
import { LocaleLink as Link } from "@/components/locale-link";
import { buttonVariants } from "@/components/ui/button";
import { localeFromPath, type Locale } from "@/lib/i18n/locale";
import { RELEASE } from "@/lib/release";
import { NAV } from "@/lib/site";

/** 顶栏：左标志，中间导航，右边「登录」是文字。这一栏的按钮用描边，页面正文里再放实心按钮。 */
const COPY = {
  en: {
    nav: { product: "Product", pricing: "Pricing", docs: "Docs", download: "Download" },
    primaryNav: "Primary navigation",
    signIn: "Sign in",
    download: "Free download",
    register: "Create account",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },
  "zh-cn": {
    nav: { product: "产品", pricing: "套餐", docs: "文档", download: "下载" },
    primaryNav: "主导航",
    signIn: "登录",
    download: "免费下载",
    register: "注册账号",
    openMenu: "打开菜单",
    closeMenu: "收起菜单",
  },
} as const;

export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");
  const copy = COPY[locale];
  const here = barePath(pathname);
  const active = (href: string) => {
    if (href.startsWith("/#")) return here === "/" && hash === href.slice(1);
    return here === href || here.startsWith(`${href}/`);
  };
  const cta = RELEASE
    ? { href: "/download", label: copy.download }
    : { href: "/account#register", label: copy.register };

  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);

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
          <Link href={cta.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-9 px-4 text-[14px]")}>
            {cta.label}
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
                aria-current={active(item.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "border-b border-border py-3.5 text-[16px] last:border-0",
                  active(item.href) ? "font-medium text-foreground" : "text-foreground",
                )}
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

function barePath(pathname: string): string {
  const locale = localeFromPath(pathname);
  if (!locale) return pathname || "/";
  return pathname.slice(locale.length + 1) || "/";
}
