import Link from "next/link";
import { cn } from "cn";
import { ridges } from "@/lib/glyph";

// 标志就是一枚指纹章：和工作台里每个环境名前面那枚是同一个算法，种子固定。
const MARK = ridges(12345, 26, 4);

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true" className={cn("size-[26px] text-primary", className)}>
      <path d={MARK} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Enclave 首页"
      className={cn("flex w-fit items-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em] text-foreground", className)}
    >
      <BrandMark />
      Enclave
    </Link>
  );
}

/** 环境的指纹章：每个环境一枚，由种子决定。 */
export function Glyph({ seed, className }: { seed: number; className?: string }) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className={cn("size-7 shrink-0 text-primary", className)}>
      <path d={ridges(seed, 30)} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
