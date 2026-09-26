"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";

/*
 * 浏览器指纹检测：在本地读取网站能看到的那些值，一个字节都不上传。
 * 在 Enclave 的环境里打开，用来核对画像是否生效；在普通浏览器里打开，用来对比。
 */

type Row = { name: string; value: string; note?: string };
type Group = { title: string; rows: Row[] };

// FNV-1a，32 位。只用来把一大段数据压成一个好比对的短串。
const fnv = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

function canvasHash(unavailable: string): string {
  const c = document.createElement("canvas");
  c.width = 280;
  c.height = 60;
  const g = c.getContext("2d");
  if (!g) return unavailable;
  g.textBaseline = "top";
  g.font = "16px Arial";
  g.fillStyle = "#f60";
  g.fillRect(100, 1, 62, 20);
  g.fillStyle = "#069";
  g.fillText("Enclave 指纹 ✓ 1.0", 2, 15);
  g.fillStyle = "rgba(102, 204, 0, 0.7)";
  g.fillText("Enclave 指纹 ✓ 1.0", 4, 17);
  g.beginPath();
  g.arc(240, 30, 18, 0, Math.PI * 2);
  g.stroke();
  return fnv(c.toDataURL());
}

function webgl(unavailable: string): [string, string] {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") ?? c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return [unavailable, unavailable];
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return [String(vendor), String(renderer)];
  } catch {
    return [unavailable, unavailable];
  }
}

const FONTS: [string, string][] = [
  ["Segoe UI", "Windows"],
  ["Microsoft YaHei", "Windows"],
  ["SimSun", "Windows"],
  ["Calibri", "Windows"],
  ["Consolas", "Windows"],
  ["PingFang SC", "macOS"],
  ["Hiragino Sans GB", "macOS"],
  ["Helvetica Neue", "macOS"],
  ["Menlo", "macOS"],
  ["Avenir", "macOS"],
  ["DejaVu Sans", "Linux"],
  ["Liberation Sans", "Linux"],
  ["Ubuntu", "Linux"],
  ["WenQuanYi Micro Hei", "Linux"],
  ["Noto Sans CJK SC", "Linux"],
];

/** 量宽度判断字体在不在：和三种兜底字体都一样宽，就是没有。 */
function fonts(english: boolean): { found: string[]; guess: string } {
  const g = document.createElement("canvas").getContext("2d");
  if (!g) return { found: [], guess: english ? "Unavailable" : "无法检测" };
  const text = "mmmmmmmmmmlli 字体检测 1234";
  const base = ["monospace", "serif", "sans-serif"].map((b) => {
    g.font = `72px ${b}`;
    return g.measureText(text).width;
  });
  const found = FONTS.filter(([f]) =>
    ["monospace", "serif", "sans-serif"].some((b, i) => {
      g.font = `72px "${f}", ${b}`;
      return g.measureText(text).width !== base[i];
    }),
  );
  const score: Record<string, number> = {};
  for (const [, os] of found) score[os] = (score[os] ?? 0) + 1;
  const top = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return { found: found.map(([f]) => f), guess: top ? (english ? `Closest to ${top[0]}` : `更像 ${top[0]}`) : (english ? "No platform match" : "未识别到平台") };
}

/** 不连任何服务器，只看浏览器自己给出的本机候选地址。 */
async function webrtc(english: boolean): Promise<string> {
  if (typeof RTCPeerConnection === "undefined") return english ? "Unavailable" : "不可用";
  const pc = new RTCPeerConnection({ iceServers: [] });
  const found = new Set<string>();
  try {
    pc.createDataChannel("x");
    pc.onicecandidate = (e) => {
      const parts = e.candidate?.candidate.split(" ");
      if (parts && parts[4]) found.add(parts[4]);
    };
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise((r) => setTimeout(r, 1200));
  } catch {
    return english ? "Unavailable" : "不可用";
  } finally {
    pc.close();
  }
  const exposed = [...found].filter((a) => !a.endsWith(".local"));
  if (exposed.length) return english ? `Local address exposed: ${exposed.join(", ")}` : `暴露了本机地址：${exposed.join("、")}`;
  if (found.size) return english ? "Local address hidden by mDNS" : "本机地址已由 mDNS 隐藏";
  return english ? "No local candidate address produced" : "未产生本机候选地址";
}

type UAData = {
  brands?: { brand: string; version: string }[];
  platform?: string;
  mobile?: boolean;
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
};

