"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "cn";

/** 复制一段文字（哈希、授权码、邀请链接）。复制成功后两秒内显示对勾。 */
export function CopyButton({ value, label = "复制", className }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        });
      }}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-input bg-background px-2.5 py-1 text-[12.5px] text-body hover:bg-accent",
        className,
      )}
    >
      {done ? <Check className="size-3.5 text-ok" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {done ? "已复制" : label}
    </button>
  );
}

/** 一段需要原样复制的值：等宽字体、可以整段选中、右上角一个复制按钮。 */
export function CodeValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
        <CopyButton value={value} />
      </div>
      <code className="mt-2 block font-mono text-[13px] leading-relaxed break-all text-foreground select-all">{value}</code>
    </div>
  );
}
