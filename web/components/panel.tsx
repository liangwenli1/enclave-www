import type { ReactNode } from "react";
import { cn } from "cn";

/** 功能页的一块面板：标题栏 + 内容。账号页、管理后台共用。 */
export function Panel({
  id,
  title,
  note,
  actions,
  children,
  flush = false,
  className,
}: {
  id?: string;
  title: string;
  note?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** 内容贴边（表格） */
  flush?: boolean;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-b border-border px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          {note ? <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted-foreground">{note}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={flush ? "" : "p-5 sm:p-6"}>{children}</div>
    </section>
  );
}

/** 键值列表：账号、电脑、团队这类「一项一行」的信息。 */
export function KeyValues({ rows, className }: { rows: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("grid gap-0 text-[14.5px]", className)}>
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[6.5em_1fr] gap-3 border-b border-border py-2.5 last:border-0">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 用量条。宽度用 SVG 的属性给，不用内联 style（CSP 不放行）。 */
export function Meter({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const full = limit > 0 && used >= limit;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">
          {used} / {limit}
        </span>
      </div>
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" className="mt-2 block h-1.5 w-full">
        <rect width="100" height="6" rx="3" className="fill-accent" />
        {pct > 0 ? <rect width={pct} height="6" rx="3" className={full ? "fill-warn" : "fill-primary"} /> : null}
      </svg>
    </div>
  );
}

export const Muted = ({ children }: { children: ReactNode }) => (
  <p className="text-[13.5px] leading-relaxed text-muted-foreground">{children}</p>
);

export const ErrorText = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="text-sm text-destructive">
    {children}
  </p>
);
