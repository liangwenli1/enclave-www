import type { ReactNode } from "react";
import { cn } from "cn";
import { BrandMark } from "@/components/brand";

/**
 * 截图外面的窗口框。工作台在 Windows 和 macOS 上各长各的样子，框也跟着系统走。
 * 纯装饰，读屏跳过；截图本身带 alt。
 */
export function WindowFrame({
  os,
  className,
  children,
}: {
  os: "windows" | "macos";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[14px] border border-input bg-card shadow-frame", className)}>
      {os === "macos" ? (
        <div aria-hidden="true" className="flex h-[30px] items-center gap-[7px] border-b border-border bg-accent px-3.5">
          <i className="size-2.5 rounded-full bg-input" />
          <i className="size-2.5 rounded-full bg-input" />
          <i className="size-2.5 rounded-full bg-input" />
        </div>
      ) : (
        <div aria-hidden="true" className="flex h-8 items-center border-b border-border bg-accent pl-3">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <BrandMark className="size-3.5" />
            Enclave
          </span>
          <span className="ml-auto flex h-full text-muted-foreground">
            <svg viewBox="0 0 46 32" className="h-full w-[46px]">
              <path d="M18 16.5h10" stroke="currentColor" strokeWidth="1" />
            </svg>
            <svg viewBox="0 0 46 32" className="h-full w-[46px]">
              <rect x="18.5" y="11.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
            <svg viewBox="0 0 46 32" className="h-full w-[46px]">
              <path d="M18.5 11.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1" />
            </svg>
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * 工作台截图：真实界面 + 演示数据，2880×1800 的 webp。
 * 不用 next/image：它会给 img 加内联 style，在这个站的 CSP 下会被拦、控制台报错。
 */
export function Shot({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={2880}
      height={1800}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className="block h-auto w-full"
    />
  );
}
