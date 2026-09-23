"use client";

import { useEffect, useState } from "react";
import { AuthForm } from "@/components/account-panel";
import { HashBlock } from "@/components/hash-block";
import { Button } from "@/components/ui/button";
import { api, type Me } from "@/lib/api";

type View =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "auth"; mode: "in" | "up" }
  | { kind: "confirm"; email: string }
  | { kind: "done"; redirect: string }
  | { kind: "declined" };

const whoAmI = async (): Promise<View> => {
  const me = await api<Me>("/auth/me");
  return me.user
    ? { kind: "confirm", email: me.user.email }
    : { kind: "auth", mode: "in" };
};

/** 工作台点「登录」后打开的就是这一页：在这里登录、点允许，浏览器再把一次性授权码交回工作台。 */
export function DeviceAuthorize({
  challenge,
  deviceId,
  deviceName,
}: {
  challenge: string;
  deviceId: string;
  deviceName: string;
}) {
  const valid = /^[A-Za-z0-9_-]{43}$/.test(challenge);
  const [view, setView] = useState<View>(
    valid ? { kind: "loading" } : { kind: "invalid" },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!valid) return;
    let alive = true;
    whoAmI().then(
      (next) => alive && setView(next),
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [valid]);

  const allow = async () => {
    setBusy(true);
    setError("");
    try {
      const { redirect } = await api<{ redirect: string }>(
        "/auth/device/authorize",
        { method: "POST", body: { challenge, deviceId, deviceName } },
      );
      setView({ kind: "done", redirect });
      window.location.assign(redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const device = deviceName || "这台电脑";

  return (
    <>
      <section className="www-hero www-hero-page">
        <h1>登录工作台</h1>
        <p className="www-lead">
          {view.kind === "done"
            ? "已经允许，正在回到工作台。"
            : `「${device}」上的 Enclave 工作台请求登录当前账号。`}
        </p>
      </section>
      <section className="www-section">
        <div className="grid max-w-[560px] gap-5 rounded-xl border border-input p-7">
          {view.kind === "loading" && !error ? (
            <p className="text-muted-foreground">读取中…</p>
          ) : null}

          {view.kind === "invalid" ? (
            <p className="text-sm text-body">
              这个链接不完整。回到工作台，重新点一次「登录」。
            </p>
          ) : null}

          {view.kind === "auth" ? (
            <AuthForm
              mode={view.mode}
              onMode={(mode) => setView({ kind: "auth", mode })}
              onDone={async () => setView(await whoAmI())}
            />
          ) : null}

          {view.kind === "confirm" ? (
            <>
              <table className="www-kv">
                <tbody>
                  <tr>
                    <th>账号</th>
                    <td>{view.email}</td>
                  </tr>
                  <tr>
                    <th>电脑</th>
                    <td>{device}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-sm text-body">
                仅当刚刚在工作台中点击过「登录」时才应允许。允许后该设备将占用账号的一个设备名额，可随时在账号页解绑。
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" disabled={busy} onClick={() => void allow()}>
                  {busy ? "处理中…" : "允许登录"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setView({ kind: "declined" })}
                >
                  不是我
                </Button>
              </div>
            </>
          ) : null}

          {view.kind === "done" ? (
            <>
              <p className="text-sm text-body">
                浏览器会询问是否打开
                Enclave，选「打开」。工作台没有反应的话，把下面这串授权码复制到工作台的登录页里，2
                分钟内有效，只能用一次。
              </p>
              <HashBlock
                label="授权码"
                value={new URL(view.redirect).searchParams.get("code") ?? ""}
              />
              <div>
                <a className="text-sm text-link" href={view.redirect}>
                  再试一次打开工作台
                </a>
              </div>
            </>
          ) : null}

          {view.kind === "declined" ? (
            <p className="text-sm text-body">
              未登录任何设备，可关闭此页面。若并未在工作台点击过登录却被引导至此，请勿允许。
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </section>
    </>
  );
}
