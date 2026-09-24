import { ridges } from "@/lib/glyph";

/*
 * 首屏背景：放大的一片指纹圈，和标志同一个算法，只是圈数多、半径大。
 * 服务器端算好直接出 SVG——不需要脚本，任何分辨率都清楚。
 * 往下渐隐，让截图压在干净的底上；画出来的动画见 globals.css（.ridge-field）。
 */
const W = 1440;
const H = 960;
const SIZE = 1944;
const CX = W * 0.82;
const CY = -SIZE * 0.12;
// 圈是在平移过的坐标里画的；渐变用 userSpaceOnUse，端点也要换算到同一个坐标里。
const TX = CX - SIZE / 2;
const TY = CY - SIZE / 2;

const ARCS = ridges(20260924, SIZE, 30)
  .split("M")
  .filter(Boolean)
  .map((d) => `M${d}`);

export function RidgeField({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMaxYMin slice"
      className={className}
    >
      <defs>
        <linearGradient
          id="rf-stroke"
          gradientUnits="userSpaceOnUse"
          x1={W * 0.35 - TX}
          y1={-TY}
          x2={W - TX}
          y2={H * 0.6 - TY}
        >
          <stop offset="0" stopColor="#7d9aff" stopOpacity="0.6" />
          <stop offset="0.45" stopColor="#5cd4ec" stopOpacity="0.55" />
          <stop offset="0.75" stopColor="#bea0ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffbea0" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="rf-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.3" stopColor="#fff" />
          <stop offset="0.78" stopColor="#000" />
        </linearGradient>
        <mask id="rf-mask">
          <rect width={W} height={H} fill="url(#rf-fade)" />
        </mask>
      </defs>
      <g mask="url(#rf-mask)">
        <g
          className="ridge-field"
          transform={`translate(${TX} ${TY})`}
          fill="none"
          stroke="url(#rf-stroke)"
          strokeWidth="1.3"
          strokeLinecap="round"
        >
          {ARCS.map((d, i) => (
            <path key={i} d={d} pathLength={1} />
          ))}
        </g>
      </g>
    </svg>
  );
}
