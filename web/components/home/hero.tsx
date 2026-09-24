import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "cn";
import { Glyph } from "@/components/brand";
import { Shot, WindowFrame } from "@/components/frame";
import { RidgeField } from "@/components/ridge-field";
import { buttonVariants } from "@/components/ui/button";

type Identity = {
  seed: number;
  name: string;
  exit: string;
  tz: string;
  lang: string;
  os: string;
  running?: boolean;
  className: string;
};

// 和截图里的演示环境是同一批：美国店铺在洛杉矶、德国广告在柏林、日本社媒在东京。
const IDENTITIES: Identity[] = [
  {
    seed: 7101,
    name: "美国店铺 01",
    exit: "洛杉矶 · 住宅 IP",
    tz: "America/Los_Angeles",
    lang: "en-US",
    os: "Windows 11",
    running: true,
    className: "rise-in-1 lg:absolute lg:top-[20%] lg:-left-4 xl:-left-12",
  },
  {
    seed: 4402,
    name: "德国广告 01",
    exit: "柏林 · 住宅 IP",
    tz: "Europe/Berlin",
    lang: "de-DE",
    os: "Windows 11",
    className: "rise-in-2 lg:absolute lg:top-[7%] lg:-right-4 xl:-right-10",
  },
  {
    seed: 9312,
    name: "日本社媒 12",
    exit: "东京 · 移动 IP",
    tz: "Asia/Tokyo",
    lang: "ja-JP",
    os: "Windows 10",
    className: "rise-in-3 lg:absolute lg:-bottom-10 lg:right-[14%]",
  },
];

function IdentityCard({ id }: { id: Identity }) {
  return (
    <div
      className={cn(
        "rise-in w-[80%] shrink-0 snap-start rounded-xl border border-border bg-card/95 p-4 text-[13px] shadow-float backdrop-blur-sm sm:w-auto lg:w-[292px]",
        id.className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <Glyph seed={id.seed} className="size-6" />
        <span className="font-semibold text-foreground">{id.name}</span>
        {id.running ? (
          <span className="ml-auto flex items-center gap-1.5 text-[12px] font-medium text-primary">
            <i className="size-1.5 rounded-full bg-primary" />
            运行中
          </span>
        ) : null}
      </div>
      <dl className="mt-3 grid grid-cols-[3.2em_1fr] gap-x-2 gap-y-1.5 leading-snug">
        <dt className="text-muted-foreground">出口</dt>
        <dd>{id.exit}</dd>
        <dt className="text-muted-foreground">时区</dt>
        <dd className="font-mono text-[12.5px]">{id.tz}</dd>
        <dt className="text-muted-foreground">语言</dt>
        <dd className="font-mono text-[12.5px]">
          {id.lang}
          <span className="ml-3 font-sans text-muted-foreground">{id.os}</span>
        </dd>
      </dl>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24">
      <RidgeField className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="site-wrap relative pt-14 sm:pt-20 lg:pt-24">
        <h1 className="display-1 max-w-[12em]">每个账号，一台独立的电脑。</h1>
        <p className="lead mt-6 max-w-[34em]">
          指纹、Cookie、IP 互不相通，平台看不出它们来自同一个人。团队一起用，密码不外泄。
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
          <Link href="/download" className={buttonVariants({ size: "lg" })}>
            免费下载
          </Link>
          <Link href="/pricing" className="inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
            查看套餐
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <p className="mt-5 text-[13.5px] text-muted-foreground">
          免费 3 个环境，无需绑卡 · Windows 10 / 11 · macOS（Apple Silicon）
        </p>

        <div className="relative mt-14 lg:mt-16">
          <WindowFrame os="windows">
            <Shot
              priority
              src="/shots/hero.webp"
              alt="Enclave 工作台：环境按美国店铺、德国广告、日本社媒三个文件夹分组，两个美国店铺正在运行，出口识别为洛杉矶"
            />
          </WindowFrame>
          <div className="no-scrollbar -mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-6 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:contents">
            {IDENTITIES.map((id) => (
              <IdentityCard key={id.name} id={id} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const FACTS = [
  ["3 个环境", "永久免费，内核更新与付费档相同"],
  ["双内核", "Chromium 与 Firefox，各有多个版本"],
  ["端到端加密", "登录态与代理密码加密后才上传"],
  ["运行在本机", "浏览器在本机运行，不经云端中转"],
] as const;

export function Facts() {
  return (
    <div className="border-y border-border">
      <dl className="site-wrap grid grid-cols-2 lg:grid-cols-4">
        {FACTS.map(([title, text], i) => (
          <div
            key={title}
            className={cn(
              "py-6 pr-4",
              i % 2 === 1 && "border-l border-border pl-5",
              i >= 2 && "border-t border-border lg:border-t-0",
              i === 2 && "lg:border-l lg:pl-5",
            )}
          >
            <dt className="text-[20px] font-semibold tracking-[-0.01em] text-foreground sm:text-[22px]">{title}</dt>
            <dd className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
