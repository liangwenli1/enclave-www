"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/lib/api";

/* 操作日志。谁什么时候在哪台电脑上开了哪个环境、谁动了成员和钥匙。
   记在服务器上，删不掉——能被删掉的审计日志没有意义。 */

type Event = {
  at: number;
  action: string;
  label: string;
  email: string;
  target: string;
  detail: string;
  device: string;
  ip: string;
};

type View = { events: Event[]; days: number };

// 筛选框里给几个常用的。别的动作照样记、照样显示，只是不单独列出来。
const FILTERS = [
  ["", "全部动作"],
  ["profile.start", "打开环境"],
  ["profile.denied", "打开被拒"],
  ["profile.stop", "关闭环境"],
  ["member.remove", "移出团队"],
  ["member.assign", "分配环境"],
  ["sync.rotate", "更换钥匙"],
] as const;

const when = (ms: number) =>
  new Date(ms).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function ActivityLog() {
  const [view, setView] = useState<View | null>(null);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [more, setMore] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const path = useCallback(
    (before?: number) =>
      `/events?limit=30${action ? `&action=${action}` : ""}${before ? `&before=${before}` : ""}`,
    [action],
  );

  useEffect(() => {
    let alive = true;
    api<View>(`/events?limit=30${action ? `&action=${action}` : ""}`).then(
      (v) => {
        if (!alive) return;
        setView(v);
        // 换了筛选：之前"看更早的"翻出来的那几页作废。
        setMore([]);
      },
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [action]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return <p className="text-muted-foreground">读取中…</p>;

  const rows = [...view.events, ...more];
  const last = rows.at(-1);

  return (
    <div className="grid gap-4">
      <div>
        <p className="www-overline">操作日志</p>
        <p className="www-note">
          谁什么时候在哪台电脑上开了哪个环境，以及成员和钥匙的变动。保留 {view.days} 天，
          删不掉——能删的日志没有意义。环境里做了什么我们看不到，也不记。
        </p>
      </div>

      <div className="max-w-[240px]">
        <NativeSelect
          className="w-full"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          aria-label="按动作筛选"
        >
          {FILTERS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {rows.length === 0 ? (
        <p className="www-note">还没有记录。</p>
      ) : (
        <div className="www-scroll">
          <table>
            <tbody>
              {rows.map((e, i) => (
                <tr key={`${e.at}-${i}`}>
                  <td className="www-mono whitespace-nowrap">{when(e.at)}</td>
                  <td className="whitespace-nowrap">{e.label || e.action}</td>
                  <td className="wrap">{e.email}</td>
                  <td className="wrap www-mono">{e.target}</td>
                  <td className="wrap text-muted-foreground">
                    {[e.device, e.detail].filter(Boolean).join(" · ")}
                  </td>
                  <td className="www-mono text-muted-foreground">{e.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length >= 30 && last ? (
        <div>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              api<View>(path(last.at)).then(
                (v) => {
                  setMore((old) => [...old, ...v.events]);
                  setLoading(false);
                },
                (e: Error) => {
                  setError(e.message);
                  setLoading(false);
                },
              );
            }}
          >
            {loading ? "读取中…" : "看更早的"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
