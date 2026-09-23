"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { api, type Role } from "@/lib/api";

type Info = { email: string; role: Role; team: string; expiresAt: number };

type View =
  | { kind: "loading" }
  | { kind: "invalid"; message: string }
  | { kind: "form"; info: Info }
  | { kind: "done"; info: Info };

const roleName: Record<Role, string> = {
  owner: "所有者",
  admin: "管理员",
  operator: "操作员",
};

const what: Record<Role, string> = {
  owner: "",
  admin: "可以新建和修改团队的环境和代理，但不能改订阅，也不能增减成员。",
  operator: "可打开已分配的环境；无法查看代理密码，也无法导出环境包。",
};

/** 所有者把邀请链接发给你，你在这一页设个密码就加入了。邮箱由邀请决定，不能改。 */
export function JoinTeam({ code }: { code: string }) {
  const [view, setView] = useState<View>(
    code ? { kind: "loading" } : { kind: "invalid", message: "这个链接不完整。" },
  );
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
      await api("/invite/accept", {
        method: "POST",
        body: { code, password: form.get("password") },
      });
      setView({ kind: "done", info: view.info });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  };

  const info = view.kind === "form" || view.kind === "done" ? view.info : null;

  return (
    <>
      <section className="www-hero www-hero-page">
        <h1>加入团队</h1>
        <p className="www-lead">
          {view.kind === "done"
            ? "已加入团队。安装工作台并使用该账号登录，即可看到已分配的环境。"
            : info
              ? `${info.team} 邀请以${roleName[info.role]}的身份加入。`
              : "接受邀请，加入一个 Enclave 团队。"}
        </p>
      </section>
      <section className="www-section">
        <div className="grid max-w-[560px] gap-5 rounded-xl border border-input p-7">
          {view.kind === "loading" ? (
            <p className="text-muted-foreground">读取中…</p>
          ) : null}

          {view.kind === "invalid" ? (
            <p className="text-sm text-body">
              {view.message} 该邀请可能已被使用、已撤回或已过期，请联系邀请人重新发送。
            </p>
          ) : null}

          {view.kind === "form" ? (
            <>
              <table className="www-kv">
                <tbody>
                  <tr>
                    <th>团队</th>
                    <td>{view.info.team}</td>
                  </tr>
                  <tr>
                    <th>邮箱</th>
                    <td>{view.info.email}</td>
                  </tr>
                  <tr>
                    <th>角色</th>
                    <td>{roleName[view.info.role]}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-sm text-body">{what[view.info.role]}</p>
              <form className="grid gap-4" onSubmit={(e) => void join(e)}>
                <Field id="password" label="给这个账号设一个密码（至少 10 位）">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    minLength={10}
                    required
                    autoComplete="new-password"
                  />
                </Field>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <div>
                  <Button size="lg" type="submit" disabled={busy}>
                    {busy ? "处理中…" : "加入团队"}
                  </Button>
                </div>
              </form>
            </>
          ) : null}

          {view.kind === "done" ? (
            <>
              <p className="text-sm text-body">
                下一步：下载并安装工作台，打开后点「登录」，用 {view.info.email}{" "}
                和刚才设的密码登录。
                {view.info.role === "operator"
                  ? "登录后，团队分配的环境将自动同步。"
                  : "登录之后，团队的环境和代理会自己同步过来。"}
              </p>
              <p className="text-sm text-body">
                首次登录还需团队中已有的一台电脑点击「允许」并核对 6
                位数字——该步骤用于将同步密钥交付到新设备，服务器无法代为完成。
              </p>
              <div className="flex flex-wrap gap-2">
                <Link className={buttonVariants({ size: "lg" })} href="/download">
                  下载工作台
                </Link>
                <Link
                  className={buttonVariants({ size: "lg", variant: "outline" })}
                  href="/account"
                >
                  去账号页
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}
