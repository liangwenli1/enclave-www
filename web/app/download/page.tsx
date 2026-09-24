import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHead } from "@/components/page-head";
import { PlatformPicker } from "@/components/platform-picker";
import { RELEASE } from "@/lib/release";

export const metadata: Metadata = {
  title: "下载",
  description: "下载 Enclave 工作台：Windows 10 / 11 与 macOS（Apple Silicon）安装包，附 SHA256 校验值。免费 3 个环境，无需绑卡。",
  alternates: { canonical: "/download" },
};

const STEPS = {
  windows: [
    "双击运行下载好的 .msi 安装包，按提示完成安装。",
    "安装包尚未进行代码签名。若出现「Windows 已保护你的电脑」，点「更多信息」，再点「仍要运行」。",
    "打开 Enclave，点「登录」，在弹出的浏览器页面中确认。",
  ],
  macos: [
    "打开下载好的 .dmg，把 Enclave 拖进「应用程序」。",
    "安装包尚未经过 Apple 公证。首次打开前，在「终端」中执行一次下面这行命令。",
    "打开 Enclave，点「登录」，在弹出的浏览器页面中确认。",
  ],
};

export default function DownloadPage() {
  return (
    <main>
      <PageHead
        eyebrow="下载"
        title="下载 Enclave"
        lead={
          RELEASE ? (
            <>
              当前版本 <span className="font-mono">{RELEASE.version}</span>，发布于 {RELEASE.date}。免费 3 个环境，无需绑卡。
            </>
          ) : (
            "Windows 与 macOS 安装包即将开放下载。现在可以先注册账号，发布后装好即可登录使用。"
          )
        }
      >
        {RELEASE ? null : (
          <Link href="/account#register" className="mt-7 inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
            先注册账号
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </PageHead>

      <section className="py-14 sm:py-16">
        <div className="site-wrap">
          <PlatformPicker release={RELEASE} />
        </div>
      </section>

      <section className="border-t border-border py-20">
        <div className="site-wrap grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">在 Windows 上安装</h2>
            <ol className="mt-5 grid gap-4">
              {STEPS.windows.map((s, i) => (
                <li key={s} className="grid grid-cols-[28px_1fr] gap-3 text-body">
                  <span className="grid size-7 place-items-center rounded-full bg-muted font-mono text-[13px] text-foreground">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">在 macOS 上安装</h2>
            <ol className="mt-5 grid gap-4">
              {STEPS.macos.map((s, i) => (
                <li key={s} className="grid grid-cols-[28px_1fr] gap-3 text-body">
                  <span className="grid size-7 place-items-center rounded-full bg-muted font-mono text-[13px] text-foreground">{i + 1}</span>
                  <span className="pt-0.5">
                    {s}
                    {i === 1 ? (
                      <code className="mt-2.5 block rounded-lg bg-navy px-3.5 py-2.5 font-mono text-[13px] text-navy-foreground">
                        xattr -cr /Applications/Enclave.app
                      </code>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted py-20">
        <div className="site-wrap grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">核对安装包</h2>
            <p className="mt-3 text-body">
              下载后算一次 SHA256，与上方公布的值一致，说明文件完整且未被替换。内核文件由工作台在启动前自动校验，无需手动核对。
            </p>
          </div>
          <div className="grid gap-4">
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">Windows（PowerShell）</p>
              <code className="mt-1.5 block rounded-lg bg-navy px-4 py-3 font-mono text-[13px] break-all text-navy-foreground">
                Get-FileHash .\Enclave_*.msi -Algorithm SHA256
              </code>
            </div>
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">macOS（终端）</p>
              <code className="mt-1.5 block rounded-lg bg-navy px-4 py-3 font-mono text-[13px] break-all text-navy-foreground">
                shasum -a 256 ~/Downloads/Enclave_*.dmg
              </code>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="site-wrap flex flex-wrap items-center justify-between gap-6">
          <p className="text-body">首次使用某个内核版本时，工作台会自动下载，并按官方签名的清单校验文件。</p>
          <Link href="/changelog" className="inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
            更新日志
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
