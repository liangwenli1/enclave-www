import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { cn } from "cn";
import { Faq } from "@/components/faq";
import { PageHead } from "@/components/page-head";
import { PlanCards } from "@/components/plan-cards";
import { OfflineNote } from "@/components/plan-action";
import { API_LABEL, FEATURED, PLANS, type SitePlan } from "@/lib/plans";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return {
    title: english ? "Pricing" : "套餐与价格",
    description: english ? "Compare Enclave plans by environment capacity, concurrency, devices, team seats, encrypted sync, and local API access." : "按环境数量、并发、设备、成员席位、加密同步与本机 API 对比 Enclave 套餐。",
    alternates: { canonical: english ? "/en/pricing" : "/zh-cn/pricing", languages: { en: "/en/pricing", "zh-CN": "/zh-cn/pricing", "x-default": "/en/pricing" } },
  };
}

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

function Cell({ value, english }: { value: Value; english: boolean }) {
  if (value === true) return <Check className="mx-auto size-[18px] text-primary" aria-label={english ? "Included" : "包含"} />;
  if (value === false) return <Minus className="mx-auto size-4 text-input" aria-label={english ? "Not included" : "不包含"} />;
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

export default async function PricingPage() {
  const english = (await getRequestLocale()) === "en";
  const groups = english
    ? [
        { title: "Capacity", rows: [["Environments", (p: SitePlan) => `${p.envLimit}`], ["Concurrent sessions", (p: SitePlan) => `${p.concurrent}`], ["Devices per member", (p: SitePlan) => `${p.deviceLimit}`], ["Member seats (including owner)", (p: SitePlan) => `${p.seats}`]] },
        { title: "Environments", rows: [["Chromium and Firefox engine families", () => true], ["Timezone, language, and location follow the proxy exit", () => true], ["Authenticated proxies with launch blocking on connection failure", () => true], ["Batch actions", () => true], ["Automation workflows", () => true]] },
        { title: "Sync and teams", rows: [["Encrypted sync for environments, proxies, and login state", (p: SitePlan) => p.plan !== "free"], ["Folder-based member access", (p: SitePlan) => p.seats > 1], ["Activity log", () => true]] },
        { title: "Integration", rows: [["Local API", (p: SitePlan) => p.api === "off" ? false : p.api === "discover" ? "Read-only" : "Start and stop"]] },
      ] as typeof GROUPS
    : GROUPS;
  const billingFaq = english
    ? ([
        ["How does billing work?", "Paid plans are billed monthly by card and renew automatically. Billing details can be managed from the account page."],
        ["Can I cancel at any time?", "Yes. The plan remains active until the end of the current billing period, then returns to Free."],
        ["What happens when a plan expires or is downgraded?", "Environments are not deleted. The earliest environments up to the current limit remain available to start."],
        ["How are Team seats counted?", "Team includes up to 6 members, including the owner. Each member signs in with an individual account."],
        ["Can I arrange payment offline?", "Yes. Contact support with the required plan and term."],
      ] as [string, string][])
    : BILLING_FAQ;
  return (
    <main>
      <PageHead
        eyebrow={english ? "Pricing" : "套餐"}
        title={english ? "Plans based on environment capacity" : "按环境数付费"}
        lead={english ? "The app is free to install. The Free plan remains available without a time limit; paid plans are billed monthly." : "安装包免费。免费套餐长期可用；付费套餐按月订阅，可随时取消。"}
      />

      <section className="py-14 sm:py-16">
        <div className="site-wrap">
          <PlanCards />
          <OfflineNote className="mt-5" />
        </div>
      </section>

      <section className="pb-24">
        <div className="site-wrap">
          <h2 className="text-[24px] font-semibold tracking-[-0.01em]">{english ? "Full comparison" : "完整对比"}</h2>
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
                    <span className="sr-only">{english ? "Feature" : "项目"}</span>
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.plan}
                      scope="col"
                      className={cn("text-center text-[14px] text-foreground", p.plan === FEATURED && "bg-chip text-chip-foreground")}
                    >
                      {english && p.plan === "free" ? "Free" : p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              {groups.map((g) => (
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
                          <Cell value={value(p)} english={english} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <p className="mt-4 text-[13.5px] text-muted-foreground">
            {english ? "Prices are in US dollars and exclude applicable taxes. Every plan includes kernel security updates." : "价格以美元计，不含可能产生的税费。所有套餐均包含内核安全更新。"}
          </p>
        </div>
      </section>

      <section className="border-t border-border py-24">
        <div className="site-wrap grid gap-10 lg:grid-cols-[1fr_2fr]">
          <h2 className="display-3">{english ? "Billing and subscriptions" : "付款与订阅"}</h2>
          <Faq items={billingFaq} />
        </div>
      </section>
    </main>
  );
}
