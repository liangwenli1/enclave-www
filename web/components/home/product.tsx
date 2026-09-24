import type { ReactNode } from "react";
import { Check, Clock3 } from "lucide-react";
import { cn } from "cn";
import { Glyph } from "@/components/brand";
import { Shot, WindowFrame } from "@/components/frame";
import { BatchIcon, FlowIcon, IsolationIcon, LockIcon, TeamIcon } from "@/components/icons";
import { Tour } from "@/components/home/tour";

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

function ExitDetail() {
  const rows: [string, string][] = [
    ["时区", "America/Los_Angeles"],
    ["语言", "en-US"],
    ["地理位置", "34.05, −118.24"],
  ];
  return (
    <Card title="代理出口已识别" aside={<span className="font-mono text-[12px] text-muted-foreground">104.28.51.7</span>}>
      <p className="text-body">美国 · 洛杉矶</p>
      <dl className="mt-3 grid gap-2 border-t border-border pt-3">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[4.5em_1fr_16px] items-center gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono text-[12.5px]">{v}</dd>
            <Check className="size-4 text-ok" aria-label="已跟随出口" />
          </div>
        ))}
        <div className="grid grid-cols-[4.5em_1fr] items-center gap-2">
          <dt className="text-muted-foreground">WebRTC</dt>
          <dd>只走代理，本机地址不外露</dd>
        </div>
      </dl>
      <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#e3f4ea] px-3 py-2 text-ok">
        <Check className="size-3.5" aria-hidden="true" />
        时区、语言、定位已按出口自动设置
      </p>
    </Card>
  );
}

