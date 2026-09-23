"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError, type Me, type Plan, type ProfileRow } from "@/lib/api";
import { TeamPanel } from "@/components/team-panel";
import { ActivityLog } from "@/components/activity-log";
import { Boundary } from "@/components/boundary";

const fmtDate = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleDateString("zh-CN") : "不过期";

type View =
  | { kind: "loading" }
  | { kind: "offline"; message: string }
  | { kind: "auth"; mode: "in" | "up" }
  | { kind: "account"; me: Me };

const HEAD: Record<View["kind"], [string, string]> = {
  loading: ["账号", "正在读取账号状态…"],
  offline: [
    "账号服务暂时不可用",
    "稍后再试。已经在运行的环境不受影响，新建和启动要等它恢复。",
  ],
  auth: ["登录", "登录后可以订阅、查看档位和已绑定的设备。"],
  account: [
    "账号",
    "此处的套餐一经变更，工作台即时生效。环境中的数据始终保存在本机。",
  ],
};

/** 问一次账号服务：有哪些档位、现在是谁。不碰任何组件状态，调用方自己决定怎么用结果。 */
async function fetchState(): Promise<{
  plans: Plan[];
  view: View;
  scrollToUpgrade: boolean;
}> {
  // 套餐页的「申请开通」带着 #upgrade 过来：已登录就滚到申请表，没登录的先注册。
  const wantsUpgrade = window.location.hash === "#upgrade";
  let plans: Plan[] = [];
  try {
    plans = (await api<{ plans: Plan[] }>("/plans")).plans;
    const me = await api<Me>("/auth/me");
    if (me.user)
      return {
        plans,
        view: { kind: "account", me },
        scrollToUpgrade: wantsUpgrade,
      };
    return {
      plans,
      view: { kind: "auth", mode: wantsUpgrade ? "up" : "in" },
      scrollToUpgrade: false,
    };
  } catch (e) {
    const view: View =
      e instanceof ApiError && e.code === "UNAUTHENTICATED"
        ? { kind: "auth", mode: "in" }
        : {
            kind: "offline",
            message: e instanceof Error ? e.message : String(e),
          };
    return { plans, view, scrollToUpgrade: false };
  }
}

