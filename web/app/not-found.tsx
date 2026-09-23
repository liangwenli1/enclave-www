import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "页面不存在",
};

export default function NotFound() {
  return (
    <main className="www-main">
      <section className="www-hero www-hero-page">
        <h1>这个页面不存在</h1>
        <p className="www-lead">地址可能有误，或该页面已迁移。</p>
        <div className="www-actions">
          <Link className={buttonVariants({ size: "lg" })} href="/">
            回到首页
          </Link>
          <Link
            className={buttonVariants({ variant: "outline", size: "lg" })}
            href="/download"
          >
            下载与校验
          </Link>
        </div>
      </section>
    </main>
  );
}
