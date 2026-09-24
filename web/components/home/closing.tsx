import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const SCENES = [
  ["跨境店铺", "每个店铺一个环境，绑定店铺所在国家的住宅代理。新开的店铺建进文件夹，负责的运营马上就能打开。"],
  ["广告投放", "每个广告账户各用各的环境。一组账户一起启动，每天查余额、看审核状态写成流程自动运行。"],
  ["社媒矩阵", "几十个账号按平台分文件夹，交给不同的人负责。谁在什么时候打开了哪个账号，操作日志里都有。"],
] as const;

export function Scenes() {
  return (
    <section className="py-24 sm:py-28">
      <div className="site-wrap">
        <div className="max-w-[40em]">
          <p className="eyebrow">适用场景</p>
          <h2 className="display-3 mt-3">一个人管几十个账号，或者一个团队管几百个</h2>
        </div>
        <div className="mt-12 grid gap-9 md:grid-cols-3">
          {SCENES.map(([title, text]) => (
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

export function Closing() {
  return (
    <section className="border-t border-border bg-muted">
      <div className="site-wrap flex flex-wrap items-end justify-between gap-8 py-24 sm:py-28">
        <div>
          <h2 className="display-2">先免费用 3 个环境。</h2>
          <p className="lead mt-4">无需绑卡，注册即用。需要更多时再升级。</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
          <Link href="/download" className={buttonVariants({ size: "lg" })}>
            免费下载
          </Link>
          <Link href="/docs" className="inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
            阅读文档
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