function BatchDetail() {
  return (
    <Card title="启动队列 · 美国店铺" aside={<span className="font-mono text-[12px] text-muted-foreground">2 / 3</span>}>
      <ul className="grid gap-2">
        {["美国店铺 01", "美国店铺 02"].map((n) => (
          <li key={n} className="flex items-center justify-between">
            <span>{n}</span>
            <span className="flex items-center gap-1 font-medium text-primary">
              <i className="size-1.5 rounded-full bg-primary" />
              已启动
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between">
          <span>美国店铺 03</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock3 className="size-3.5" aria-hidden="true" />
            排队中
          </span>
        </li>
      </ul>
      <p className="mt-3 rounded-lg bg-muted px-3 py-2 leading-relaxed text-body">
        三个环境走同一个代理出口，错开启动，24 秒后开始。
      </p>
    </Card>
  );
}

function FlowDetail() {
  const log: [string, string][] = [
    ["打开网页", "0.9 秒"],
    ["等待元素出现", "1.4 秒"],
    ["点击", "0.2 秒"],
    ["提取文本 → health", "0.1 秒"],
    ["条件判断", "0.0 秒"],
  ];
  return (
    <Card title="运行记录 · 美国店铺 01" aside={<span className="text-[12px] font-medium text-ok">5 / 5 步完成</span>}>
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
        <span className="font-mono text-[12.5px] text-chip-foreground">{"{{health}}"}</span> = 良好
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

function TeamPanel() {
  return (
    <div
      role="img"
      aria-label="团队成员示意：所有者和管理员看得到全部环境，两位操作员各自只看得到分配给自己的文件夹"
      className="overflow-hidden rounded-[14px] border border-input bg-card shadow-frame"
    >
      <div className="flex items-baseline justify-between border-b border-border bg-muted px-5 py-3.5">
        <span className="font-semibold">团队成员</span>
        <span className="font-mono text-[12.5px] text-muted-foreground">4 / 6 个席位</span>
      </div>
      <ul className="px-5">
        {MEMBERS.map(([email, role, folders]) => (
          <li key={email} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border py-3.5 last:border-0">
            <div className="flex min-w-0 items-center gap-3">
              <Glyph seed={email.length * 977} className="size-7" />
              <div className="min-w-0">
                <p className="truncate text-[14.5px]">{email}</p>
                <p className="text-[12.5px] text-muted-foreground">{role}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {folders ? (
                folders.map((f) => (
                  <span key={f} className="rounded-full bg-chip px-2.5 py-0.5 text-[12.5px] whitespace-nowrap text-chip-foreground">
                    {f}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-input px-2.5 py-0.5 text-[12.5px] whitespace-nowrap text-muted-foreground">
                  全部环境
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SyncDetail() {
  return (
    <Card title="同步已开启" aside={<LockIcon className="size-4 text-ok" />}>
      <p className="leading-relaxed text-body">登录态与代理密码在本机加密后上传，服务器只保存密文。</p>
      <p className="mt-3 border-t border-border pt-3 leading-relaxed text-body">
        移出 ads@example.com 后，其经手的 4 个环境已在后台更换密钥。
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

export function Product() {
  return (
    <section id="product" className="scroll-mt-20 py-24 sm:py-28">
      <div className="site-wrap">
        <div className="max-w-[40em]">
          <p className="eyebrow">产品</p>
          <h2 className="display-3 mt-3">一个工作台，管好所有账号</h2>
        </div>
        <div className="mt-10">
          <Tour
            items={[
              {
                key: "isolation",
                label: "环境隔离",
                icon: <IsolationIcon />,
                panel: (
                  <Panel
                    copy={
                      <Copy
                        title="绑上代理，其余自动对齐"
                        text="每个环境的指纹、Cookie、缓存各自独立。时区、语言、地理位置跟着代理出口走：IP 在洛杉矶，浏览器就在洛杉矶。"
                        points={[
                          "Canvas 加噪声或保持真实，逐个环境选择",
                          "WebRTC 只走代理，不暴露本机地址",
                          "内核启动前校验文件，被改动过就拒绝启动",
                        ]}
                      />
                    }
                    visual={
                      <Visual detail={<ExitDetail />} detailClass="lg:-bottom-2 lg:-left-10">
                        <WindowFrame os="macos">
                          <Shot src="/shots/fp.webp" alt="环境详情的指纹页：系统、品牌、Canvas、地理位置、地区与时区，出口识别为洛杉矶" />
                        </WindowFrame>
                      </Visual>
                    }
                  />
                ),
              },
              {
                key: "batch",
                label: "批量执行",
                icon: <BatchIcon />,
                panel: (
                  <Panel
                    copy={
                      <Copy
                        title="一整个文件夹的环境，一次点完"
                        text="选中一批环境，一起启动、停止或运行流程。同时运行数满了自动排队；同一个代理出口自动错开，不会在同一秒冒出一片登录。"
                        points={["一批最多 200 个环境，同时启动数可调", "只对短暂的问题重试，真正的失败直接写明原因"]}
                      />
                    }
                    visual={
                      <Visual detail={<BatchDetail />} detailClass="lg:-bottom-2 lg:-left-10">
                        <WindowFrame os="macos">
                          <Shot src="/shots/batch.webp" alt="批量执行面板：美国店铺文件夹里的三个环境都已跑完「店铺每日签到」流程" />
                        </WindowFrame>
                      </Visual>
                    }
                  />
                ),
              },
              {
                key: "flow",
                label: "自动化",
                icon: <FlowIcon />,
                panel: (
                  <Panel
                    copy={
                      <Copy
                        title="每天重复的操作，写成一次流程"
                        text="打开网页、点击、输入、等待、提取文字、条件判断、循环，十种步骤拼成一条流程，不必写代码。失败时重试、跳过还是终止，每一步单独设置。"
                        points={["同一条流程在两类内核上都能运行", "提取到的文字存成变量，后续步骤直接引用"]}
                      />
                    }
                    visual={
                      <Visual detail={<FlowDetail />} detailClass="lg:-bottom-2 lg:-left-10">
                        <WindowFrame os="macos">
                          <Shot src="/shots/flow.webp" alt="自动化页：「店铺每日签到」流程的步骤，打开网页、等待元素出现、点击、提取文本" />
                        </WindowFrame>
                      </Visual>
                    }
                  />
                ),
              },
              {
                key: "team",
                label: "团队协作",
                icon: <TeamIcon />,
                panel: (
                  <Panel
                    copy={
                      <Copy
                        title="员工只看得到分给自己的店铺"
                        text="按文件夹授权，新建进文件夹的环境自动跟着授权走。操作员能打开环境，看不到代理密码，也导不出环境包。"
                        points={["换一台电脑，登录态仍在，无需逐个重新登录", "操作日志记录谁在哪台电脑上打开了哪个环境"]}
                      />
                    }
                    visual={
                      <Visual detail={<SyncDetail />} detailClass="lg:-bottom-6 lg:-left-10">
                        <TeamPanel />
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
