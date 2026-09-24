"use client";

import { useEffect, useState } from "react";
import { ErrorText, Muted, Panel } from "@/components/panel";
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

const PAGE = 30;

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
  new Date(ms).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

const path = (action: string, before?: number) =>
  `/events?limit=${PAGE}${action ? `&action=${action}` : ""}${before ? `&before=${before}` : ""}`;

export function ActivityLog() {
  const [view, setView] = useState<View | null>(null);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [more, setMore] = useState<Event[]>([]);
  // 最近一页不满一页，说明已经翻到底了。
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    api<View>(path(action)).then(
      (v) => {
        if (!alive) return;
        setView(v);
        // 换了筛选：之前「查看更早的」翻出来的那几页作废。
        setMore([]);
        setExhausted(v.events.length < PAGE);
      },
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [action]);

  const rows = view ? [...view.events, ...more] : [];
  const last = rows.at(-1);

  return (
    <Panel
      id="activity"
      title="操作日志"
      note={`谁在什么时候、哪台电脑上打开了哪个环境，以及成员与密钥的变动。保留 ${view?.days ?? 90} 天，不可删除。环境里浏览的内容不记录。`}
      actions={
        <NativeSelect className="w-[150px]" value={action} onChange={(e) => setAction(e.target.value)} aria-label="按动作筛选">
          {FILTERS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </NativeSelect>
      }
      flush
    >
      {error ? (
        <div className="p-5 sm:p-6">
          <ErrorText>{error}</ErrorText>
        </div>
      ) : !view ? (
        <div className="p-5 sm:p-6">
          <Muted>读取中…</Muted>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-5 sm:p-6">
          <Muted>还没有记录。</Muted>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>动作</th>
                <th>操作人</th>
                <th>对象</th>
                <th>电脑与说明</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={`${e.at}-${i}`}>
                  <td className="font-mono text-[13px] whitespace-nowrap">{when(e.at)}</td>
                  <td className="whitespace-nowrap">{e.label || e.action}</td>
                  <td className="break-all">{e.email}</td>
                  <td className="font-mono text-[13px] break-all">{e.target}</td>
                  <td className="text-muted-foreground">{[e.device, e.detail].filter(Boolean).join(" · ")}</td>
                  <td className="font-mono text-[13px] text-muted-foreground">{e.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view && !exhausted && last ? (
        <div className="border-t border-border px-5 py-3 sm:px-6">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              api<View>(path(action, last.at)).then(
                (v) => {
                  setMore((old) => [...old, ...v.events]);
                  setExhausted(v.events.length < PAGE);
                  setLoading(false);
                },
                (e: Error) => {
                  setError(e.message);
                  setLoading(false);
                },
              );
            }}
          >
            {loading ? "读取中…" : "查看更早的"}
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
