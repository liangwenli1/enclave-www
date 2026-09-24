"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
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

function canvasHash(): string {
  const c = document.createElement("canvas");
  c.width = 280;
  c.height = 60;
  const g = c.getContext("2d");
  if (!g) return "不可用";
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

function webgl(): [string, string] {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") ?? c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return ["不可用", "不可用"];
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return [String(vendor), String(renderer)];
  } catch {
    return ["不可用", "不可用"];
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
function fonts(): { found: string[]; guess: string } {
  const g = document.createElement("canvas").getContext("2d");
  if (!g) return { found: [], guess: "无法检测" };
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
  return { found: found.map(([f]) => f), guess: top ? `更像 ${top[0]}` : "一个都没认出来" };
}

/** 不连任何服务器，只看浏览器自己给出的本机候选地址。 */
async function webrtc(): Promise<string> {
  if (typeof RTCPeerConnection === "undefined") return "不可用";
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
    return "不可用";
  } finally {
    pc.close();
  }
  const exposed = [...found].filter((a) => !a.endsWith(".local"));
  if (exposed.length) return `暴露了本机地址：${exposed.join("、")}`;
  if (found.size) return "本机地址已隐藏（mDNS）";
  return "没有产生本机候选地址";
}

type UAData = {
  brands?: { brand: string; version: string }[];
  platform?: string;
  mobile?: boolean;
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
};

async function collect(): Promise<Group[]> {
  const nav = navigator as Navigator & { userAgentData?: UAData; deviceMemory?: number };
  const ua = nav.userAgentData;
  let high: Record<string, unknown> = {};
  try {
    high = (await ua?.getHighEntropyValues?.(["platformVersion", "architecture", "model", "fullVersionList"])) ?? {};
  } catch {
    high = {};
  }
  const [vendor, renderer] = webgl();
  const f = fonts();
  const tz = Intl.DateTimeFormat().resolvedOptions();
  const offset = -new Date().getTimezoneOffset() / 60;

  return [
    {
      title: "身份",
      rows: [
        { name: "User-Agent", value: navigator.userAgent },
        {
          name: "Client Hints 品牌",
          value: ua?.brands?.map((b) => `${b.brand} ${b.version}`).join("、") || "浏览器不提供",
          note: "Firefox 不提供 Client Hints，属于正常现象。",
        },
        {
          name: "Client Hints 平台",
          value: ua?.platform ? `${ua.platform} ${String(high.platformVersion ?? "")}`.trim() : "浏览器不提供",
        },
        { name: "navigator.platform", value: navigator.platform || "空" },
      ],
    },
    {
      title: "地区",
      rows: [
        { name: "时区", value: `${tz.timeZone}（UTC${offset >= 0 ? "+" : ""}${offset}）` },
        { name: "语言", value: navigator.languages?.join("、") || navigator.language },
        { name: "日期与数字格式", value: `${tz.locale} · ${new Date(Date.UTC(2026, 8, 24)).toLocaleDateString()} · ${(1234567.89).toLocaleString()}` },
      ],
    },
    {
      title: "屏幕与硬件",
      rows: [
        { name: "屏幕分辨率", value: `${screen.width} × ${screen.height}，可用 ${screen.availWidth} × ${screen.availHeight}` },
        { name: "缩放与色深", value: `${window.devicePixelRatio} 倍 · ${screen.colorDepth} 位` },
        { name: "窗口", value: `${window.innerWidth} × ${window.innerHeight}` },
        { name: "CPU 核数", value: String(navigator.hardwareConcurrency ?? "不提供") },
        {
          name: "内存",
          value: nav.deviceMemory ? `${nav.deviceMemory} GB` : "浏览器不提供",
          note: "只有 Chromium 类浏览器提供这一项。",
        },
        { name: "WebGL 厂商", value: vendor },
        { name: "WebGL 渲染器", value: renderer },
      ],
    },
    {
      title: "绘图与字体",
      rows: [
        {
          name: "Canvas 指纹",
          value: canvasHash(),
          note: "同一个环境每次相同、不同环境各不相同，说明噪声在起作用。Firefox 每次会话都会变化，属于正常现象。",
        },
        { name: "字体", value: `${f.guess}：${f.found.join("、") || "无"}`, note: "字体应与系统平台吻合。" },
      ],
    },
    {
      title: "网络与自动化",
      rows: [
        { name: "WebRTC", value: await webrtc(), note: "走代理的环境里不应暴露本机地址。" },
        { name: "navigator.webdriver", value: String(navigator.webdriver) },
        { name: "Cookie", value: navigator.cookieEnabled ? "已启用" : "已禁用" },
      ],
    },
  ];
}

export function FingerprintCheck() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(() => {
    setBusy(true);
    void collect().then((g) => {
      setGroups(g);
      setBusy(false);
    });
  }, []);

  useEffect(() => {
    let alive = true;
    void collect().then((g) => alive && setGroups(g));
    return () => {
      alive = false;
    };
  }, []);

  const text = groups ? groups.flatMap((g) => g.rows.map((r) => `${r.name}: ${r.value}`)).join("\n") : "";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" disabled={busy || !groups} onClick={run}>
          <RotateCw aria-hidden="true" />
          {busy ? "检测中…" : "重新检测"}
        </Button>
        {groups ? <CopyButton value={text} label="复制全部结果" /> : null}
      </div>
      {!groups ? (
        <div className="grid gap-3" aria-live="polite">
          <p className="text-muted-foreground">正在检测…</p>
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
