"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** 一段要照抄的机器值（哈希、命令），右上角常驻复制。 */
export function HashBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="www-hash u-mt-4">
      <p className="www-overline">{label}</p>
      <code>{value}</code>
      <Button
        variant="outline"
        size="sm"
        className="absolute top-3 right-3"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        {copied ? "已复制" : "复制"}
      </Button>
    </div>
  );
}
