"use client";

import { useEffect, useState } from "react";
import { AuthForm, type AuthMode } from "@/components/account/auth-form";
import { Centered } from "@/components/account/centered";
import { CodeValue } from "@/components/copy-button";
import { ErrorText, KeyValues, Muted } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { api, type Me } from "@/lib/api";

type View =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "auth"; mode: AuthMode }
  | { kind: "confirm"; email: string }
  | { kind: "done"; redirect: string }
  | { kind: "declined" };

const whoAmI = async (): Promise<View> => {
  const me = await api<Me>("/auth/me");
  return me.user ? { kind: "confirm", email: me.user.email } : { kind: "auth", mode: "in" };
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
  const [view, setView] = useState<View>(valid ? { kind: "loading" } : { kind: "invalid" });
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
      const { redirect } = await api<{ redirect: string }>("/auth/device/authorize", {
        method: "POST",
        body: { challenge, deviceId, deviceName },
      });
      setView({ kind: "done", redirect });
      window.location.assign(redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const device = deviceName || "这台电脑";

  return (
    <Centered
      title="登录工作台"
      lead={view.kind === "done" ? "已允许，正在回到工作台。" : `「${device}」上的 Enclave 工作台请求登录当前账号。`}
    >
      {view.kind === "loading" && !error ? <Muted>读取中…</Muted> : null}

      {view.kind === "invalid" ? <p className="text-body">这个链接不完整。回到工作台，重新点一次「登录」。</p> : null}

      {view.kind === "auth" ? (
        <AuthForm mode={view.mode} onMode={(mode) => setView({ kind: "auth", mode })} onDone={async () => setView(await whoAmI())} />
      ) : null}

      {view.kind === "confirm" ? (
        <>
          <KeyValues
            rows={[
              ["账号", view.email],
              ["电脑", device],
            ]}
          />
          <Muted>
            仅在刚刚于工作台中点过「登录」时才允许。允许后这台电脑占用账号的一个设备名额，可随时在账号页解绑。
          </Muted>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" disabled={busy} onClick={() => void allow()}>
              {busy ? "处理中…" : "允许登录"}
            </Button>
            <Button size="lg" variant="outline" disabled={busy} onClick={() => setView({ kind: "declined" })}>
              不是本人操作
            </Button>
          </div>
        </>
      ) : null}

      {view.kind === "done" ? (
        <>
          <p className="text-body">
            浏览器会询问是否打开 Enclave，选「打开」。工作台没有反应时，把下面的授权码粘贴到工作台的登录页：2 分钟内有效，只能用一次。
          </p>
          <CodeValue label="授权码" value={new URL(view.redirect).searchParams.get("code") ?? ""} />
          <a className="w-fit text-[14.5px] text-link hover:underline" href={view.redirect}>
            再试一次打开工作台
          </a>
        </>
      ) : null}

      {view.kind === "declined" ? (
        <p className="text-body">没有登录任何电脑，可以关闭此页。若从未在工作台点过「登录」却被引导到这里，请勿允许。</p>
      ) : null}

      {error ? <ErrorText>{error}</ErrorText> : null}
    </Centered>
  );
}
