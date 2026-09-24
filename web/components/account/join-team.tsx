"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Centered } from "@/components/account/centered";
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
  const [view, setView] = useState<View>(code ? { kind: "loading" } : { kind: "invalid", message: "这个链接不完整。" });
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
      title="加入团队"
      lead={
        view.kind === "done"
          ? "已加入团队。安装工作台并用这个账号登录，即可看到分配的环境。"
          : info
            ? `${info.team} 邀请以${roleName[info.role]}的身份加入。`
            : "接受邀请，加入一个 Enclave 团队。"
      }
    >
      {view.kind === "loading" ? <Muted>读取中…</Muted> : null}

      {view.kind === "invalid" ? (
        <p className="text-body">{view.message} 这条邀请可能已被使用、已撤回或已过期，请联系邀请人重新发送。</p>
      ) : null}

      {view.kind === "form" ? (
        <>
          <KeyValues
            rows={[
              ["团队", view.info.team],
              ["邮箱", view.info.email],
              ["角色", roleName[view.info.role]],
            ]}
          />
          <Muted>{what[view.info.role]}</Muted>
          <form className="grid gap-4" onSubmit={(e) => void join(e)}>
            <Field id="password" label="为这个账号设置密码（至少 10 位）">
              <Input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" />
            </Field>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <Button size="lg" type="submit" disabled={busy} className="w-full">
              {busy ? "处理中…" : "加入团队"}
            </Button>
          </form>
        </>
      ) : null}

      {view.kind === "done" ? (
        <>
          <p className="text-body">
            下一步：下载并安装工作台，打开后点「登录」，用 {view.info.email} 和刚才设置的密码登录。
            {view.info.role === "operator" ? "登录后，分配给这个账号的环境会自动同步过来。" : "登录后，团队的环境和代理会自动同步过来。"}
          </p>
          <Muted>
            第一次登录时，还需要团队中已有的一台电脑点「允许」并核对 6 位数字：这一步把同步密钥交给新电脑，服务器无法代劳。
          </Muted>
          <div className="flex flex-wrap gap-3">
            <Link className={buttonVariants({ size: "lg" })} href="/download">
              下载工作台
            </Link>
            <Link className={buttonVariants({ size: "lg", variant: "outline" })} href="/account">
              打开账号页
            </Link>
          </div>
        </>
      ) : null}
    </Centered>
  );
}
