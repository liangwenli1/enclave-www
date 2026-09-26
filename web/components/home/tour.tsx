"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "cn";
import { useLocale } from "@/components/locale-provider";

export type TourItem = { key: string; label: string; icon: ReactNode; panel: ReactNode };

/**
 * 功能导览：一排标签，下面一大块产品画面。所有面板都在 HTML 里（搜索引擎和不开脚本的访客看得到），
 * 只是非当前的那几块隐藏。键盘左右键切换，读屏按 tablist 朗读。
 */
export function Tour({ items }: { items: TourItem[] }) {
  const english = useLocale() === "en";
  const [active, setActive] = useState(0);
  const base = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = items.length;
    const next =
      e.key === "ArrowRight" ? (i + 1) % n
      : e.key === "ArrowLeft" ? (i - 1 + n) % n
      : e.key === "Home" ? 0
      : e.key === "End" ? n - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={english ? "Product features" : "产品功能"}
        className="no-scrollbar -mx-5 flex overflow-x-auto border-b border-border px-5 sm:mx-0 sm:px-0"
      >
        {items.map((item, i) => (
          <button
            key={item.key}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${i}`}
            aria-controls={`${base}-panel-${i}`}
            aria-selected={active === i}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "relative flex shrink-0 cursor-pointer items-center gap-2.5 px-4 py-4 text-[15px] transition-colors sm:px-5",
              active === i
                ? "font-medium text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("transition-colors", active === i ? "text-primary" : "text-muted-foreground")}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, i) => (
        <div
          key={item.key}
          role="tabpanel"
          id={`${base}-panel-${i}`}
          aria-labelledby={`${base}-tab-${i}`}
          hidden={active !== i}
          className="pt-10 sm:pt-12"
        >
          {item.panel}
        </div>
      ))}
    </div>
  );
}
