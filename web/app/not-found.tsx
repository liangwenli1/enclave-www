"use client";

import { LocaleLink as Link } from "@/components/locale-link";
import { useLocale } from "@/components/locale-provider";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  const english = useLocale() === "en";
  return (
    <main className="site-wrap grid min-h-[60vh] content-center justify-items-start py-20">
      <p className="font-mono text-[15px] text-muted-foreground">404</p>
      <h1 className="display-3 mt-3">{english ? "Page not found" : "页面不存在"}</h1>
      <p className="lead mt-4 max-w-[34em]">{english ? "The link may be outdated. Continue from the home page or documentation." : "链接可能已失效。可从首页或文档继续浏览。"}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={buttonVariants()}>
          {english ? "Home" : "返回首页"}
        </Link>
        <Link href="/docs" className={buttonVariants({ variant: "outline" })}>
          {english ? "Documentation" : "查看文档"}
        </Link>
      </div>
    </main>
  );
}
