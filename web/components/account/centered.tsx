import type { ReactNode } from "react";

/** 单一任务的页面（工作台登录确认、加入团队）：居中一张卡片，不带营销页的大标题。 */
export function Centered({ title, lead, children }: { title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <div className="site-wrap grid min-h-[60vh] justify-center py-14 sm:py-20">
      <div className="w-full max-w-[480px]">
        <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
        <div className="mt-2 text-body">{lead}</div>
        <div className="mt-8 grid gap-5 rounded-2xl border border-border bg-card p-6 shadow-frame sm:p-8">{children}</div>
      </div>
    </div>
  );
}