export function AccountPanel() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [plans, setPlans] = useState<Plan[]>([]);

  const load = useCallback(async () => {
    const next = await fetchState();
    setPlans(next.plans);
    setView(next.view);
    if (next.scrollToUpgrade)
      requestAnimationFrame(() =>
        document.getElementById("upgrade")?.scrollIntoView(),
      );
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchState().then((next) => {
      if (!alive) return;
      setPlans(next.plans);
      setView(next.view);
      if (next.scrollToUpgrade)
        requestAnimationFrame(() =>
          document.getElementById("upgrade")?.scrollIntoView(),
        );
    });
    return () => {
      alive = false;
    };
  }, []);

  const [title, lead] =
    view.kind === "auth" && view.mode === "up"
      ? ["注册", "注册即开通免费档：3 个环境、1 个同时运行，不需要付费。"]
      : HEAD[view.kind];

  return (
    <>
      <section className="www-hero www-hero-page">
        <h1>{title}</h1>
        <p className="www-lead">{lead}</p>
      </section>
      <section className="www-section">
        <div className="max-w-[560px] rounded-xl border border-input p-7">
          {view.kind === "loading" ? (
            <p className="text-muted-foreground">读取中…</p>
          ) : null}
          {view.kind === "offline" ? (
            <div className="grid gap-4">
              <p className="text-sm text-destructive">{view.message}</p>
              <div>
                <Button variant="outline" onClick={() => void load()}>
                  重试
                </Button>
              </div>
            </div>
          ) : null}
          {view.kind === "auth" ? (
            <AuthForm
              mode={view.mode}
              onMode={(mode) => setView({ kind: "auth", mode })}
              onDone={load}
            />
          ) : null}
          {view.kind === "account" ? (
            <Account
              me={view.me}
              plans={plans}
              reload={load}
              onError={(message) => setView({ kind: "offline", message })}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}

export function AuthForm({
  mode,
  onMode,
  onDone,
}: {
  mode: "in" | "up";
  onMode: (m: "in" | "up") => void;
  onDone: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    try {
      await api(mode === "in" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: {
          email: String(form.get("email")).trim().toLowerCase(),
          password: String(form.get("password")),
        },
      });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  };

  return (
    <div className="grid gap-5">
      <div
        className="inline-flex w-fit rounded-md border border-input"
        role="tablist"
      >
        {(
          [
            ["in", "登录"],
            ["up", "注册"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => onMode(key)}
            className={
              mode === key
                ? "bg-foreground px-4 py-2 text-sm font-semibold text-background"
                : "px-4 py-2 text-sm text-body hover:bg-muted"
            }
          >
            {label}
          </button>
        ))}
      </div>
      <form className="grid gap-4" onSubmit={(e) => void submit(e)}>
        <Field id="email" label="邮箱">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
          />
        </Field>
        <Field
          id="password"
          label={mode === "up" ? "密码（至少 10 位）" : "密码"}
        >
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "up" ? 10 : 1}
            autoComplete={mode === "up" ? "new-password" : "current-password"}
          />
        </Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button size="lg" type="submit" disabled={busy}>
          {busy ? "处理中…" : mode === "in" ? "登录" : "注册并开通免费档"}
        </Button>
      </form>
    </div>
  );
}

function Account({
  me,
  plans,
  reload,
  onError,
}: {
  me: Me;
  plans: Plan[];
  reload: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { license, devices } = me;
  const [unbindError, setUnbindError] = useState("");
  const [unbinding, setUnbinding] = useState("");

  const unbind = async (id: string) => {
    setUnbinding(id);
    setUnbindError("");
    try {
      await api(`/devices/${encodeURIComponent(id)}`, { method: "DELETE" });
      await reload();
    } catch (e) {
      if (e instanceof ApiError && e.code === "UNAUTHENTICATED") await reload();
      else
        setUnbindError(
          `没解绑成：${e instanceof Error ? e.message : String(e)}`,
        );
    }
    setUnbinding("");
  };

  return (
    <div className="grid gap-6">
      <div>
        <p className="www-overline">已登录</p>
        <h3 className="text-lg font-bold">{me.user?.email}</h3>
      </div>
      <table className="www-kv">
        <tbody>
          {(
            [
              ["当前档位", license.label],
              [
                "额度",
                `${license.envLimit} 个环境，${license.concurrent} 个同时运行`,
              ],
              [
                "到期",
                license.expiredPlan
                  ? `${license.expiredPlan} 已于 ${fmtDate(license.expiredAt)} 到期`
                  : fmtDate(license.expiresAt),
              ],
              ["环境", `${me.usage.profiles} / ${license.envLimit}`],
              ["正在运行", `${me.usage.running} / ${license.concurrent}`],
              ["已绑设备", `${devices.length} / ${license.deviceLimit}`],
              ...(license.seats > 1
                ? ([["席位", `${license.seats} 人（含所有者）`]] as const)
                : []),
            ] as const
          ).map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {devices.length ? (
        <div>
          <p className="www-overline">设备</p>
          <table>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td className="www-mono">{fmtDate(d.lastSeenAt)}</td>
                  <td className="text-right">
                    <Button
                      variant="link"
                      className="text-destructive"
                      disabled={unbinding === d.id}
                      onClick={() => void unbind(d.id)}
                    >
                      {unbinding === d.id ? "解绑中…" : "解绑"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {unbindError ? (
            <p className="mt-3 text-sm text-destructive">{unbindError}</p>
          ) : null}
        </div>
      ) : (
        <p className="www-note">
          尚无设备登录。安装工作台后点击「登录」，将返回此页面完成确认。
        </p>
      )}

      {me.usage.profiles ? (
        <Boundary name="环境">
          <Profiles devices={devices} onChanged={reload} />
        </Boundary>
      ) : null}

      {/* 席位大于一的档位才有团队；操作员看不到成员管理。 */}
      {license.seats > 1 && me.user?.role !== "operator" ? (
        <Boundary name="团队">
          <TeamPanel me={me} />
        </Boundary>
      ) : null}

      {/* 操作日志：所有者和管理员看得到。一个人用也有用——哪台电脑什么时候开了什么。 */}
      {me.user?.role !== "operator" ? (
        <Boundary name="操作日志">
          <ActivityLog />
        </Boundary>
      ) : null}

      <Boundary name="订阅">
        <Subscription me={me} plans={plans} />
      </Boundary>

      <div className="flex flex-wrap gap-2">
        {me.user?.isAdmin ? (
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/admin"
          >
            管理后台
          </Link>
        ) : null}
        <Button
          variant="outline"
          onClick={() => {
            api("/auth/logout", { method: "POST" }).then(reload, (e: Error) =>
              onError(e.message),
            );
          }}
        >
          退出登录
        </Button>
      </div>
    </div>
  );
}

/** 登记在账号下的环境。电脑丢了、重装了，占着的名额在这里收回来；环境里的数据不在服务器上，这里删的只是登记。 */
function Profiles({
  devices,
  onChanged,
}: {
  devices: Me["devices"];
  onChanged: () => Promise<void>;
}) {
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
    <div>
      <p className="www-overline">环境</p>
      {rows ? (
        <table>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name || "未命名"}</td>
                <td className="text-sm text-muted-foreground">
                  {p.runningOn
                    ? `正在「${devices.find((d) => d.id === p.runningOn)?.name ?? "另一台电脑"}」上运行`
                    : fmtDate(p.createdAt)}
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
      ) : null}
      <p className="www-note">
        平时在工作台里删环境就行。这里是给换了电脑、重装了系统的情况：释放的只是名额，环境里的数据本来就不在我们这里。
      </p>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/** 订阅：选一个档位去收银台；已经订阅的去支付通道的自助页换卡、取消、看账单。 */
function Subscription({ me, plans }: { me: Me; plans: Plan[] }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const current = me.license.plan;

  const go = async (key: string, path: string, body?: unknown) => {
    setError("");
    setBusy(key);
    try {
      const { url } = await api<{ url: string }>(path, {
        method: "POST",
        body,
      });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy("");
    }
  };

  return (
    <div id="upgrade" className="grid gap-3">
      <p className="www-overline">订阅</p>
      {me.billing.status === "canceled" ? (
        <p className="text-sm text-warn">
          订阅已取消，{fmtDate(me.license.expiresAt)} 之前仍然有效。
        </p>
      ) : null}
      <table>
        <tbody>
          {plans
            .filter((p) => p.plan !== "free")
            .map((p) => (
              <tr key={p.plan}>
                <td>
                  <b className="text-foreground">{p.label}</b>
                  <div className="text-sm text-muted-foreground">
                    {p.envLimit} 个环境，{p.concurrent} 个同时运行，
                    {p.deviceLimit} 台电脑
                  </div>
                </td>
                <td className="text-right">
                  {p.plan === current ? (
                    <span className="text-sm font-medium text-link">
                      当前档位
                    </span>
                  ) : (
                    <Button
                      variant={
                        current === "free" && p.plan === "pro"
                          ? "default"
                          : "outline"
                      }
                      disabled={!me.billing.available || busy !== ""}
                      title={
                        me.billing.available
                          ? undefined
                          : "在线订阅尚未开通，请通过下方的联系表单与我们联系"
                      }
                      onClick={() =>
                        void go(p.plan, "/billing/checkout", { plan: p.plan })
                      }
                    >
                      {busy === p.plan ? "正在打开收银台…" : "订阅"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {me.billing.manageable ? (
        <div>
          <Button
            variant="outline"
            disabled={busy !== ""}
            onClick={() => void go("portal", "/billing/portal")}
          >
            {busy === "portal" ? "正在打开…" : "管理订阅"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
