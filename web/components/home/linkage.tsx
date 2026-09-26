import type { ReactNode } from "react";
import { cn } from "cn";
import { Glyph } from "@/components/brand";
import { getRequestLocale } from "@/lib/i18n/request-locale";

/*
 * 「为什么会被关联」的示意图。HTML 画的，窄屏也清楚：
 * 左边三个账号汇到同一个身份上，右边三个账号各有各的身份。
 */

const ACCOUNTS = ["店铺 A", "店铺 B", "店铺 C"];

function Lines({ converge }: { converge: boolean }) {
  return (
    <svg viewBox="0 0 300 56" preserveAspectRatio="none" aria-hidden="true" className="block h-14 w-full">
      {[50, 150, 250].map((x) => (
        <path
          key={x}
          d={converge ? `M${x} 0 C ${x} 30, 150 26, 150 56` : `M${x} 0 L ${x} 56`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function Accounts({ english }: { english: boolean }) {
  const accounts = english ? ["Store A", "Store B", "Store C"] : ACCOUNTS;
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {accounts.map((a) => (
        <div key={a} className="rounded-lg border border-border bg-card px-2 py-2.5 text-center text-[13.5px] font-medium">
          {a}
        </div>
      ))}
    </div>
  );
}

function Panel({
  title,
  verdict,
  good,
  children,
}: {
  title: string;
  verdict: string;
  good: boolean;
  children: ReactNode;
}) {
  return (
    <figure className={cn("rounded-2xl border p-5 sm:p-7", good ? "border-primary/25 bg-card shadow-frame" : "border-border bg-muted")}>
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold">{title}</span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[12.5px] font-medium",
            good ? "bg-[#e3f4ea] text-ok" : "bg-[#fbe9e7] text-destructive",
          )}
        >
          {verdict}
        </span>
      </figcaption>
      <div className="mt-6">{children}</div>
    </figure>
  );
}

export async function Linkage() {
  const english = (await getRequestLocale()) === "en";
  return (
    <section className="py-24 sm:py-28">
      <div className="site-wrap">
        <div className="max-w-[40em]">
          <p className="eyebrow">{english ? "Why accounts get linked" : "关联风险"}</p>
          <h2 className="display-3 mt-3">{english ? "Shared browser signals can link separate accounts" : "共享浏览器信号可能导致账号关联"}</h2>
          <p className="lead mt-5">
            {english
              ? "Browser fingerprints, cookies, and IP addresses can connect accounts that should remain separate. Enclave isolates all three in independent environments."
              : "浏览器指纹、Cookie、IP 地址出现重合时，多个账号可能被归为同一使用者。Enclave 将三项分别隔离，让每个环境保持独立。"}
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2 lg:gap-6">
          <Panel title={english ? "Standard browser" : "普通浏览器"} verdict={english ? "Accounts may be linked" : "账号可能被关联"} good={false}>
            <Accounts english={english} />
            <div className="text-[#d7a39c]">
              <Lines converge />
            </div>
            <div className="mx-auto max-w-[300px] rounded-xl border border-dashed border-[#e3b5ae] bg-card px-4 py-3.5 text-center">
              <p className="text-[14px] font-semibold">{english ? "Shared fingerprint and IP" : "相同的指纹与 IP"}</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{english ? "Cookies and cache share the same browser context" : "Cookie 与缓存处于同一浏览器上下文"}</p>
            </div>
          </Panel>

          <Panel title="Enclave" verdict={english ? "Three independent environments" : "三个独立环境"} good>
            <Accounts english={english} />
            <div className="text-primary/45">
              <Lines converge={false} />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                [7101, english ? "Los Angeles" : "洛杉矶", "en-US"],
                [4402, english ? "Berlin" : "柏林", "de-DE"],
                [9312, english ? "Tokyo" : "东京", "ja-JP"],
              ].map(([seed, city, lang]) => (
                <div key={city} className="grid justify-items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-center">
                  <Glyph seed={seed as number} className="size-7" />
                  <p className="text-[13.5px] font-semibold">{city}</p>
                  <p className="font-mono text-[11.5px] text-muted-foreground">{lang}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
