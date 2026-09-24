import type { ReactNode } from "react";
import { cn } from "cn";

/** 内页的页头：营销内页用大标题，功能页（账号、授权、后台）用 compact。 */
export function PageHead({
  eyebrow,
  title,
  lead,
  compact = false,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  compact?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(compact ? "pt-12 pb-8 sm:pt-14" : "border-b border-border pt-16 pb-14 sm:pt-20 sm:pb-16", className)}>
      <div className="site-wrap">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h1 className={cn(compact ? "text-[30px] leading-tight font-semibold tracking-[-0.02em] sm:text-[34px]" : "display-2 max-w-[15em]")}>
          {title}
        </h1>
        {lead ? <div className={cn(compact ? "mt-3 max-w-[40em] text-body" : "lead mt-5 max-w-[38em]")}>{lead}</div> : null}
        {children}
      </div>
    </section>
  );
}
