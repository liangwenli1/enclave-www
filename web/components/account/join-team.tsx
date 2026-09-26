"use client";

import { LocaleLink as Link } from "@/components/locale-link";
import { useEffect, useState, type FormEvent } from "react";
import { Centered } from "@/components/account/centered";
import { useLocale } from "@/components/locale-provider";
import { Field } from "@/components/field";
import { ErrorText, KeyValues, Muted } from "@/components/panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type Role } from "@/lib/api";

type Info = { email: string; role: Role; team: string; expiresAt: number };

type View =
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "form"; info: Info }
  | { kind: "done"; info: Info };

const roleName: Record<Role, string> = { owner: "所有者", admin: "管理员", operator: "操作员" };

const what: Record<Role, string> = {
  owner: "",
  admin: "可以新建和修改团队的环境与代理，不能改订阅，也不能增减成员。",
  operator: "可以打开分配到的环境；看不到代理密码，也不能导出环境包。",
};

/** 所有者把邀请链接发过来，在这一页设个密码就加入了。邮箱由邀请决定，不能改。 */
export function JoinTeam({ code }: { code: string }) {
  const english = useLocale() === "en";
  const [view, setView] = useState<View>(code ? { kind: "loading" } : { kind: "invalid", message: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    api<Info>(`/invite?code=${encodeURIComponent(code)}`).then(
      (info) => alive && setView({ kind: "form", info }),
      (e: Error) => alive && setView({ kind: "invalid", message: e.message }),
    );
    return () => {
      alive = false;
    };
  }, [code]);

  const join = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (view.kind !== "form") return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/invite/accept", { method: "POST", body: { code, password: form.get("password") } });
      setView({ kind: "done", info: view.info });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  };

  const info = view.kind === "form" || view.kind === "done" ? view.info : null;

  return (
    <Centered
      title={english ? "Join team" : "加入团队"}
      lead={
        view.kind === "done"
          ? (english ? "You have joined the team. Sign in to the desktop app to access assigned environments." : "已加入团队。登录工作台后即可访问已分配的环境。")
          : info
            ? (english ? `${info.team} invited you to join as ${({ owner: "Owner", admin: "Administrator", operator: "Operator" } as Record<Role, string>)[info.role]}.` : `${info.team} 邀请以${roleName[info.role]}身份加入。`)
            : (english ? "Accept an invitation to join an Enclave team." : "接受邀请并加入 Enclave 团队。")
      }
    >
      {view.kind === "loading" ? <Muted>{english ? "Loading…" : "正在读取…"}</Muted> : null}

      {view.kind === "invalid" ? (
        <p className="text-body">{view.message || (english ? "This link is incomplete." : "链接不完整。")} {english ? "The invitation may have been used, revoked, or expired. Ask the inviter to send a new one." : "邀请可能已被使用、撤回或过期，请联系邀请人重新发送。"}</p>
      ) : null}

      {view.kind === "form" ? (
        <>
          <KeyValues
            rows={[
              [english ? "Team" : "团队", view.info.team],
              [english ? "Email" : "邮箱", view.info.email],
              [english ? "Role" : "角色", english ? ({ owner: "Owner", admin: "Administrator", operator: "Operator" } as Record<Role, string>)[view.info.role] : roleName[view.info.role]],
            ]}
          />
          <Muted>{english ? ({ owner: "", admin: "Can create and update team environments and proxies, but cannot manage billing or members.", operator: "Can open assigned environments, but cannot view proxy passwords or export environment packages." } as Record<Role, string>)[view.info.role] : what[view.info.role]}</Muted>
          <form className="grid gap-4" onSubmit={(e) => void join(e)}>
            <Field id="password" label={english ? "Set a password (10 characters minimum)" : "设置账号密码（至少 10 位）"}>
              <Input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" />
            </Field>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <Button size="lg" type="submit" disabled={busy} className="w-full">
              {busy ? (english ? "Working…" : "处理中…") : (english ? "Join team" : "加入团队")}
            </Button>
          </form>
        </>
      ) : null}

      {view.kind === "done" ? (
        <>
          <p className="text-body">
            {english ? <>Next, install the desktop app and sign in as {view.info.email}. {view.info.role === "operator" ? "Assigned environments will sync automatically." : "Team environments and proxies will sync automatically."}</> : <>下一步：安装工作台并使用 {view.info.email} 登录。{view.info.role === "operator" ? "已分配的环境将自动同步。" : "团队环境与代理将自动同步。"}</>}
          </p>
          <Muted>
            {english ? "On first sign-in, an existing team device must approve the request and verify a six-digit code. This transfers the sync key without exposing it to the server." : "首次登录时，需由团队中已登录的设备批准请求并核对 6 位数字，以便在不向服务器暴露密钥的情况下完成同步授权。"}
          </Muted>
          <div className="flex flex-wrap gap-3">
            <Link className={buttonVariants({ size: "lg" })} href="/download">
              {english ? "Download" : "下载工作台"}
            </Link>
            <Link className={buttonVariants({ size: "lg", variant: "outline" })} href="/account">
              {english ? "Open account" : "打开账号页"}
            </Link>
          </div>
        </>
      ) : null}
    </Centered>
  );
}
