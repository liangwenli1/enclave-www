import { ridges } from "@/lib/glyph";

/*
 * 功能图标：线条 1.5，和标志的指纹圈同一种笔触。只在功能导览和少数标题旁出现，
 * 其余地方的界面图标用 lucide。
 */
const box = "size-[18px]";
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const RIDGE = ridges(2718, 18, 3);

export const IsolationIcon = () => (
  <svg viewBox="0 0 18 18" aria-hidden="true" className={box}>
    <path d={RIDGE} {...stroke} strokeWidth={1.4} />
  </svg>
);

export const BatchIcon = () => (
  <svg viewBox="0 0 18 18" aria-hidden="true" className={box}>
    <rect x="2.5" y="2.5" width="9" height="6" rx="1.5" {...stroke} />
    <rect x="6.5" y="9.5" width="9" height="6" rx="1.5" {...stroke} />
    <path d="M4.5 11.5v2.5h1.5" {...stroke} />
  </svg>
);

export const FlowIcon = () => (
  <svg viewBox="0 0 18 18" aria-hidden="true" className={box}>
    <circle cx="4" cy="4.5" r="2" {...stroke} />
    <rect x="10.5" y="2.5" width="5" height="4" rx="1" {...stroke} />
    <path d="M6 4.5h4.5M13 6.5v3M13 9.5l-2.5 3 2.5 3 2.5-3z" {...stroke} />
  </svg>
);

export const TeamIcon = () => (
  <svg viewBox="0 0 18 18" aria-hidden="true" className={box}>
    <circle cx="6.5" cy="6" r="2.5" {...stroke} />
    <path d="M2 15c.6-2.6 2.3-4 4.5-4s3.9 1.4 4.5 4" {...stroke} />
    <path d="M11.5 3.8a2.3 2.3 0 0 1 0 4.4M13.2 11.3c1.4.5 2.4 1.7 2.8 3.7" {...stroke} />
  </svg>
);

export const LockIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
    <path
      fill="currentColor"
      d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm-2 5V4.5a2 2 0 1 1 4 0V6H6Z"
    />
  </svg>
);
