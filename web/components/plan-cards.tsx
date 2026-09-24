import Link from "next/link";
import { cn } from "cn";
import { PlanAction } from "@/components/plan-action";
import { buttonVariants } from "@/components/ui/button";
import { API_LABEL, FEATURED, PLAN_FOR, PLANS, type SitePlan } from "@/lib/plans";

/* 四档并排，只强调推荐的一档（海军蓝）。数字来自 lib/plans.json，和服务器执行的额度一致。 */

const rows: [string, (p: SitePlan) => string][] = [
  ["环境数量", (p) => `${p.envLimit}`],
  ["同时运行", (p) => `${p.concurrent}`],
  ["每人可登录电脑", (p) => `${p.deviceLimit} 台`],
  ["成员席位", (p) => `${p.seats} 人`],
  ["加密同步", (p) => (p.plan === "free" ? "—" : "包含")],
  ["本机 API", (p) => API_LABEL[p.api]],
];

export function PlanCards() {
  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-2 lg:grid-cols-4">
      {PLANS.map((p, i) => {
        const featured = p.plan === FEATURED;
        return (
          <div
            key={p.plan}
            className={cn(
              "flex flex-col p-6 sm:p-7",
              i > 0 && "border-t border-border sm:border-t-0",
              i % 2 === 1 && "sm:border-l",
              i >= 2 && "sm:border-t lg:border-t-0",
              i > 0 && "lg:border-l",
              featured && "border-transparent bg-navy text-navy-foreground",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[17px] font-semibold">{p.name}</h3>
              {featured ? (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-[12px] font-medium text-primary-foreground">推荐</span>
              ) : null}
            </div>
            <p className={cn("mt-1.5 min-h-[3em] text-[13.5px] leading-relaxed", featured ? "text-navy-muted" : "text-muted-foreground")}>
              {PLAN_FOR[p.plan]}
            </p>
            <p className="mt-4 font-mono text-[40px] leading-none font-medium tracking-[-0.03em]">
              ${p.price}
              <span className={cn("ml-1.5 font-sans text-[14px] font-normal tracking-normal", featured ? "text-navy-muted" : "text-muted-foreground")}>
                {p.price ? "/ 月" : "永久免费"}
              </span>
            </p>
            <div className="mt-6">
              {p.plan === "free" ? (
                <Link href="/download" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                  免费下载
                </Link>
              ) : (
                <PlanAction plan={p.plan} name={p.name} featured={featured} />
              )}
            </div>
            <dl className="mt-7 grid gap-2.5 text-[14px]">
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-baseline justify-between gap-3 border-b pb-2.5",
                    featured ? "border-navy-border" : "border-border",
                  )}
                >
                  <dt className={featured ? "text-navy-muted" : "text-muted-foreground"}>{label}</dt>
                  <dd className="text-right font-medium tnum">{value(p)}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
