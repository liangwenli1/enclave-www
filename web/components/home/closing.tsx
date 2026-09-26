import { LocaleLink as Link } from "@/components/locale-link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getRequestLocale } from "@/lib/i18n/request-locale";

const SCENES = [
  ["跨境店铺", "为每个店铺配置独立环境与目标市场的住宅代理。新环境自动继承文件夹权限。"],
  ["广告投放", "为每个广告账户保留独立环境，批量启动账户组，并通过流程执行日常检查。"],
  ["社媒矩阵", "按平台与职责组织账号文件夹，向不同成员分配权限，并通过操作日志追踪访问记录。"],
] as const;

export async function Scenes() {
  const english = (await getRequestLocale()) === "en";
  const scenes = english
    ? ([
        ["Cross-border commerce", "Give each store its own environment and a residential proxy in the target market. New environments inherit folder permissions."],
        ["Advertising operations", "Keep every ad account in a separate environment. Launch account groups together and automate routine checks."],
        ["Social media teams", "Organize account portfolios by platform and assign folders to the responsible operators. Activity stays auditable."],
      ] as const)
    : SCENES;
  return (
    <section className="py-24 sm:py-28">
      <div className="site-wrap">
        <div className="max-w-[40em]">
          <p className="eyebrow">{english ? "Use cases" : "适用场景"}</p>
          <h2 className="display-3 mt-3">{english ? "Manage dozens of accounts alone—or hundreds as a team" : "从个人多账号到团队规模化运营"}</h2>
        </div>
        <div className="mt-12 grid gap-9 md:grid-cols-3">
          {scenes.map(([title, text]) => (
            <div key={title} className="border-t-2 border-foreground pt-5">
              <h3 className="text-[19px] font-semibold">{title}</h3>
              <p className="mt-2.5 text-[15px] text-body">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function Closing() {
  const english = (await getRequestLocale()) === "en";
  return (
    <section className="border-t border-border bg-muted">
      <div className="site-wrap flex flex-wrap items-end justify-between gap-8 py-24 sm:py-28">
        <div>
          <h2 className="display-2">{english ? "Start with 3 environments for free." : "免费创建 3 个环境"}</h2>
          <p className="lead mt-4">{english ? "No card required. Upgrade only when more capacity is needed." : "无需绑定付款方式；需要更多容量时再升级。"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
          <Link href="/download" className={buttonVariants({ size: "lg" })}>
            {english ? "Free download" : "免费下载"}
          </Link>
          <Link href="/docs" className="inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
            {english ? "Read the docs" : "阅读文档"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
