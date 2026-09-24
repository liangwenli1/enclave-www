import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { LockIcon } from "@/components/icons";

/* 海军蓝的一段：加密同步怎么走。示意图用 HTML 画，窄屏竖排。 */

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const Laptop = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
    <rect x="6" y="7" width="20" height="13" rx="1.5" {...stroke} />
    <path d="M3 24h26l-2-4H5z" {...stroke} />
  </svg>
);
const Server = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
    <rect x="6" y="5" width="20" height="9" rx="1.5" {...stroke} />
    <rect x="6" y="17" width="20" height="9" rx="1.5" {...stroke} />
    <path d="M10 9.5h.01M10 21.5h.01M15 9.5h7M15 21.5h7" {...stroke} strokeWidth={2} />
  </svg>
);

function Node({ icon, title, text, tag, locked }: { icon: ReactNode; title: string; text: string; tag: string; locked: boolean }) {
  return (
    <div className="rounded-xl border border-navy-border bg-navy-2 p-5">
      <div className="text-[#9db4ff]">{icon}</div>
      <p className="mt-3 font-semibold text-white">{title}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-navy-muted">{text}</p>
      <p
        className={
          locked
            ? "mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1d3a2f] px-2.5 py-0.5 text-[12.5px] text-[#7fe0ae]"
            : "mt-4 inline-flex items-center gap-1.5 rounded-full border border-navy-border px-2.5 py-0.5 text-[12.5px] text-navy-muted"
        }
      >
        {locked ? <LockIcon className="size-3" /> : null}
        {tag}
      </p>
    </div>
  );
}

function Hop({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-[12.5px] text-navy-muted md:flex-col md:gap-1 md:px-1 md:py-0">
      <span>{label}</span>
      <ArrowDown className="size-4 md:hidden" aria-hidden="true" />
      <ArrowRight className="hidden size-4 md:block" aria-hidden="true" />
    </div>
  );
}

const POINTS = [
  ["新电脑加入要当面核对", "团队中已有的一台电脑点「允许」并核对 6 位数字，密钥才会交给新设备。"],
  ["成员移出即换钥匙", "对应的电脑立即解绑，其经手过的环境在后台自动更换密钥。"],
  ["内核被改动就不启动", "内核列表由官方签名发布；每次启动前校验文件，不符即拒绝启动。"],
] as const;

export function SecurityBand() {
  return (
    <section className="bg-navy text-navy-foreground">
      <div className="site-wrap py-24 sm:py-28">
        <div className="max-w-[40em]">
          <p className="eyebrow text-[#9db4ff]">安全</p>
          <h2 className="display-3 mt-3 text-white">同步的数据，服务器也解不开</h2>
          <p className="lead mt-5 text-navy-muted">
            登录态和代理密码在本机加密后才上传，密钥只在团队的电脑之间传递。服务器保存的，只有密文。
          </p>
        </div>

        <figure className="mt-12">
          <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <Node icon={<Laptop />} title="本机" text="登录态、Cookie、代理密码在这里加密。" tag="密钥在本机" locked />
            <Hop label="加密后上传" />
            <Node icon={<Server />} title="服务器" text="只保存密文与版本号，没有解开的钥匙。" tag="只有密文" locked={false} />
            <Hop label="下载密文" />
            <Node icon={<Laptop />} title="团队的另一台电脑" text="核对 6 位数字后获得密钥，在本机解开。" tag="密钥由已有电脑交付" locked />
          </div>
          <figcaption className="sr-only">
            加密同步的路径：本机加密后上传，服务器只保存密文，团队的另一台电脑在核对 6 位数字后获得密钥并在本机解密。
          </figcaption>
        </figure>

        <div className="mt-14 grid gap-8 border-t border-navy-border pt-10 md:grid-cols-3">
          {POINTS.map(([title, text]) => (
            <div key={title}>
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-navy-muted">{text}</p>
            </div>
          ))}
        </div>

        <Link href="/security" className="mt-10 inline-flex items-center gap-1.5 font-medium text-[#9db4ff] hover:underline hover:underline-offset-4">
          了解安全设计
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
