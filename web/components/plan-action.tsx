"use client";

import { LocaleLink as Link } from "@/components/locale-link";
import { useEffect, useState } from "react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { PlanId } from "@/lib/plans";
import { useLocale } from "@/components/locale-provider";

/*
 * 付费档的按钮：支付通道配好、这一档填了产品 ID，才显示「订阅」；否则显示「暂未开通」。
 * 是否能买由服务器说了算（/api/plans 的 online），同一页的几个按钮共用一次请求。
 */

let online: Promise<string[]> | null = null;
export const onlinePlans = () =>
  (online ??= api<{ online?: string[] }>("/plans").then(
    (r) => r.online ?? [],
    () => [],
  ));

export function useOnlinePlans() {
  const [plans, setPlans] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    void onlinePlans().then((p) => alive && setPlans(p));
    return () => {
      alive = false;
    };
  }, []);
  return plans;
}

export function PlanAction({ plan, name, featured }: { plan: PlanId; name: string; featured: boolean }) {
  const plans = useOnlinePlans();
  const english = useLocale() === "en";

  if (plans === null) {
    // 还没问到：先占住按钮的位置，不闪「暂未开通」也不闪「订阅」。
    return <span aria-hidden="true" className={cn(buttonVariants(), "invisible w-full")}>{english ? "Subscribe" : "订阅"}</span>;
  }
  if (!plans.includes(plan)) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          "inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-full border border-dashed text-[14.5px] font-medium",
          "border-input text-muted-foreground",
        )}
      >
        {english ? "Not available" : "暂未开通"}
      </span>
    );
  }
  return (
    <Link
      href={`/account?plan=${plan}#upgrade`}
      className={cn(buttonVariants({ variant: featured ? "default" : "outline" }), "w-full")}
    >
      {english ? `Subscribe to ${name}` : `订阅 ${name}`}
    </Link>
  );
}

/** 在线订阅还没开通时，给一条路：联系开通。开通之后这句话自动消失。 */
export function OfflineNote({ className }: { className?: string }) {
  const plans = useOnlinePlans();
  const english = useLocale() === "en";
  if (plans === null || plans.length > 0) return null;
  return (
    <p className={cn("text-[13.5px] text-muted-foreground", className)}>
      {english ? "Online subscriptions are not available yet. " : "在线订阅即将开放。现在需要付费档，可以"}
      <Link href="/contact" className="mx-0.5 text-link hover:underline hover:underline-offset-4">
        {english ? "Contact us" : "联系我们"}
      </Link>
      {english ? " for access." : "开通。"}
    </p>
  );
}
