import { LocaleLink as Link } from "@/components/locale-link";
import { cn } from "cn";
import { PlanAction } from "@/components/plan-action";
import { buttonVariants } from "@/components/ui/button";
import { API_LABEL, FEATURED, PLAN_FOR, PLAN_FOR_EN, PLANS, type SitePlan } from "@/lib/plans";
import { getRequestLocale } from "@/lib/i18n/request-locale";

/* 四档并排。推荐档只用钴蓝描边、顶线和按钮强调，不反转整张卡片。 */

const rows: [string, (p: SitePlan) => string][] = [
  ["环境数量", (p) => `${p.envLimit}`],
  ["同时运行", (p) => `${p.concurrent}`],
  ["每位成员可登录的设备数", (p) => `${p.deviceLimit} 台`],
  ["成员席位", (p) => `${p.seats} 人`],
  ["加密同步", (p) => (p.plan === "free" ? "—" : "包含")],
  ["本机 API", (p) => API_LABEL[p.api]],
];

export async function PlanCards() {
  const english = (await getRequestLocale()) === "en";
  const localizedRows: [string, (p: SitePlan) => string][] = english
    ? [
        ["Environments", (p) => `${p.envLimit}`],
        ["Concurrent sessions", (p) => `${p.concurrent}`],
        ["Devices per member", (p) => `${p.deviceLimit}`],
        ["Member seats", (p) => `${p.seats}`],
        ["Encrypted sync", (p) => (p.plan === "free" ? "—" : "Included")],
        ["Local API", (p) => (p.api === "off" ? "—" : p.api === "discover" ? "Read-only" : "Start and stop")],
      ]
    : rows;
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
              featured && "relative z-10 bg-chip/20 ring-2 ring-primary/15 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-primary",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[17px] font-semibold">{english && p.plan === "free" ? "Free" : p.name}</h3>
              {featured ? (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-[12px] font-medium text-primary-foreground">{english ? "Recommended" : "推荐"}</span>
              ) : null}
            </div>
            <p className="mt-1.5 min-h-[3em] text-[13.5px] leading-relaxed text-muted-foreground">
              {(english ? PLAN_FOR_EN : PLAN_FOR)[p.plan]}
            </p>
            <p className="mt-4 font-mono text-[40px] leading-none font-medium tracking-[-0.03em]">
              {p.price ? "US$" : "$"}{p.price}
              <span className="ml-1.5 font-sans text-[14px] font-normal tracking-normal text-muted-foreground">
                {p.price ? (english ? "/ month" : "/ 月") : english ? "Free forever" : "永久免费"}
              </span>
            </p>
            <div className="mt-6">
              {p.plan === "free" ? (
                <Link href="/download" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                  {english ? "Free download" : "免费下载"}
                </Link>
              ) : (
                <PlanAction plan={p.plan} name={p.name} featured={featured} />
              )}
            </div>
            <dl className="mt-7 grid gap-2.5 text-[14px]">
              {localizedRows.map(([label, value]) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-baseline justify-between gap-3 border-b pb-2.5",
                    "border-border",
                  )}
                >
                  <dt className="text-muted-foreground">{label}</dt>
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
