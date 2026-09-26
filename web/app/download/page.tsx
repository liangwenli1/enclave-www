import type { Metadata } from "next";
import { LocaleLink as Link } from "@/components/locale-link";
import { ArrowRight } from "lucide-react";
import { PageHead } from "@/components/page-head";
import { PlatformPicker } from "@/components/platform-picker";
import { RELEASE } from "@/lib/release";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return {
    title: english ? "Download" : "下载",
    description: english ? "Download Enclave for Windows 10/11 or macOS on Apple Silicon, with published SHA256 checksums." : "下载适用于 Windows 10/11 与 macOS（Apple Silicon）的 Enclave 工作台，并核对 SHA256。",
    alternates: { canonical: english ? "/en/download" : "/zh-cn/download", languages: { en: "/en/download", "zh-CN": "/zh-cn/download", "x-default": "/en/download" } },
  };
}

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

const STEPS_EN = {
  windows: [
    "Run the downloaded .msi installer and follow the setup instructions.",
    "The installer is not yet code-signed. If Windows SmartScreen appears, select “More info”, then “Run anyway”.",
    "Open Enclave, select “Sign in”, and confirm the request in the browser.",
  ],
  macos: [
    "Open the downloaded .dmg and drag Enclave into Applications.",
    "The installer is not yet notarized by Apple. Before the first launch, run the command below in Terminal.",
    "Open Enclave, select “Sign in”, and confirm the request in the browser.",
  ],
};

export default async function DownloadPage() {
  const english = (await getRequestLocale()) === "en";
  const steps = english ? STEPS_EN : STEPS;
  return (
    <main>
      <PageHead
        eyebrow={english ? "Download" : "下载"}
        title={english ? "Download Enclave" : "下载 Enclave"}
        lead={
          RELEASE ? (
            <>
              {english ? "Current version" : "当前版本"} <span className="font-mono">{RELEASE.version}</span>{english ? `, released ${RELEASE.date}. 3 environments free, no card required.` : `，发布于 ${RELEASE.date}。免费 3 个环境，无需绑卡。`}
            </>
          ) : (
            english ? "Windows and macOS installers will be available here." : "Windows 与 macOS 安装包即将开放下载。"
          )
        }
      >
        {RELEASE ? null : (
          <Link href="/account#register" className="mt-7 inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
            {english ? "Create an account" : "注册账号"}
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
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{english ? "Install on Windows" : "在 Windows 上安装"}</h2>
            <ol className="mt-5 grid gap-4">
              {steps.windows.map((s, i) => (
                <li key={s} className="grid grid-cols-[28px_1fr] gap-3 text-body">
                  <span className="grid size-7 place-items-center rounded-full bg-muted font-mono text-[13px] text-foreground">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{english ? "Install on macOS" : "在 macOS 上安装"}</h2>
            <ol className="mt-5 grid gap-4">
              {steps.macos.map((s, i) => (
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
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{english ? "Verify the installer" : "核对安装包"}</h2>
            <p className="mt-3 text-body">
              {english ? "Calculate the SHA256 checksum after download and compare it with the published value. Enclave verifies kernel files automatically before launch." : "下载后计算 SHA256，并与页面公布的值核对。工作台会在启动前自动校验内核文件。"}
            </p>
          </div>
          <div className="grid gap-4">
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">{english ? "Windows (PowerShell)" : "Windows（PowerShell）"}</p>
              <code className="mt-1.5 block rounded-lg bg-navy px-4 py-3 font-mono text-[13px] break-all text-navy-foreground">
                Get-FileHash .\Enclave_*.msi -Algorithm SHA256
              </code>
            </div>
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">{english ? "macOS (Terminal)" : "macOS（终端）"}</p>
              <code className="mt-1.5 block rounded-lg bg-navy px-4 py-3 font-mono text-[13px] break-all text-navy-foreground">
                shasum -a 256 ~/Downloads/Enclave_*.dmg
              </code>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="site-wrap flex flex-wrap items-center justify-between gap-6">
          <p className="text-body">{english ? "When an engine version is used for the first time, Enclave downloads it and verifies it against the signed manifest." : "首次使用某个内核版本时，工作台会自动下载并根据签名清单校验文件。"}</p>
          <Link href="/changelog" className="inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
            {english ? "Changelog" : "更新日志"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
