"use client";

import { useEffect, useState } from "react";
import { AuthForm, type AuthMode } from "@/components/account/auth-form";
import { Centered } from "@/components/account/centered";
import { useLocale } from "@/components/locale-provider";
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
  const english = useLocale() === "en";
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

  const device = deviceName || (english ? "This device" : "这台设备");

  return (
    <Centered
      title={english ? "Sign in to the desktop app" : "登录工作台"}
      lead={view.kind === "done" ? (english ? "Approved. Returning to the desktop app." : "授权已完成，正在返回工作台。") : (english ? `Enclave on “${device}” is requesting access to this account.` : `设备「${device}」上的 Enclave 工作台正在请求登录当前账号。`)}
    >
      {view.kind === "loading" && !error ? <Muted>{english ? "Loading…" : "正在读取…"}</Muted> : null}

      {view.kind === "invalid" ? <p className="text-body">{english ? "This link is incomplete. Return to the desktop app and select Sign in again." : "链接不完整。请返回工作台并重新选择「登录」。"}</p> : null}

      {view.kind === "auth" ? (
        <AuthForm mode={view.mode} onMode={(mode) => setView({ kind: "auth", mode })} onDone={async () => setView(await whoAmI())} />
      ) : null}

      {view.kind === "confirm" ? (
        <>
          <KeyValues
            rows={[
              [english ? "Account" : "账号", view.email],
              [english ? "Device" : "设备", device],
            ]}
          />
          <Muted>
            {english ? "Approve only if you just selected Sign in in the desktop app. This device will use one device slot and can be unlinked from the account page." : "仅在刚刚于工作台中选择「登录」时批准。批准后，该设备将占用一个设备名额，可随时在账号页解绑。"}
          </Muted>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" disabled={busy} onClick={() => void allow()}>
              {busy ? (english ? "Working…" : "处理中…") : (english ? "Approve" : "允许登录")}
            </Button>
            <Button size="lg" variant="outline" disabled={busy} onClick={() => setView({ kind: "declined" })}>
              {english ? "Deny" : "拒绝"}
            </Button>
          </div>
        </>
      ) : null}

      {view.kind === "done" ? (
        <>
          <p className="text-body">
            {english ? "Allow the browser to open Enclave. If the desktop app does not respond, paste the authorization code below into its sign-in screen. The code is valid for two minutes and can be used once." : "浏览器将请求打开 Enclave。若工作台没有响应，请将下方授权码粘贴到工作台登录页。授权码有效期为 2 分钟，且仅可使用一次。"}
          </p>
          <CodeValue label={english ? "Authorization code" : "授权码"} value={new URL(view.redirect).searchParams.get("code") ?? ""} />
          <a className="w-fit text-[14.5px] text-link hover:underline" href={view.redirect}>
            {english ? "Open Enclave again" : "重新打开工作台"}
          </a>
        </>
      ) : null}

      {view.kind === "declined" ? (
        <p className="text-body">{english ? "No device was authorized. You may close this page. If you did not start this request from Enclave, do not approve it." : "未授权任何设备，可以关闭此页。如未在工作台发起登录，请勿批准该请求。"}</p>
      ) : null}

      {error ? <ErrorText>{error}</ErrorText> : null}
    </Centered>
  );
}
