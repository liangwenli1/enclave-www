import type { ReactNode } from "react";
import { Check, Clock3 } from "lucide-react";
import { cn } from "cn";
import { Glyph } from "@/components/brand";
import { Shot, WindowFrame } from "@/components/frame";
import { BatchIcon, FlowIcon, IsolationIcon, LockIcon, TeamIcon } from "@/components/icons";
import { Tour } from "@/components/home/tour";
import { getRequestLocale } from "@/lib/i18n/request-locale";

/* 功能导览的四块：左边一句好处 + 两三条要点，右边真实界面，外加一张放大的细节卡。 */

function Copy({ title, text, points }: { title: string; text: string; points: string[] }) {
  return (
    <div className="max-w-[30em]">
      <h3 className="text-[26px] leading-snug font-normal tracking-[-0.02em] sm:text-[30px]">{title}</h3>
      <p className="mt-4 text-body">{text}</p>
      <ul className="mt-6 grid gap-3 text-[15px] text-body">
        {points.map((p) => (
          <li key={p} className="grid grid-cols-[20px_1fr] gap-2">
            <Check className="mt-[5px] size-4 text-primary" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 画面 + 细节卡。宽屏上细节卡压在画面的角上；窄屏上排在画面下面。 */
function Visual({ children, detail, detailClass }: { children: ReactNode; detail: ReactNode; detailClass: string }) {
  return (
    <div className="relative lg:pb-10">
      {children}
      <div className={cn("mt-4 lg:absolute lg:mt-0 lg:w-[300px]", detailClass)}>{detail}</div>
    </div>
  );
}

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-[13px] shadow-float">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-foreground">{title}</span>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ExitDetail({ english }: { english: boolean }) {
  const rows: [string, string][] = [
    [english ? "Timezone" : "时区", "America/Los_Angeles"],
    [english ? "Language" : "语言", "en-US"],
    [english ? "Location" : "地理位置", "34.05, −118.24"],
  ];
  return (
    <Card title={english ? "Proxy exit detected" : "已识别代理出口"} aside={<span className="font-mono text-[12px] text-muted-foreground">104.28.51.7</span>}>
      <p className="text-body">{english ? "United States · Los Angeles" : "美国，洛杉矶"}</p>
      <dl className="mt-3 grid gap-2 border-t border-border pt-3">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[4.5em_1fr_16px] items-center gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono text-[12.5px]">{v}</dd>
            <Check className="size-4 text-ok" aria-label={english ? "Matched to exit" : "已跟随出口"} />
          </div>
        ))}
        <div className="grid grid-cols-[4.5em_1fr] items-center gap-2">
          <dt className="text-muted-foreground">WebRTC</dt>
          <dd>{english ? "Routed through the proxy without exposing the local address" : "仅通过代理连接，不暴露本机地址"}</dd>
        </div>
      </dl>
      <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#e3f4ea] px-3 py-2 text-ok">
        <Check className="size-3.5" aria-hidden="true" />
        {english ? "Timezone, language, and location matched to the exit" : "时区、语言与位置已按出口自动设置"}
      </p>
    </Card>
  );
}

function BatchDetail({ english }: { english: boolean }) {
  return (
    <Card title={english ? "Launch queue · US Stores" : "启动队列，美国店铺"} aside={<span className="font-mono text-[12px] text-muted-foreground">2 / 3</span>}>
      <ul className="grid gap-2">
        {(english ? ["US Store 01", "US Store 02"] : ["美国店铺 01", "美国店铺 02"]).map((n) => (
          <li key={n} className="flex items-center justify-between">
            <span>{n}</span>
            <span className="flex items-center gap-1 font-medium text-primary">
              <i className="size-1.5 rounded-full bg-primary" />
              {english ? "Started" : "已启动"}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between">
          <span>{english ? "US Store 03" : "美国店铺 03"}</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {english ? "Queued" : "排队中"}
          </span>
        </li>
      </ul>
      <p className="mt-3 rounded-lg bg-muted px-3 py-2 leading-relaxed text-body">
        {english ? "These environments share a proxy exit and will launch 24 seconds apart." : "三个环境共用同一代理出口，将错开启动；下一项将在 24 秒后开始。"}
      </p>
    </Card>
  );
}

function FlowDetail({ english }: { english: boolean }) {
  const log: [string, string][] = [
    [english ? "Open page" : "打开网页", english ? "0.9 s" : "0.9 秒"],
    [english ? "Wait for element" : "等待元素出现", english ? "1.4 s" : "1.4 秒"],
    [english ? "Click" : "点击", english ? "0.2 s" : "0.2 秒"],
    [english ? "Extract text → health" : "提取文本 → health", english ? "0.1 s" : "0.1 秒"],
    [english ? "Evaluate condition" : "条件判断", english ? "0.0 s" : "0.0 秒"],
  ];
  return (
    <Card title={english ? "Run log · US Store 01" : "运行记录，美国店铺 01"} aside={<span className="text-[12px] font-medium text-ok">{english ? "5 / 5 complete" : "5 / 5 步完成"}</span>}>
      <ol className="grid gap-1.5">
        {log.map(([step, t], i) => (
          <li key={step} className="grid grid-cols-[1.4em_1fr_auto] items-center gap-2">
            <span className="font-mono text-[12px] text-muted-foreground">{i + 1}</span>
            <span>{step}</span>
            <span className="font-mono text-[12px] text-muted-foreground">{t}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-border pt-3 text-body">
        <span className="font-mono text-[12.5px] text-chip-foreground">{"{{health}}"}</span> = {english ? "healthy" : "正常"}
      </p>
    </Card>
  );
}

const MEMBERS: [string, string, string[] | null][] = [
  ["owner@example.com", "所有者", null],
  ["lead@example.com", "管理员", null],
  ["us-store@example.com", "操作员", ["美国店铺"]],
  ["ads@example.com", "操作员", ["德国广告", "日本社媒"]],
];

function TeamPanel({ english }: { english: boolean }) {
  return (
    <div
      role="img"
      aria-label={english ? "Team access example showing owners, admins, and folder-scoped operators" : "团队权限示例：所有者和管理员可以访问全部环境，操作员只能访问已分配的文件夹"}
      className="overflow-hidden rounded-[14px] border border-input bg-card shadow-frame"
    >
      <div className="flex items-baseline justify-between border-b border-border bg-muted px-5 py-3.5">
        <span className="font-semibold">{english ? "Team members" : "团队成员"}</span>
        <span className="font-mono text-[12.5px] text-muted-foreground">{english ? "4 / 6 seats" : "4 / 6 个席位"}</span>
      </div>
      <ul className="px-5">
        {MEMBERS.map(([email, role, folders]) => (
          <li key={email} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border py-3.5 last:border-0">
            <div className="flex min-w-0 items-center gap-3">
              <Glyph seed={email.length * 977} className="size-7" />
              <div className="min-w-0">
                <p className="truncate text-[14.5px]">{email}</p>
                <p className="text-[12.5px] text-muted-foreground">{english ? ({ 所有者: "Owner", 管理员: "Admin", 操作员: "Operator" }[role] ?? role) : role}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {folders ? (
                folders.map((f) => (
                  <span key={f} className="rounded-full bg-chip px-2.5 py-0.5 text-[12.5px] whitespace-nowrap text-chip-foreground">
                    {english ? ({ 美国店铺: "US Stores", 德国广告: "DE Ads", 日本社媒: "JP Social" }[f] ?? f) : f}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-input px-2.5 py-0.5 text-[12.5px] whitespace-nowrap text-muted-foreground">
                  {english ? "All environments" : "全部环境"}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SyncDetail({ english }: { english: boolean }) {
  return (
    <Card title={english ? "Encrypted sync enabled" : "已启用加密同步"} aside={<LockIcon className="size-4 text-ok" />}>
      <p className="leading-relaxed text-body">{english ? "Login state and proxy credentials are encrypted locally before upload. The server stores ciphertext only." : "登录状态与代理密码在本机加密后上传，服务器只保存密文。"}</p>
      <p className="mt-3 border-t border-border pt-3 leading-relaxed text-body">
        {english ? "After ads@example.com was removed, keys were rotated for the 4 affected environments." : "移除 ads@example.com 后，相关 4 个环境已在后台更换密钥。"}
      </p>
    </Card>
  );
}

function Panel({ copy, visual }: { copy: ReactNode; visual: ReactNode }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[5fr_7fr] lg:gap-14">
      {copy}
      {visual}
    </div>
  );
}

export async function Product() {
  const english = (await getRequestLocale()) === "en";
  return (
    <section id="product" className="scroll-mt-20 py-24 sm:py-28">
      <div className="site-wrap">
        <div className="max-w-[40em]">
          <p className="eyebrow">{english ? "Product" : "产品"}</p>
          <h2 className="display-3 mt-3">{english ? "Manage every account from one workspace" : "一个工作台，管理所有账号"}</h2>
        </div>
        <div className="mt-10">
          <Tour
            items={[
              {
                key: "isolation",
                label: english ? "Isolation" : "环境隔离",
                icon: <IsolationIcon />,
                panel: (
                  <Panel
                    copy={
                      <Copy
                        title={english ? "Bind a proxy; Enclave aligns the environment" : "绑定代理，其余设置自动对齐"}
                        text={english ? "Each environment keeps its own fingerprint, cookies, and cache. Timezone, language, and location follow the proxy exit." : "每个环境拥有独立的指纹、Cookie 与缓存。时区、语言和位置可跟随代理出口自动设置。"}
                        points={english ? ["Choose a stable or noise-adjusted Canvas profile", "Route WebRTC through the proxy without exposing the local address", "Verify kernel files before every launch"] : ["按环境选择稳定或加噪的 Canvas 配置", "WebRTC 仅通过代理连接，不暴露本机地址", "每次启动前校验内核文件"]}
                      />
                    }
                    visual={
                      <Visual detail={<ExitDetail english={english} />} detailClass="lg:-bottom-2 lg:-left-10">
                        <WindowFrame os="macos">
                          <Shot src="/shots/fp.webp" alt={english ? "Fingerprint settings for system, browser brand, Canvas, location, locale, and timezone matched to a Los Angeles exit" : "环境详情的指纹页：系统、品牌、Canvas、地理位置、地区与时区，出口识别为洛杉矶"} />
                        </WindowFrame>
                      </Visual>
                    }
                  />
                ),
              },
              {
                key: "batch",
                label: english ? "Batch actions" : "批量执行",
                icon: <BatchIcon />,
                panel: (
                  <Panel
                    copy={
                      <Copy
                        title={english ? "Run actions across an entire folder" : "一次处理整个文件夹"}
                        text={english ? "Start, stop, or run a workflow across selected environments. Capacity limits queue automatically, while shared proxy exits launch in sequence." : "批量启动、停止或运行流程。达到并发上限时自动排队；共用代理出口的环境会错开启动。"}
                        points={english ? ["Process up to 200 environments per batch", "Retry recoverable conditions and report permanent failures clearly"] : ["单批最多处理 200 个环境，并可调整并发数", "仅重试可恢复问题，永久失败会明确说明原因"]}
                      />
                    }
                    visual={
                      <Visual detail={<BatchDetail english={english} />} detailClass="lg:-bottom-2 lg:-left-10">
                        <WindowFrame os="macos">
                          <Shot src="/shots/batch.webp" alt={english ? "Batch action panel showing three US Store environments completing a daily sign-in workflow" : "批量执行面板：美国店铺文件夹里的三个环境都已跑完「店铺每日签到」流程"} />
                        </WindowFrame>
                      </Visual>
                    }
                  />
                ),
              },
              {
                key: "flow",
                label: english ? "Automation" : "自动化",
                icon: <FlowIcon />,
                panel: (
                  <Panel
                    copy={
                      <Copy
                        title={english ? "Turn repetitive work into a reusable workflow" : "将重复操作整理为流程"}
                        text={english ? "Combine navigation, clicks, input, waits, extraction, conditions, and loops without writing code. Configure retries or termination per step." : "通过打开网页、点击、输入、等待、提取、条件和循环构建流程，无需编写代码。每一步可单独设置失败处理方式。"}
                        points={english ? ["Run the same workflow on both engine families", "Store extracted text as variables for later steps"] : ["同一流程可在两类内核上运行", "提取结果可保存为变量供后续步骤使用"]}
                      />
                    }
                    visual={
                      <Visual detail={<FlowDetail english={english} />} detailClass="lg:-bottom-2 lg:-left-10">
                        <WindowFrame os="macos">
                          <Shot src="/shots/flow.webp" alt={english ? "Automation workflow with navigation, wait, click, and text-extraction steps" : "自动化页：「店铺每日签到」流程的步骤，打开网页、等待元素出现、点击、提取文本"} />
                        </WindowFrame>
                      </Visual>
                    }
                  />
                ),
              },
              {
                key: "team",
                label: english ? "Team access" : "团队协作",
                icon: <TeamIcon />,
                panel: (
                  <Panel
                    copy={
                      <Copy
                        title={english ? "Give each member access only to assigned work" : "成员只能访问已分配的环境"}
                        text={english ? "Grant access by folder. New environments inherit folder permissions. Operators can run environments without seeing proxy passwords or exporting packages." : "按文件夹分配权限，新建环境自动继承文件夹授权。操作员可以启动环境，但不能查看代理密码或导出环境包。"}
                        points={english ? ["Keep login state available across authorized devices", "Audit who opened each environment and from which device"] : ["登录状态可在已授权设备间同步", "操作日志记录环境、成员与设备"]}
                      />
                    }
                    visual={
                      <Visual detail={<SyncDetail english={english} />} detailClass="lg:-bottom-6 lg:-left-10">
                        <TeamPanel english={english} />
                      </Visual>
                    }
                  />
                ),
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
