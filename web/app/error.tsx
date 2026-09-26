"use client";

import { LocaleLink as Link } from "@/components/locale-link";
import { useLocale } from "@/components/locale-provider";
import { Button, buttonVariants } from "@/components/ui/button";

/* 路由级的错误页。没有它，Next 会用自带的那一页：英文，长得像浏览器崩溃页。 */
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const english = useLocale() === "en";
  return (
    <main className="site-wrap grid min-h-[60vh] content-center justify-items-start py-20">
      <p className="eyebrow">{english ? "Error" : "出错了"}</p>
      <h1 className="display-3 mt-3">{english ? "This page could not be displayed" : "页面暂时无法显示"}</h1>
      <p className="lead mt-4 max-w-[34em]">{english ? "Try again. If the issue continues, contact support and include the reference below." : "请重试。如问题持续出现，请联系支持并附上以下编号。"}</p>
      <p className="mt-3 font-mono text-[13px] text-muted-foreground">{error.digest ?? error.message}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => retry()}>{english ? "Try again" : "重试"}</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          {english ? "Home" : "返回首页"}
        </Link>
      </div>
    </main>
  );
}
