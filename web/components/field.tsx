import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/** 表单的一项：标签在上，控件在下，可选的一行说明在最后。 */
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-[13px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
