import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="site-wrap grid min-h-[60vh] content-center justify-items-start py-20">
      <p className="font-mono text-[15px] text-muted-foreground">404</p>
      <h1 className="display-3 mt-3">没有这个页面</h1>
      <p className="lead mt-4 max-w-[34em]">链接可能已经失效。可以从首页或文档重新找起。</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={buttonVariants()}>
          回到首页
        </Link>
        <Link href="/docs" className={buttonVariants({ variant: "outline" })}>
          查看文档
        </Link>
      </div>
    </main>
  );
}
