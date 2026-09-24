"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

/* 路由级的错误页。没有它，Next 会用自带的那一页：英文，长得像浏览器崩溃页。 */
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="site-wrap grid min-h-[60vh] content-center justify-items-start py-20">
      <p className="eyebrow">出错了</p>
      <h1 className="display-3 mt-3">这一页没能显示出来</h1>
      <p className="lead mt-4 max-w-[34em]">重试通常就能恢复。持续出现时，请通过联系我们反馈，并附上下面这行编号。</p>
      <p className="mt-3 font-mono text-[13px] text-muted-foreground">{error.digest ?? error.message}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => retry()}>重试</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          回到首页
        </Link>
      </div>
    </main>
  );
}
