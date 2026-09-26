"use client";

import { LocaleLink as Link } from "@/components/locale-link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "cn";
import { ActivityLog } from "@/components/account/activity-log";
import { AuthForm, type AuthMode } from "@/components/account/auth-form";
import { useLocale } from "@/components/locale-provider";
import { TeamPanel } from "@/components/account/team-panel";
import { Boundary } from "@/components/boundary";
import { ErrorText, KeyValues, Meter, Muted, Panel } from "@/components/panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ApiError, type Me, type Plan, type ProfileRow } from "@/lib/api";
import { PLANS } from "@/lib/plans";

const fmtDate = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleDateString("zh-CN") : "不过期");

const ROLE: Record<string, string> = { owner: "所有者", admin: "管理员", operator: "操作员" };

type View =
  | { kind: "loading" }
  | { kind: "offline"; message: string }
  | { kind: "auth"; mode: AuthMode }
  | { kind: "account"; me: Me };

type State = { plans: Plan[]; online: string[]; view: View; scrollToUpgrade: boolean };

/** 问一次账号服务：有哪些档位、哪几档能在线买、现在是谁。不碰组件状态，调用方自己决定怎么用。 */
async function fetchState(): Promise<State> {
  // 套餐页的「订阅」带着 #upgrade 过来：已登录就滚到订阅那一块，没登录的先注册。下载页的「先注册」带 #register。
  const hash = window.location.hash;
  const wantsUpgrade = hash === "#upgrade";
  const wantsRegister = wantsUpgrade || hash === "#register";
  let plans: Plan[] = [];
  let online: string[] = [];
  try {
    const p = await api<{ plans: Plan[]; online?: string[] }>("/plans");
    plans = p.plans;
    online = p.online ?? [];
    const me = await api<Me>("/auth/me");
    if (me.user) return { plans, online, view: { kind: "account", me }, scrollToUpgrade: wantsUpgrade };
    return { plans, online, view: { kind: "auth", mode: wantsRegister ? "up" : "in" }, scrollToUpgrade: false };
  } catch (e) {
    const view: View =
      e instanceof ApiError && e.code === "UNAUTHENTICATED"
        ? { kind: "auth", mode: "in" }
        : { kind: "offline", message: e instanceof Error ? e.message : String(e) };
    return { plans, online, view, scrollToUpgrade: false };
  }
}

