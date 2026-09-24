"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Glyph } from "@/components/brand";
import { CodeValue } from "@/components/copy-button";
import { Field } from "@/components/field";
import { ErrorText, Muted, Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { api, type FolderRow, type Me, type Role } from "@/lib/api";

/* 团队成员。所有者在这里请人进来、给人分文件夹、把人请出去。
   邀请是一条一次性链接：配了发信服务器就由我们发出去，没配就由所有者自己发。 */

type Member = {
  id: string;
  email: string;
  role: Role;
  devices: number;
  /** 开给这位成员的文件夹。里面的环境都看得到，之后新建进去的也自动跟着。 */
  folders: string[];
  joinedAt: number;
  self: boolean;
};

type Invite = { token: string; email: string; role: Role; expiresAt: number };

type TeamView = {
  members: Member[];
  invites: Invite[];
  /** 团队名。会出现在邀请信和加入页上，被邀请的人靠它认出这是谁。 */
  name: string;
  seats: number;
  used: number;
};

const roleName: Record<Role, string> = { owner: "所有者", admin: "管理员", operator: "操作员" };

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

// 成员头像用邮箱算一枚指纹章：同一个人每次都一样，不同的人一眼分得开。
const seedOf = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

export function TeamPanel({ me }: { me: Me }) {
  const [view, setView] = useState<TeamView | null>(null);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<Member | null>(null);

  const owner = me.user?.role === "owner";

  const load = useCallback(
    () =>
      Promise.all([api<TeamView>("/members"), api<{ folders: FolderRow[] }>("/folders")]).then(
        ([team, list]) => {
          setView(team);
          setFolders(list.folders);
        },
        (e: unknown) => setError(message(e)),
      ),
    [],
  );

  useEffect(() => {
    let alive = true;
    Promise.all([api<TeamView>("/members"), api<{ folders: FolderRow[] }>("/folders")]).then(
      ([team, list]) => {
        if (!alive) return;
        setView(team);
        setFolders(list.folders);
      },
      (e: unknown) => alive && setError(message(e)),
    );
    return () => {
      alive = false;
    };
  }, []);

  const invite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    setError("");
    setLink("");
    setBusy("invite");
    try {
      const r = await api<{ url: string; sent: boolean; email: string }>("/members/invite", {
        method: "POST",
        body: { email: form.get("email"), role: form.get("role") },
      });
      setLink(r.url);
      setSentTo(r.sent ? r.email : "");
      el.reset();
      await load();
    } catch (e) {
      setError(message(e));
    }
    setBusy("");
  };

  const act = async (id: string, run: () => Promise<unknown>) => {
    setError("");
    setBusy(id);
    try {
      await run();
      await load();
    } catch (e) {
      setError(message(e));
    }
    setBusy("");
  };

  const folderName = (id: string) => folders.find((f) => f.id === id)?.name || id;

  if (!view) {
    return (
      <Panel id="team" title="团队">
        {error ? <ErrorText>{error}</ErrorText> : <Muted>读取中…</Muted>}
      </Panel>
    );
  }

  return (
    <Panel
      id="team"
      title={`团队：${view.name}`}
      note={`${view.used} / ${view.seats} 个席位。成员用自己的账号登录工作台；操作员只能打开分配给自己的文件夹里的环境，看不到代理密码，也不能导出。`}
      flush
    >
      <ul>
        {view.members.map((m) => (
          <li key={m.id} className="grid gap-3 border-b border-border px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Glyph seed={seedOf(m.email)} />
              <div className="min-w-0">
                <p className="truncate text-[14.5px]">
                  {m.email}
                  {m.self ? <span className="ml-1.5 text-muted-foreground">（本人）</span> : null}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {roleName[m.role]} · {m.devices} 台电脑 ·{" "}
                  {m.role === "operator"
                    ? m.folders.length
                      ? m.folders.map(folderName).join("、")
                      : "尚未分配文件夹"
                    : "全部环境"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end">
              {m.role === "operator" ? (
                <Button variant="link" onClick={() => setEditing(m)}>
                  分配文件夹
                </Button>
              ) : null}
              {owner && !m.self && m.role !== "owner" ? (
                <>
                  <Button
                    variant="link"
                    disabled={busy === m.id}
                    onClick={() =>
                      void act(m.id, () =>
                        api(`/members/${m.id}/role`, {
                          method: "POST",
                          body: { role: m.role === "admin" ? "operator" : "admin" },
                        }),
                      )
                    }
                  >
                    改成{m.role === "admin" ? "操作员" : "管理员"}
                  </Button>
                  <Button
                    variant="link"
                    className="text-destructive"
                    disabled={busy === m.id}
                    onClick={() => {
                      if (
                        !confirm(
                          `将 ${m.email} 移出团队？\n\n对应的电脑会立即解绑，之后无法再取得团队的同步密钥。\n已经同步到那台电脑上的环境和登录态无法收回。`,
                        )
                      )
                        return;
                      void act(m.id, () => api(`/members/${m.id}`, { method: "DELETE" }));
                    }}
                  >
                    移出团队
                  </Button>
                </>
              ) : null}
            </div>
            {editing?.id === m.id ? (
              <Assign
                member={m}
                folders={folders}
                onClose={() => setEditing(null)}
                onSaved={async () => {
                  setEditing(null);
                  await load();
                }}
              />
            ) : null}
          </li>
        ))}
        {view.invites.map((i) => (
          <li key={i.token} className="grid gap-3 border-b border-border px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
            <div className="min-w-0 pl-10">
              <p className="truncate text-[14.5px] text-muted-foreground">{i.email}</p>
              <p className="text-[13px] text-muted-foreground">{roleName[i.role]} · 等对方接受邀请</p>
            </div>
            {owner ? (
              <div className="sm:text-right">
                <Button
                  variant="link"
                  className="text-destructive"
                  disabled={busy === i.token}
                  onClick={() => void act(i.token, () => api(`/members/invite/${i.token}`, { method: "DELETE" }))}
                >
                  撤回邀请
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {owner ? (
        <div className="grid gap-8 p-5 sm:p-6 md:grid-cols-2">
          <form className="grid content-start gap-4" onSubmit={(e) => void invite(e)}>
            <p className="font-semibold">邀请成员</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field id="invite-email" label="邮箱">
                <Input id="invite-email" name="email" type="email" required placeholder="name@company.com" />
              </Field>
              <Field id="invite-role" label="角色">
                <NativeSelect id="invite-role" name="role" defaultValue="operator">
                  <option value="operator">操作员</option>
                  <option value="admin">管理员</option>
                </NativeSelect>
              </Field>
            </div>
            <div>
              <Button type="submit" disabled={busy === "invite" || view.used >= view.seats}>
                {busy === "invite" ? "生成中…" : "生成邀请链接"}
              </Button>
            </div>
            {view.used >= view.seats ? <Muted>席位已满。移出成员或撤回邀请后才能再邀请。</Muted> : null}
          </form>
          <form
            className="grid content-start gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get("teamName");
              void act("rename", () => api("/members/name", { method: "PUT", body: { name } }));
            }}
          >
            <p className="font-semibold">团队名</p>
            <Field id="teamName" label="被邀请的人会在邀请信和加入页上看到">
              <Input id="teamName" name="teamName" defaultValue={view.name} maxLength={60} required />
            </Field>
            <div>
              <Button type="submit" variant="outline" disabled={busy === "rename"}>
                {busy === "rename" ? "保存中…" : "保存"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {link ? (
        <div className="grid gap-2 border-t border-border p-5 sm:p-6">
          <CodeValue
            label={sentTo ? `邀请信已发往 ${sentTo}，链接 7 天内有效、只能用一次` : "把这条链接发给对方，7 天内有效、只能用一次"}
            value={link}
          />
          <Muted>
            {sentTo ? "邮件偶尔会进垃圾箱，也可以直接把链接发给对方。" : "尚未配置发信服务，请自行将该邀请发送给对方。"}
            这条链接离开本页后不再显示，需要时重新生成即可。
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

/** 给一个操作员勾文件夹。没勾的那些，服务器连密文都不会发过去。 */
function Assign({
  member,
  folders,
  onClose,
  onSaved,
}: {
  member: Member;
  folders: FolderRow[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [picked, setPicked] = useState<string[]>(member.folders);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api(`/members/${member.id}/folders`, { method: "PUT", body: { folders: picked } });
      await onSaved();
    } catch (e) {
      setError(message(e));
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-muted p-4 sm:col-span-2">
      <div>
        <p className="font-medium">分配给 {member.email}</p>
        <Muted>
          勾上的文件夹里，所有环境都会同步到这位成员的电脑，之后新建进去的也自动跟着。取消勾选后云端不再下发，但已经存到那台电脑上的内容无法收回。
        </Muted>
      </div>
      {folders.length === 0 ? (
        <Muted>团队还没有文件夹。在工作台里新建文件夹后再来分配。</Muted>
      ) : (
        <div className="grid max-h-[320px] gap-1 overflow-y-auto">
          {folders.map((f) => (
            <label key={f.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-[14.5px] hover:bg-card">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={picked.includes(f.id)}
                onChange={(e) =>
                  setPicked((old) => (e.target.checked ? [...old, f.id] : old.filter((x) => x !== f.id)))
                }
              />
              <span>{f.name || f.id}</span>
              <span className="text-muted-foreground">{f.profiles} 个环境</span>
            </label>
          ))}
        </div>
      )}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <div className="flex gap-2">
        <Button size="sm" disabled={saving} onClick={() => void save()}>
          {saving ? "保存中…" : "保存"}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          取消
        </Button>
      </div>
    </div>
  );
}
