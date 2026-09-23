"use client";

import { Button } from "@/components/ui/button";

/* 路由级的错误页。没有它，Next 会用自带的那一页——文字是英文的，长得像浏览器崩溃页。 */
export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="www-page">
      <section className="www-section">
        <h1>这一页出错了</h1>
        <p className="www-lead">
          页面上出现了未预期的错误。重新加载通常即可恢复；若持续出现，请通过账号页的联系表单反馈。
        </p>
        <p className="www-mono text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-4">
          <Button size="lg" onClick={() => reset()}>
            重新加载
          </Button>
        </div>
      </section>
    </main>
  );
}
