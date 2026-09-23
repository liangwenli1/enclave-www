"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { api, type FolderRow, type Me, type Role } from "@/lib/api";

/* 团队成员。所有者在这里请人进来、给人分环境、把人请出去。
   邀请是一条一次性链接：配了发信服务器就由我们发出去，没配就由所有者自己发。 */

type Member = {
  id: string;
  email: string;
  role: Role;
  devices: number;
  /** 开给他的文件夹。里面的环境他全都看得到，之后新建进去的也自动跟着。 */
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

const roleName: Record<Role, string> = {
  owner: "所有者",
  admin: "管理员",
  operator: "操作员",
};

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

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
      Promise.all([
        api<TeamView>("/members"),
        api<{ folders: FolderRow[] }>("/folders"),
      ]).then(
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
    Promise.all([
      api<TeamView>("/members"),
      api<{ folders: FolderRow[] }>("/folders"),
    ]).then(
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
      const r = await api<{ url: string; sent: boolean; email: string }>(
        "/members/invite",
        { method: "POST", body: { email: form.get("email"), role: form.get("role") } },
      );
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

  if (error && !view) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return <p className="text-muted-foreground">读取中…</p>;

  return (
    <div className="grid gap-6">
      <div>
        <p className="www-overline">团队</p>
        <h3 className="text-lg font-bold">
          {view.name} · {view.used} / {view.seats} 个席位
        </h3>
        <p className="www-note">
          成员用自己的账号登录工作台，按角色使用团队的环境。
          <b>操作员</b>只能打开分配给他的环境，看不到代理密码，也不能导出。
        </p>
      </div>

      <table>
        <tbody>
          {view.members.map((m) => (
            <tr key={m.id}>
              <td className="wrap">
                {m.email}
                {m.self ? "（本人）" : ""}
              </td>
              <td>{roleName[m.role]}</td>
              <td className="www-mono">
                {m.role === "operator"
                  ? `${m.folders.length} 个文件夹`
                  : "全部环境"}
              </td>
              <td className="www-mono">{m.devices} 台电脑</td>
              <td className="text-right">
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
                            body: {
                              role: m.role === "admin" ? "operator" : "admin",
                            },
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
                            `把 ${m.email} 移出团队？\n\n他的电脑会立刻解绑，也换不到团队的同步密钥了。\n但他电脑上已经同步过的环境和登录态收不回来。`,
                          )
                        )
                          return;
                        void act(m.id, () =>
                          api(`/members/${m.id}`, { method: "DELETE" }),
                        );
                      }}
                    >
                      移出团队
                    </Button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
          {view.invites.map((i) => (
            <tr key={i.token}>
              <td className="wrap text-muted-foreground">{i.email}</td>
              <td className="text-muted-foreground">{roleName[i.role]}</td>
              <td className="text-muted-foreground" colSpan={2}>
                等对方接受邀请
              </td>
              <td className="text-right">
                {owner ? (
                  <Button
                    variant="link"
                    className="text-destructive"
                    disabled={busy === i.token}
                    onClick={() =>
                      void act(i.token, () =>
                        api(`/members/invite/${i.token}`, { method: "DELETE" }),
                      )
                    }
                  >
                    撤回
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {owner ? (
        <form
          className="grid max-w-[560px] gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const el = e.currentTarget;
            const name = new FormData(el).get("teamName");
            void act("rename", () =>
              api("/members/name", { method: "PUT", body: { name } }),
            );
          }}
        >
          <Field id="teamName" label="团队名（被邀请的人会在邀请信里看到）">
            <Input
              id="teamName"
              name="teamName"
              defaultValue={view.name}
              maxLength={60}
              required
            />
          </Field>
          <div>
            <Button type="submit" variant="outline" disabled={busy === "rename"}>
              {busy === "rename" ? "保存中…" : "改名"}
            </Button>
          </div>
        </form>
      ) : null}

      {owner ? (
        <form className="grid max-w-[560px] gap-4" onSubmit={(e) => void invite(e)}>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field id="email" label="邀请谁（邮箱）">
              <Input id="email" name="email" type="email" required placeholder="tongshi@example.com" />
            </Field>
            <Field id="role" label="角色">
              <NativeSelect id="role" name="role" defaultValue="operator">
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
        </form>
      ) : null}

      {link ? (
        <div className="www-hash">
          <p className="www-overline">
            {sentTo
              ? `邀请信已发往 ${sentTo}（7 天内有效，只能用一次）`
              : "把这条链接发给对方（7 天内有效，只能用一次）"}
          </p>
          <code>{link}</code>
          <p className="www-note">
            {sentTo
              ? "邮件偶尔会进垃圾箱，这条链接可以直接发给他。"
              : "尚未配置发信服务器，请自行将该邀请发送给对方。"}
            这条链接现在不看，之后就再也看不到了——重新生成一条即可。
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {editing ? (
        <Assign
          member={editing}
          folders={folders}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

/** 给一个操作员勾文件夹。没勾的那些，服务器连密文都不会发给他。 */
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
      await api(`/members/${member.id}/folders`, {
        method: "PUT",
        body: { folders: picked },
      });
      await onSaved();
    } catch (e) {
      setError(message(e));
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 border border-input p-5">
      <div>
        <p className="www-overline">分配给 {member.email}</p>
        <p className="www-note">
          勾上的文件夹里，所有环境都会同步到他的电脑，之后新建进去的也自动跟着。
          取消勾选之后，云端不再发给他——但他电脑上已经存下的那一份收不回来。
        </p>
      </div>
      {folders.length === 0 ? (
        <p className="www-note">这个团队还没有任何文件夹。</p>
      ) : (
        <div className="grid max-h-[320px] gap-2 overflow-y-auto">
          {folders.map((p) => (
            <label key={p.id} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={picked.includes(p.id)}
                onChange={(e) =>
                  setPicked((old) =>
                    e.target.checked
                      ? [...old, p.id]
                      : old.filter((x) => x !== p.id),
                  )
                }
              />
              <span>{p.name || p.id}</span>
              <span className="text-muted-foreground">{p.profiles} 个环境</span>
            </label>
          ))}
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? "保存中…" : "保存"}
        </Button>
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
      </div>
    </div>
  );
}