async function collect(english: boolean): Promise<Group[]> {
  const nav = navigator as Navigator & { userAgentData?: UAData; deviceMemory?: number };
  const ua = nav.userAgentData;
  let high: Record<string, unknown> = {};
  try {
    high = (await ua?.getHighEntropyValues?.(["platformVersion", "architecture", "model", "fullVersionList"])) ?? {};
  } catch {
    high = {};
  }
  const unavailable = english ? "Unavailable" : "不可用";
  const [vendor, renderer] = webgl(unavailable);
  const f = fonts(english);
  const tz = Intl.DateTimeFormat().resolvedOptions();
  const offset = -new Date().getTimezoneOffset() / 60;

  return [
    {
      title: english ? "Identity" : "身份",
      rows: [
        { name: "User-Agent", value: navigator.userAgent },
        {
          name: english ? "Client Hints brands" : "Client Hints 品牌",
          value: ua?.brands?.map((b) => `${b.brand} ${b.version}`).join(english ? ", " : "、") || (english ? "Not provided" : "浏览器不提供"),
          note: english ? "Firefox does not provide Client Hints." : "Firefox 不提供 Client Hints，属于正常现象。",
        },
        {
          name: english ? "Client Hints platform" : "Client Hints 平台",
          value: ua?.platform ? `${ua.platform} ${String(high.platformVersion ?? "")}`.trim() : (english ? "Not provided" : "浏览器不提供"),
        },
        { name: "navigator.platform", value: navigator.platform || (english ? "Empty" : "空") },
      ],
    },
    {
      title: english ? "Locale" : "地区",
      rows: [
        { name: english ? "Timezone" : "时区", value: `${tz.timeZone} (UTC${offset >= 0 ? "+" : ""}${offset})` },
        { name: english ? "Languages" : "语言", value: navigator.languages?.join(english ? ", " : "、") || navigator.language },
        { name: english ? "Date and number formats" : "日期与数字格式", value: `${tz.locale} · ${new Date(Date.UTC(2026, 8, 24)).toLocaleDateString()} · ${(1234567.89).toLocaleString()}` },
      ],
    },
    {
      title: english ? "Display and hardware" : "屏幕与硬件",
      rows: [
        { name: english ? "Screen resolution" : "屏幕分辨率", value: `${screen.width} × ${screen.height} · ${english ? "available" : "可用"} ${screen.availWidth} × ${screen.availHeight}` },
        { name: english ? "Scale and color depth" : "缩放与色深", value: `${window.devicePixelRatio}× · ${screen.colorDepth} ${english ? "bit" : "位"}` },
        { name: english ? "Viewport" : "窗口", value: `${window.innerWidth} × ${window.innerHeight}` },
        { name: english ? "CPU cores" : "CPU 核数", value: String(navigator.hardwareConcurrency ?? (english ? "Not provided" : "不提供")) },
        {
          name: english ? "Memory" : "内存",
          value: nav.deviceMemory ? `${nav.deviceMemory} GB` : (english ? "Not provided" : "浏览器不提供"),
          note: english ? "Available in Chromium-based browsers only." : "只有 Chromium 类浏览器提供这一项。",
        },
        { name: english ? "WebGL vendor" : "WebGL 厂商", value: vendor },
        { name: english ? "WebGL renderer" : "WebGL 渲染器", value: renderer },
      ],
    },
    {
      title: english ? "Rendering and fonts" : "绘图与字体",
      rows: [
        {
          name: english ? "Canvas fingerprint" : "Canvas 指纹",
          value: canvasHash(unavailable),
          note: english ? "A stable value within one environment and different values across environments indicate that noise is active. Firefox may vary by session." : "同一环境内保持一致、不同环境之间结果不同，表示噪声已生效。Firefox 每次会话发生变化属于正常现象。",
        },
        { name: english ? "Fonts" : "字体", value: `${f.guess}: ${f.found.join(english ? ", " : "、") || (english ? "None" : "无")}`, note: english ? "The font set should match the reported platform." : "字体集合应与系统平台一致。" },
      ],
    },
    {
      title: english ? "Network and automation" : "网络与自动化",
      rows: [
        { name: "WebRTC", value: await webrtc(english), note: english ? "A proxied environment should not expose a local address." : "使用代理的环境不应暴露本机地址。" },
        { name: "navigator.webdriver", value: String(navigator.webdriver) },
        { name: "Cookie", value: navigator.cookieEnabled ? (english ? "Enabled" : "已启用") : (english ? "Disabled" : "已禁用") },
      ],
    },
  ];
}

export function FingerprintCheck() {
  const english = useLocale() === "en";
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(() => {
    setBusy(true);
    void collect(english).then((g) => {
      setGroups(g);
      setBusy(false);
    });
  }, [english]);

  useEffect(() => {
    let alive = true;
    void collect(english).then((g) => alive && setGroups(g));
    return () => {
      alive = false;
    };
  }, [english]);

  const text = groups ? groups.flatMap((g) => g.rows.map((r) => `${r.name}: ${r.value}`)).join("\n") : "";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" disabled={busy || !groups} onClick={run}>
          <RotateCw aria-hidden="true" />
          {busy ? (english ? "Checking…" : "检测中…") : (english ? "Run again" : "重新检测")}
        </Button>
        {groups ? <CopyButton value={text} label={english ? "Copy all results" : "复制全部结果"} /> : null}
      </div>
      {!groups ? (
        <div className="grid gap-3" aria-live="polite">
          <p className="text-muted-foreground">{english ? "Checking…" : "正在检测…"}</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-accent" />
          ))}
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.title} className="overflow-hidden rounded-xl border border-border bg-card">
            <h2 className="border-b border-border bg-muted px-5 py-3 text-[14px] font-semibold">{g.title}</h2>
            <dl>
              {g.rows.map((r) => (
                <div key={r.name} className="grid gap-1 border-b border-border px-5 py-3.5 last:border-0 md:grid-cols-[190px_1fr] md:gap-6">
                  <dt className="text-[14px] text-muted-foreground">{r.name}</dt>
                  <dd className="min-w-0">
                    <span className="font-mono text-[13px] break-all">{r.value}</span>
                    {r.note ? <span className="mt-1 block text-[13px] text-muted-foreground">{r.note}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))
      )}
    </div>
  );
}
