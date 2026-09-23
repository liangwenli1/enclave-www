import { ridges } from "@/lib/glyph";

/** 指纹章。算法在 lib/glyph.ts，和工作台共用同一组黄金向量。 */
export function Glyph({ seed, size = 30 }: { seed: number; size?: number }) {
  return (
    <svg
      className="www-glyph"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <path
        d={ridges(seed, size)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
