"use client";

import { useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { cn } from "cn";
import { CopyButton } from "@/components/copy-button";
import { buttonVariants } from "@/components/ui/button";
import type { Platform, Release } from "@/lib/release";
import { downloadUrl, fileFor, megabytes } from "@/lib/release";

const PLATFORMS: { key: Platform; name: string; req: string; ext: string }[] = [
  { key: "windows", name: "Windows", req: "Windows 10 / 11，64 位", ext: ".msi" },
  { key: "macos", name: "macOS", req: "Apple Silicon（M 系列芯片）", ext: ".dmg" },
];

const noop = () => () => {};
const detect = (): Platform | null => {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
  return null;
};

/** 两个平台并排；认出访客的系统后，那一张卡片的按钮换成主按钮。 */
export function PlatformPicker({ release }: { release: Release | null }) {
  // 只能在浏览器里认系统；服务器渲染时按 Windows 在前处理，水合后再换成真实系统。
  const mine = useSyncExternalStore(noop, detect, () => null);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {PLATFORMS.map((p) => {
        const file = fileFor(release, p.key);
        const primary = mine ? mine === p.key : p.key === "windows";
        return (
          <div key={p.key} className={cn("flex flex-col rounded-2xl border bg-card p-6 sm:p-8", primary ? "border-primary/30 shadow-frame" : "border-border")}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[24px] font-semibold tracking-[-0.01em]">{p.name}</h2>
              {mine === p.key ? <span className="text-[12.5px] font-medium text-primary">当前系统</span> : null}
            </div>
            <p className="mt-1 text-[14px] text-muted-foreground">{p.req}</p>

            {release && file ? (
              <>
                <dl className="mt-6 grid gap-2 text-[14px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">版本</dt>
                    <dd className="font-mono">{release.version}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">文件</dt>
                    <dd className="truncate font-mono text-[13px]">{file.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">大小</dt>
                    <dd className="font-mono">{megabytes(file.bytes)}</dd>
                  </div>
                </dl>
                <div className="mt-4 rounded-lg bg-muted p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] font-medium text-muted-foreground">SHA256</span>
                    <CopyButton value={file.sha256} />
                  </div>
                  <code className="mt-1.5 block font-mono text-[12px] leading-relaxed break-all select-all">{file.sha256}</code>
                </div>
                <a
                  href={downloadUrl(release, file)}
                  className={cn(buttonVariants({ size: "lg", variant: primary ? "default" : "outline" }), "mt-6 w-full")}
                >
                  <Download aria-hidden="true" />
                  下载 {p.ext} 安装包
                </a>
              </>
            ) : (
              <div className="mt-6 flex flex-1 flex-col justify-end">
                <p className="rounded-lg bg-muted p-4 text-[14px] leading-relaxed text-body">
                  安装包即将开放下载。发布后，这里直接提供文件、大小与 SHA256 校验值。
                </p>
                <span
                  aria-disabled="true"
                  className="mt-6 inline-flex h-12 w-full cursor-not-allowed items-center justify-center rounded-full border border-dashed border-input text-base font-medium text-muted-foreground"
                >
                  即将开放
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