export function AccountPanel() {
  const english = useLocale() === "en";
  const [state, setState] = useState<State>({ plans: [], online: [], view: { kind: "loading" }, scrollToUpgrade: false });
  // 从套餐页带来的档位（?plan=pro）和从收银台回来的标记（?paid=1）。只在浏览器里读。
  const [query, setQuery] = useState<{ plan: string; paid: boolean }>({ plan: "", paid: false });

  const apply = useCallback((next: State) => {
    setState(next);
    if (next.scrollToUpgrade) requestAnimationFrame(() => document.getElementById("upgrade")?.scrollIntoView());
  }, []);

  const load = useCallback(async () => apply(await fetchState()), [apply]);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams(window.location.search);
    void fetchState().then((next) => {
      if (!alive) return;
      setQuery({ plan: q.get("plan") ?? "", paid: q.get("paid") === "1" });
      apply(next);
    });
    return () => {
      alive = false;
    };
  }, [apply]);

  const { view } = state;

  if (view.kind === "account") {
    return (
      <Account
        me={view.me}
        plans={state.plans}
        online={state.online}
        wanted={query.plan}
        paid={query.paid}
        reload={load}
        onError={(message) => setState((s) => ({ ...s, view: { kind: "offline", message } }))}
      />
    );
  }

  const [title, lead] =
    view.kind === "auth"
      ? view.mode === "up"
        ? [english ? "Create account" : "注册", english ? "Start on the free plan. No payment method required." : "注册后即开通免费档，无需绑定付款方式。"]
        : [english ? "Sign in" : "登录", english ? "Review your plan, usage, signed-in devices, and team." : "登录后查看档位、额度、已登录设备与团队。"]
      : view.kind === "offline"
        ? [english ? "Account service unavailable" : "账号服务暂时不可用", english ? "Open environments are unaffected. Creating or starting an environment will resume when service is restored." : "已打开的环境不受影响；服务恢复后可继续新建或启动环境。"]
        : [english ? "Account" : "账号", english ? "Loading account status…" : "正在读取账号状态…"];

  return (
    <div className="site-wrap grid min-h-[60vh] place-items-start justify-center py-14 sm:py-20">
      <div className="w-full max-w-[440px]">
        <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 text-body">{lead}</p>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-frame sm:p-8">
          {view.kind === "loading" ? (
            <div className="grid gap-3" aria-hidden="true">
              <div className="h-10 animate-pulse rounded-full bg-accent" />
              <div className="h-10 animate-pulse rounded-lg bg-accent" />
              <div className="h-10 animate-pulse rounded-lg bg-accent" />
            </div>
          ) : null}
          {view.kind === "offline" ? (
            <div className="grid gap-4">
              <ErrorText>{view.message}</ErrorText>
              <div>
                <Button variant="outline" onClick={() => void load()}>
                  {english ? "Try again" : "重试"}
                </Button>
              </div>
            </div>
          ) : null}
          {view.kind === "auth" ? (
            <AuthForm
              mode={view.mode}
              onMode={(mode) => setState((s) => ({ ...s, view: { kind: "auth", mode } }))}
              onDone={load}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Account({
  me,
  plans,
  online,
  wanted,
  paid,
  reload,
  onError,
}: {
  me: Me;
  plans: Plan[];
  online: string[];
  wanted: string;
  paid: boolean;
  reload: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { license, devices } = me;
  const role = me.user?.role ?? "owner";
  const owner = role === "owner";
  const manager = role !== "operator";

  const sections = [
    ["overview", "概览"],
    ["devices", "电脑"],
    ...(me.usage.profiles ? [["profiles", "环境"]] : []),
    ...(license.seats > 1 && manager ? [["team", "团队"]] : []),
    ...(manager ? [["activity", "操作日志"]] : []),
    ...(owner ? [["upgrade", "订阅"]] : []),
  ] as [string, string][];

  return (
    <div className="site-wrap py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em]">账号</h1>
          <p className="mt-1.5 truncate text-body">{me.user?.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {me.user?.isAdmin ? (
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/admin">
              管理后台
            </Link>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              api("/auth/logout", { method: "POST" }).then(reload, (e: Error) => onError(e.message));
            }}
          >
            退出登录
          </Button>
        </div>
      </div>

      {paid ? (
        <p role="status" className="mt-6 rounded-xl border border-ok/25 bg-[#e3f4ea] px-4 py-3 text-[14.5px] text-ok">
          付款已完成。档位在收到付款通知后更新，通常几秒内生效；没有变化时刷新本页。
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[180px_1fr] lg:gap-12">
        <nav aria-label="账号页目录" className="hidden lg:block">
          <ul className="sticky top-24 grid gap-0.5 text-[14.5px]">
            {sections.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="-mx-3 block rounded-lg px-3 py-1.5 text-body hover:bg-accent hover:text-foreground">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid min-w-0 gap-6">
          <Panel
            id="overview"
            title="概览"
            note="档位一经变更，工作台下一次新建或启动环境时即按新档位计算。环境里的数据始终保存在本机。"
          >
            <div className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
              <KeyValues
                rows={[
                  ["当前档位", <span key="p" className="font-medium">{license.label}</span>],
                  [
                    "到期",
                    license.expiredPlan
                      ? `${license.expiredPlan} 已于 ${fmtDate(license.expiredAt)} 到期`
                      : fmtDate(license.expiresAt),
                  ],
                  ["角色", ROLE[role] ?? role],
                  ...(license.seats > 1 ? ([["席位", `${license.seats} 人（含所有者）`]] as [string, string][]) : []),
                ]}
              />
              <div className="grid content-start gap-5">
                <Meter label="环境" used={me.usage.profiles} limit={license.envLimit} />
                <Meter label="正在运行" used={me.usage.running} limit={license.concurrent} />
                <Meter label="已登录的电脑" used={devices.length} limit={license.deviceLimit} />
              </div>
            </div>
          </Panel>

          <Devices devices={devices} reload={reload} />

          {me.usage.profiles ? (
            <Boundary name="环境">
              <Profiles devices={devices} onChanged={reload} />
            </Boundary>
          ) : null}

          {/* 席位大于一的档位才有团队；操作员看不到成员管理。 */}
          {license.seats > 1 && manager ? (
            <Boundary name="团队">
              <TeamPanel me={me} />
            </Boundary>
          ) : null}

          {/* 操作日志：所有者和管理员看得到。一个人用也有用——哪台电脑什么时候开了什么。 */}
          {manager ? (
            <Boundary name="操作日志">
              <ActivityLog />
            </Boundary>
          ) : null}

          {/* 付费、换卡、取消归所有者（一个人用的账号永远是所有者）。 */}
          {owner ? (
            <Boundary name="订阅">
              <Subscription me={me} plans={plans} online={online} wanted={wanted} />
            </Boundary>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Devices({ devices, reload }: { devices: Me["devices"]; reload: () => Promise<void> }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const unbind = async (id: string) => {
    setBusy(id);
    setError("");
    try {
      await api(`/devices/${encodeURIComponent(id)}`, { method: "DELETE" });
      await reload();
    } catch (e) {
      if (e instanceof ApiError && e.code === "UNAUTHENTICATED") await reload();
      else setError(`解绑失败：${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy("");
  };

  return (
    <Panel id="devices" title="电脑" note="换电脑、重装系统后，在这里解绑旧电脑，新电脑即可登录。" flush>
      {devices.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>最后在线</th>
                <th className="text-right">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td className="font-mono text-[13px] text-muted-foreground">{fmtDate(d.lastSeenAt)}</td>
                  <td className="text-right">
                    <Button variant="link" className="text-destructive" disabled={busy === d.id} onClick={() => void unbind(d.id)}>
                      {busy === d.id ? "解绑中…" : "解绑"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <Muted>
            还没有电脑登录。<Link href="/download" className="text-link hover:underline">安装工作台</Link>后点「登录」，会回到官网完成确认。
          </Muted>
        </div>
      )}
      {error ? (
        <div className="border-t border-border px-5 py-3 sm:px-6">
          <ErrorText>{error}</ErrorText>
        </div>
      ) : null}
    </Panel>
  );
}

/** 登记在账号下的环境。电脑丢了、重装了，占着的名额在这里收回来；环境里的数据不在服务器上，这里删的只是登记。 */
function Profiles({ devices, onChanged }: { devices: Me["devices"]; onChanged: () => Promise<void> }) {
  const [rows, setRows] = useState<ProfileRow[] | null>(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState("");

  useEffect(() => {
    let alive = true;
    api<{ profiles: ProfileRow[] }>("/profiles").then(
      (r) => alive && setRows(r.profiles),
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, []);

  const remove = async (id: string) => {
    setRemoving(id);
    setError("");
    try {
      await api(`/profiles/${encodeURIComponent(id)}`, { method: "DELETE" });
      setRows((list) => list?.filter((p) => p.id !== id) ?? null);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setRemoving("");
  };

  return (
    <Panel
      id="profiles"
      title="环境"
      note="平时在工作台里删除环境即可。电脑丢失或重装后，在这里释放名额：只删除登记，环境数据本来就不在服务器上。"
      flush
    >
      {rows ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>状态</th>
                <th className="text-right">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.name || "未命名"}</td>
                  <td className="text-[13.5px] text-muted-foreground">
                    {p.runningOn
                      ? `正在「${devices.find((d) => d.id === p.runningOn)?.name ?? "另一台电脑"}」上运行`
                      : `登记于 ${fmtDate(p.createdAt)}`}
                  </td>
                  <td className="text-right">
                    <Button
                      variant="link"
                      className="text-destructive"
                      disabled={removing === p.id || p.runningOn !== ""}
                      onClick={() => void remove(p.id)}
                    >
                      {removing === p.id ? "释放中…" : "释放名额"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 sm:p-6">{error ? null : <Muted>读取中…</Muted>}</div>
      )}
      {error ? (
        <div className="border-t border-border px-5 py-3 sm:px-6">
          <ErrorText>{error}</ErrorText>
        </div>
      ) : null}
    </Panel>
  );
}

/** 订阅：选一个档位去收银台；已经订阅的去支付通道的自助页换卡、取消、看账单。 */
function Subscription({ me, plans, online, wanted }: { me: Me; plans: Plan[]; online: string[]; wanted: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const current = me.license.plan;
  const price = (id: string) => PLANS.find((p) => p.plan === id)?.price;

  const go = async (key: string, path: string, body?: unknown) => {
    setError("");
    setBusy(key);
    try {
      const { url } = await api<{ url: string }>(path, { method: "POST", body });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy("");
    }
  };

  return (
    <Panel
      id="upgrade"
      title="订阅"
      note={
        me.billing.status === "canceled"
          ? `订阅已取消，${fmtDate(me.license.expiresAt)} 之前仍然有效。`
          : "按月订阅，随时可以取消。"
      }
      actions={
        me.billing.manageable ? (
          <Button variant="outline" size="sm" disabled={busy !== ""} onClick={() => void go("portal", "/billing/portal")}>
            {busy === "portal" ? "正在打开…" : "管理订阅"}
          </Button>
        ) : null
      }
      flush
    >
      <ul>
        {plans
          .filter((p) => p.plan !== "free")
          .map((p) => {
            const buyable = me.billing.available && online.includes(p.plan);
            return (
              <li
                key={p.plan}
                className={cn(
                  "grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-5 py-4 last:border-0 sm:px-6",
                  wanted === p.plan && p.plan !== current && "bg-chip/50",
                )}
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {p.label}
                    {price(p.plan) ? (
                      <span className="ml-2 font-mono text-[14px] font-normal text-muted-foreground">${price(p.plan)} / 月</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-muted-foreground">
                    {p.envLimit} 个环境，同时运行 {p.concurrent} 个，每人 {p.deviceLimit} 台电脑
                    {p.seats > 1 ? `，${p.seats} 个席位` : ""}
                  </p>
                </div>
                {p.plan === current ? (
                  <span className="rounded-full bg-chip px-3 py-1 text-[13px] font-medium text-chip-foreground">当前档位</span>
                ) : (
                  <Button
                    size="sm"
                    variant={wanted === p.plan || (!wanted && current === "free" && p.plan === "pro") ? "default" : "outline"}
                    disabled={!buyable || busy !== ""}
                    onClick={() => void go(p.plan, "/billing/checkout", { plan: p.plan })}
                  >
                    {busy === p.plan ? "正在打开收银台…" : buyable ? "订阅" : "暂未开通"}
                  </Button>
                )}
              </li>
            );
          })}
      </ul>
      {!me.billing.available ? (
        <div className="border-t border-border bg-muted px-5 py-3.5 sm:px-6">
          <Muted>
            在线订阅即将开放。现在需要付费档，可以
            <Link href="/contact" className="mx-0.5 text-link hover:underline">
              联系我们
            </Link>
            开通。
          </Muted>
        </div>
      ) : null}
      {error ? (
        <div className="border-t border-border px-5 py-3 sm:px-6">
          <ErrorText>{error}</ErrorText>
        </div>
      ) : null}
    </Panel>
  );
}
