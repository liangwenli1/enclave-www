import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { cn } from "cn";
import { Faq } from "@/components/faq";
import { PageHead } from "@/components/page-head";
import { PlanCards } from "@/components/plan-cards";
import { OfflineNote } from "@/components/plan-action";
import { API_LABEL, FEATURED, PLANS, type SitePlan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "套餐与价格",
  description: "免费档 3 个环境永久可用；Solo $9、Pro $29、Team $79 每月，按环境数付费，安装包免费，随时取消。",
  alternates: { canonical: "/pricing" },
};

type Value = string | boolean;
const GROUPS: { title: string; rows: [string, (p: SitePlan) => Value][] }[] = [
  {
    title: "额度",
    rows: [
      ["环境数量", (p) => `${p.envLimit}`],
      ["同时运行", (p) => `${p.concurrent}`],
      ["每人可登录电脑", (p) => `${p.deviceLimit} 台`],
      ["成员席位（含所有者）", (p) => `${p.seats} 人`],
    ],
  },
  {
    title: "环境",
    rows: [
      ["Chromium 类与 Firefox 类内核", () => true],
      ["时区、语言、地理位置跟随代理出口", () => true],
      ["带账号密码的代理，代理不通不启动", () => true],
      ["批量执行", () => true],
      ["自动化流程", () => true],
    ],
  },
  {
    title: "同步与团队",
    rows: [
      ["加密同步（环境、代理、登录态）", (p) => p.plan !== "free"],
      ["按文件夹授权给成员", (p) => p.seats > 1],
      ["操作日志", () => true],
    ],
  },
  {
    title: "接入",
    rows: [["本机 API", (p) => (p.api === "off" ? false : API_LABEL[p.api])]],
  },
];

function Cell({ value }: { value: Value }) {
  if (value === true) return <Check className="mx-auto size-[18px] text-primary" aria-label="包含" />;
  if (value === false) return <Minus className="mx-auto size-4 text-input" aria-label="不包含" />;
  return <span className="tnum">{value}</span>;
}

const BILLING_FAQ: [string, string][] = [
  [
    "怎么付款？",
    "付费档按月订阅，通过 Creem 收银台用银行卡付款，到期自动续费。付款方式和账单在账号页的「管理订阅」里查看和修改。",
  ],
  ["可以随时取消吗？", "可以。取消后，本期结束之前仍按原档位使用，到期后自动回到免费档。"],
  [
    "降档或到期后，超出额度的环境会怎样？",
    "环境不会被删除，数据仍在本机。只有最早创建的若干个环境可以启动，数量等于当前档位的上限；续订，或删掉不用的环境即可。",
  ],
  ["团队的席位怎么算？", "Team 档最多 6 人，含所有者。每位成员用自己的账号登录工作台，各自可登录 1 台电脑。"],
  ["可以不在线付款吗？", "可以。通过联系我们说明需要的档位与时长，确认收款后为账号开通。"],
];

export default function PricingPage() {
  return (
    <main>
      <PageHead
        eyebrow="套餐"
        title="按环境数付费"
        lead="安装包免费。免费档永久可用；付费档按月订阅，随时可以取消。"
      />

      <section className="py-14 sm:py-16">
        <div className="site-wrap">
          <PlanCards />
          <OfflineNote className="mt-5" />
        </div>
      </section>

      <section className="pb-24">
        <div className="site-wrap">
          <h2 className="text-[24px] font-semibold tracking-[-0.01em]">完整对比</h2>
          <div className="table-scroll mt-6 rounded-xl border border-border">
            <table className="data-table min-w-[720px] table-fixed">
              <colgroup>
                <col className="w-[32%]" />
                {PLANS.map((p) => (
                  <col key={p.plan} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">项目</span>
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.plan}
                      scope="col"
                      className={cn("text-center text-[14px] text-foreground", p.plan === FEATURED && "bg-chip text-chip-foreground")}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              {GROUPS.map((g) => (
                <tbody key={g.title}>
                  <tr>
                    <th scope="colgroup" className="bg-background pt-6 text-[13px] text-foreground">
                      {g.title}
                    </th>
                    {PLANS.map((p) => (
                      <td key={p.plan} className={cn(p.plan === FEATURED && "bg-chip/40")} />
                    ))}
                  </tr>
                  {g.rows.map(([label, value]) => (
                    <tr key={label}>
                      <th scope="row" className="bg-transparent text-[14.5px] font-normal whitespace-normal text-body">
                        {label}
                      </th>
                      {PLANS.map((p) => (
                        <td key={p.plan} className={cn("text-center", p.plan === FEATURED && "bg-chip/40")}>
                          <Cell value={value(p)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <p className="mt-4 text-[13.5px] text-muted-foreground">
            价格以美元计，不含可能产生的税费。每一档都能下载内核的安全更新。
          </p>
        </div>
      </section>

      <section className="border-t border-border py-24">
        <div className="site-wrap grid gap-10 lg:grid-cols-[1fr_2fr]">
          <h2 className="display-3">付款与订阅</h2>
          <Faq items={BILLING_FAQ} />
        </div>
      </section>
    </main>
  );
}
