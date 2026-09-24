import { Plus } from "lucide-react";

/** 常见问题：原生 details，不用脚本也能展开；第一条默认展开。 */
export function Faq({ items }: { items: [string, string][] }) {
  return (
    <div className="border-t border-border">
      {items.map(([q, a], i) => (
        <details key={q} open={i === 0} className="group border-b border-border">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[17px] font-medium marker:hidden [&::-webkit-details-marker]:hidden">
            {q}
            <Plus
              aria-hidden="true"
              className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
            />
          </summary>
          <p className="-mt-1 max-w-[44em] pb-6 text-body">{a}</p>
        </details>
      ))}
    </div>
  );
}
