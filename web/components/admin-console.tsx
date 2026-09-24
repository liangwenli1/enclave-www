"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { CodeValue } from "@/components/copy-button";
import { Field } from "@/components/field";
import { PageHead } from "@/components/page-head";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { api, ApiError, type Me } from "@/lib/api";

const date = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleDateString("zh-CN") : "不过期";
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

const TABS = [
  ["billing", "支付通道"],
  ["storage", "同步存储"],
  ["mail", "发信服务器"],
  ["users", "用户与订阅"],
  ["kernels", "内核上架"],
  ["messages", "留言"],
] as const;
type Tab = (typeof TABS)[number][0];

/** 管理后台。谁是管理员由服务器上的 config.yaml 决定；这里只是界面，每个接口服务器都会再查一遍。 */
export function AdminConsole() {
  const [gate, setGate] = useState<"loading" | "ok" | "denied" | "anonymous">(
    "loading",
  );
  const [tab, setTab] = useState<Tab>("billing");

  useEffect(() => {
    api<Me>("/auth/me").then(
      (me) =>
        setGate(!me.user ? "anonymous" : me.user.isAdmin ? "ok" : "denied"),
      () => setGate("anonymous"),
    );
  }, []);

  if (gate !== "ok") {
    return (
      <PageHead
        compact
        title="管理后台"
        lead={
          gate === "loading"
            ? "正在确认身份…"
            : gate === "anonymous"
              ? "先在账号页登录管理员账号。"
              : "这个账号不是管理员。管理员邮箱写在服务器的 config.yaml 里。"
        }
        className="pb-24"
      />
    );
  }

  return (
    <>
      <PageHead compact title="管理后台" />
      <div className="site-wrap pb-24">
        <div role="tablist" aria-label="管理后台" className="inline-flex flex-wrap gap-1 rounded-full bg-accent p-1">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={
                tab === key
                  ? "cursor-pointer rounded-full bg-card px-4 py-1.5 text-sm font-medium text-foreground shadow-sm"
                  : "cursor-pointer rounded-full px-4 py-1.5 text-sm text-body hover:text-foreground"
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-6 pt-8">
          {tab === "billing" ? <Billing /> : null}
          {tab === "storage" ? <Storage /> : null}
          {tab === "mail" ? <Mail /> : null}
          {tab === "users" ? <Users /> : null}
          {tab === "kernels" ? <Kernels /> : null}
          {tab === "messages" ? <Messages /> : null}
        </div>
      </div>
    </>
  );
}

function Block({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <Panel title={title} note={note}>
      <div className="grid gap-5">{children}</div>
    </Panel>
  );
}

/** 问一次接口、把结果放进 state，再给一个手动刷新。各个面板共用。 */
function useLoaded<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    api<T>(path).then(
      (d) => alive && setData(d),
      (e) => alive && setError(message(e)),
    );
    return () => {
      alive = false;
    };
  }, [path, version]);
  return {
    data,
    error,
    reload: useCallback(() => setVersion((v) => v + 1), []),
  };
}

/* ── 支付通道 ───────────────────────────────────────────── */

type BillingView = {
  testMode: boolean;
  apiKey: string;
  webhookSecret: string;
  products: Record<string, string>;
  webhookURL: string;
  ready: boolean;
};

function Billing() {
  const { data, error, reload } = useLoaded<BillingView>("/admin/billing");
  const [saved, setSaved] = useState("");
  const [failed, setFailed] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // 等过一轮之后 e.currentTarget 就是 null 了，表单要在这里先拿住。
    const el = e.currentTarget;
    const form = new FormData(el);
    setSaved("");
    setFailed("");
    try {
      await api("/admin/billing", {
        method: "PUT",
        body: {
          testMode: form.get("mode") === "test",
          apiKey: form.get("apiKey"),
          webhookSecret: form.get("webhookSecret"),
          products: {
            solo: form.get("solo"),
            pro: form.get("pro"),
            team: form.get("team"),
          },
        },
      });
      el.reset();
      setSaved("已保存。");
      reload();
    } catch (err) {
      setFailed(message(err));
    }
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-muted-foreground">读取中…</p>;

  return (
    <Block
      title="Creem"
      note={
        data.ready
          ? "已配置，用户可以在线订阅"
          : "配置未完成，用户暂时无法在线订阅"
      }
    >
      <CodeValue label="在 Creem 后台把 Webhook 地址填成这个" value={data.webhookURL} />
      <form
        key={JSON.stringify(data)}
        className="grid max-w-[560px] gap-4"
        onSubmit={(e) => void submit(e)}
      >
        <Field id="mode" label="环境">
          <NativeSelect
            id="mode"
            name="mode"
            className="w-full"
            defaultValue={data.testMode ? "test" : "live"}
          >
            <option value="test">
              测试（test-api.creem.io，不会真的扣款）
            </option>
            <option value="live">正式</option>
          </NativeSelect>
        </Field>
        <Field
          id="apiKey"
          label={`API key${data.apiKey ? `，现在是 ${data.apiKey}` : ""}`}
        >
          <Input
            id="apiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={data.apiKey ? "留空就不改" : "creem_…"}
          />
        </Field>
        <Field
          id="webhookSecret"
          label={`Webhook 密钥${data.webhookSecret ? `，现在是 ${data.webhookSecret}` : ""}`}
        >
          <Input
            id="webhookSecret"
            name="webhookSecret"
            type="password"
            autoComplete="off"
            placeholder={data.webhookSecret ? "留空就不改" : "whsec_…"}
          />
        </Field>
        {(["solo", "pro", "team"] as const).map((plan) => (
          <Field key={plan} id={plan} label={`${plan.toUpperCase()} 的产品 ID`}>
            <Input
              id={plan}
              name={plan}
              defaultValue={data.products[plan] ?? ""}
              placeholder="prod_…"
            />
          </Field>
        ))}
        {failed ? <p className="text-sm text-destructive">{failed}</p> : null}
        {saved ? <p className="text-sm text-link">{saved}</p> : null}
        <div>
          <Button type="submit">保存</Button>
        </div>
      </form>
    </Block>
  );
}

/* ── 同步存储 ───────────────────────────────────────────── */

type StorageView = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  ready: boolean;
  maxBytes: number;
};

/**
 * 客户端加密后的登录态放这里（R2 或任何 S3 兼容的）。
 * 密文不经过我们的服务器：这里填的凭据只用来签一个有时限的上传/下载地址。
 */
function Storage() {
  const { data, error, reload } = useLoaded<StorageView>("/admin/storage");
  const [saved, setSaved] = useState("");
  const [failed, setFailed] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    setSaved("");
    setFailed("");
    try {
      await api("/admin/storage", {
        method: "PUT",
        body: {
          endpoint: form.get("endpoint"),
          region: form.get("region"),
          bucket: form.get("bucket"),
          accessKey: form.get("accessKey"),
          secretKey: form.get("secretKey"),
        },
      });
      el.reset();
      setSaved("已保存。");
      reload();
    } catch (err) {
      setFailed(message(err));
    }
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-muted-foreground">读取中…</p>;

  return (
    <Block
      title="对象存储"
      note={
        data.ready
          ? `已配置。付费档的登录态会同步到这里，单个环境上限 ${Math.round(data.maxBytes / (1 << 20))} MB`
          : "配置未完成，用户的登录态暂时无法同步（环境与代理的同步不受影响）"
      }
    >
      <p className="max-w-[560px] text-sm text-body">
        存进去的全是客户端加密过的密文，我们没有钥匙，也解不开。
        这里填的凭据只用来签一个 15 分钟、只对单个对象生效的临时地址。
      </p>
      <form
        key={JSON.stringify(data)}
        className="grid max-w-[560px] gap-4"
        onSubmit={(e) => void submit(e)}
      >
        <Field id="endpoint" label="地址">
          <Input
            id="endpoint"
            name="endpoint"
            defaultValue={data.endpoint}
            placeholder="https://<账号>.r2.cloudflarestorage.com"
          />
        </Field>
        <Field id="bucket" label="桶名">
          <Input
            id="bucket"
            name="bucket"
            defaultValue={data.bucket}
            placeholder="enclave-sync"
          />
        </Field>
        <Field id="region" label="区域">
          <Input
            id="region"
            name="region"
            defaultValue={data.region}
            placeholder="R2 填 auto"
          />
        </Field>
        <Field
          id="accessKey"
          label={`Access key${data.accessKey ? `，现在是 ${data.accessKey}` : ""}`}
        >
          <Input
            id="accessKey"
            name="accessKey"
            type="password"
            autoComplete="off"
            placeholder={data.accessKey ? "留空就不改" : ""}
          />
        </Field>
        <Field
          id="secretKey"
          label={`Secret key${data.secretKey ? `，现在是 ${data.secretKey}` : ""}`}
        >
          <Input
            id="secretKey"
            name="secretKey"
            type="password"
            autoComplete="off"
            placeholder={data.secretKey ? "留空就不改" : ""}
          />
        </Field>
        {failed ? <p className="text-sm text-destructive">{failed}</p> : null}
        {saved ? <p className="text-sm text-link">{saved}</p> : null}
        <div>
          <Button type="submit">保存</Button>
        </div>
      </form>
    </Block>
  );
}

/* ── 发信服务器 ─────────────────────────────────────────── */

type MailView = {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  fromName: string;
  implicitTLS: boolean;
  ready: boolean;
};

/** 现在只有一种信：邀请同事加入团队。没配也不影响用，只是邀请链接要所有者自己发。 */
function Mail() {
  const { data, error, reload } = useLoaded<MailView>("/admin/mail");
  const [saved, setSaved] = useState("");
  const [failed, setFailed] = useState("");
  const [testing, setTesting] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    setSaved("");
    setFailed("");
    try {
      await api("/admin/mail", {
        method: "PUT",
        body: {
          host: form.get("host"),
          port: Number(form.get("port")) || 0,
          username: form.get("username"),
          password: form.get("password"),
          from: form.get("from"),
          fromName: form.get("fromName"),
          implicitTLS: form.get("tls") === "implicit",
        },
      });
      el.reset();
      setSaved("已保存。");
      reload();
    } catch (err) {
      setFailed(message(err));
    }
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-muted-foreground">读取中…</p>;

  return (
    <Block
      title="SMTP"
      note={
        data.ready
          ? "已配置，邀请信由我们发出去"
          : "配置未完成，邀请链接需由团队所有者自行发送"
      }
    >
      <form
        key={JSON.stringify(data)}
        className="grid max-w-[560px] gap-4"
        onSubmit={(e) => void submit(e)}
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field id="host" label="服务器">
            <Input
              id="host"
              name="host"
              defaultValue={data.host}
              placeholder="smtp.example.com"
            />
          </Field>
          <Field id="port" label="端口">
            <Input
              id="port"
              name="port"
              type="number"
              min={1}
              max={65535}
              defaultValue={data.port || 587}
            />
          </Field>
        </div>
        <Field id="tls" label="加密方式">
          <NativeSelect
            id="tls"
            name="tls"
            className="w-full"
            defaultValue={data.implicitTLS ? "implicit" : "starttls"}
          >
            <option value="starttls">STARTTLS（端口 587 / 25）</option>
            <option value="implicit">一上来就是 TLS（端口 465）</option>
          </NativeSelect>
        </Field>
        <Field id="from" label="发件人地址">
          <Input
            id="from"
            name="from"
            type="email"
            defaultValue={data.from}
            placeholder="no-reply@example.com"
          />
        </Field>
        <Field id="fromName" label="发件人显示的名字">
          <Input
            id="fromName"
            name="fromName"
            defaultValue={data.fromName}
            placeholder="Enclave"
          />
        </Field>
        <Field id="username" label="登录账号（不需要登录就留空）">
          <Input id="username" name="username" defaultValue={data.username} />
        </Field>
        <Field
          id="password"
          label={`登录密码${data.password ? `，现在是 ${data.password}` : ""}`}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="off"
            placeholder={data.password ? "留空就不改" : ""}
          />
        </Field>
        {failed ? <p className="text-sm text-destructive">{failed}</p> : null}
        {saved ? <p className="text-sm text-link">{saved}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">保存</Button>
          <Button
            type="button"
            variant="outline"
            disabled={!data.ready || testing}
            onClick={() => {
              setTesting(true);
              setSaved("");
              setFailed("");
              api<{ to: string }>("/admin/mail/test", { method: "POST" }).then(
                (r) => {
                  setSaved(`已发往 ${r.to}，去收件箱看看。`);
                  setTesting(false);
                },
                (e: Error) => {
                  setFailed(message(e));
                  setTesting(false);
                },
              );
            }}
          >
            {testing ? "发送中…" : "发一封测试信给我自己"}
          </Button>
        </div>
      </form>
    </Block>
  );
}

/* ── 用户与订阅 ─────────────────────────────────────────── */

type UserRow = {
  email: string;
  label: string;
  expired: boolean;
  expiresAt: number | null;
  billingStatus: string;
  devices: number;
  createdAt: number;
};

function Users() {
  const [q, setQ] = useState("");
  const { data, error, reload } = useLoaded<{ users: UserRow[] }>(
    `/admin/users?q=${encodeURIComponent(q)}`,
  );
  const [result, setResult] = useState("");
  const [failed, setFailed] = useState("");

  const grant = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const until = String(form.get("until"));
    setResult("");
    setFailed("");
    try {
      const res = await api<{
        email: string;
        plan: string;
        devicesUnbound: number;
      }>("/admin/plan", {
        method: "POST",
        body: {
          email: form.get("email"),
          plan: form.get("plan"),
          expiresAt: until ? new Date(`${until}T23:59:59`).getTime() : null,
        },
      });
      setResult(
        `${res.email} 现在是 ${res.plan}${res.devicesUnbound ? `，解绑了 ${res.devicesUnbound} 台超出上限的设备` : ""}。`,
      );
      reload();
    } catch (err) {
      setFailed(message(err));
    }
  };

  return (
    <>
      <Block title="手动开通" note="线下收款、送测试号、支付通道出问题时应急">
        <form
          className="grid max-w-[560px] gap-4"
          onSubmit={(e) => void grant(e)}
        >
          <Field id="grant-email" label="账号邮箱">
            <Input id="grant-email" name="email" type="email" required />
          </Field>
          <Field id="grant-plan" label="档位">
            <NativeSelect
              id="grant-plan"
              name="plan"
              className="w-full"
              defaultValue="pro"
            >
              <option value="free">免费</option>
              <option value="solo">Solo</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </NativeSelect>
          </Field>
          <Field id="grant-until" label="到期日（留空 = 不过期）">
            <Input id="grant-until" name="until" type="date" />
          </Field>
          {failed ? <p className="text-sm text-destructive">{failed}</p> : null}
          {result ? <p className="text-sm text-link">{result}</p> : null}
          <div>
            <Button type="submit">开通</Button>
          </div>
        </form>
      </Block>
      <Block title="用户" note="最近注册的 200 个">
        <Input
          className="max-w-[320px]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="按邮箱找"
          aria-label="按邮箱找"
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="table-scroll rounded-xl border border-border">
          <table className="data-table">
            <thead>
              <tr>
                <th>邮箱</th>
                <th>档位</th>
                <th>到期</th>
                <th>在线订阅</th>
                <th>设备</th>
                <th>注册</th>
              </tr>
            </thead>
            <tbody>
              {(data?.users ?? []).map((u) => (
                <tr key={u.email}>
                  <td>{u.email}</td>
                  <td>{u.expired ? `${u.label}（原订阅已过期）` : u.label}</td>
                  <td>{date(u.expiresAt)}</td>
                  <td>
                    {{ active: "有效", canceled: "已取消", expired: "已结束" }[
                      u.billingStatus
                    ] ?? "无"}
                  </td>
                  <td>{u.devices}</td>
                  <td>{date(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>
    </>
  );
}

/* ── 内核上架 ───────────────────────────────────────────── */

/** 内核分两类，每一类有自己的上游和一串版本。和 API 的 license.Engines 对应。 */
const ENGINES = {
  chromium: {
    label: "Chromium 类",
    upstream: "adryfish/fingerprint-chromium",
    sample: "150.0.1.2",
  },
  firefox: {
    label: "Firefox 类",
    upstream: "daijro/camoufox",
    sample: "152.0.4-beta.30",
  },
} as const;
type EngineClass = keyof typeof ENGINES;

type KernelRow = {
  Engine: EngineClass;
  Version: string;
  Platform: string;
  Channel: string;
  URL: string;
  SHA256: string;
  Bytes: number;
  CreatedAt: string;
};

function Kernels() {
  const { data, error, reload } = useLoaded<{ kernels: KernelRow[] }>(
    "/admin/kernels",
  );
  const [failed, setFailed] = useState("");
  const [engine, setEngine] = useState<EngineClass>("chromium");

  const publish = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    setFailed("");
    try {
      await api("/admin/kernels", {
        method: "POST",
        body: {
          engine,
          version: form.get("version"),
          platform: form.get("platform"),
          channel: form.get("channel"),
          url: form.get("url"),
          sha256: form.get("sha256"),
          bytes: Number(form.get("bytes")),
        },
      });
      el.reset();
      reload();
    } catch (err) {
      setFailed(message(err));
    }
  };

  const withdraw = async (k: KernelRow) => {
    setFailed("");
    try {
      await api(
        `/admin/kernels/${encodeURIComponent(k.Version)}/${encodeURIComponent(k.Platform)}`,
        { method: "DELETE" },
      );
      reload();
    } catch (err) {
      setFailed(err instanceof ApiError ? err.message : message(err));
    }
  };

  return (
    <>
      <Block
        title="上架一个版本"
        note="同一个版本和平台再登记一次就是修改，比如预览转稳定"
      >
        <form
          className="grid max-w-[560px] gap-4"
          onSubmit={(e) => void publish(e)}
        >
          <Field id="k-engine" label="哪一类内核">
            <NativeSelect
              id="k-engine"
              className="w-full"
              value={engine}
              onChange={(e) => setEngine(e.target.value as EngineClass)}
            >
              {(Object.keys(ENGINES) as EngineClass[]).map((key) => (
                <option key={key} value={key}>
                  {ENGINES[key].label}（{ENGINES[key].upstream}）
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="k-version" label="版本号">
            <Input
              id="k-version"
              name="version"
              required
              placeholder={ENGINES[engine].sample}
              className="font-mono"
            />
          </Field>
          <Field id="k-platform" label="平台">
            <NativeSelect id="k-platform" name="platform" className="w-full">
              <option value="win-x64">Windows x64</option>
              <option value="mac-arm64">macOS Apple Silicon</option>
              <option value="linux-x64">Linux x64</option>
            </NativeSelect>
          </Field>
          <Field id="k-channel" label="通道">
            <NativeSelect id="k-channel" name="channel" className="w-full">
              <option value="candidate">
                预览（用户要在安全中心同意后才能下载）
              </option>
              <option value="stable">稳定（会成为新建环境的默认版本）</option>
            </NativeSelect>
          </Field>
          <Field
            id="k-url"
            label={`上游下载地址（只接受 ${ENGINES[engine].upstream} 的 GitHub Release）`}
          >
            <Input
              id="k-url"
              name="url"
              required
              type="url"
              className="font-mono"
            />
          </Field>
          <Field id="k-sha" label="SHA256（下载后自行计算）">
            <Input
              id="k-sha"
              name="sha256"
              required
              minLength={64}
              maxLength={64}
              className="font-mono"
            />
          </Field>
          <Field id="k-bytes" label="字节数">
            <Input
              id="k-bytes"
              name="bytes"
              required
              type="number"
              min={1000000}
              className="font-mono"
            />
          </Field>
          {failed ? <p className="text-sm text-destructive">{failed}</p> : null}
          <div>
            <Button type="submit">上架</Button>
          </div>
        </form>
      </Block>
      <Block
        title="已上架"
        note="下架后：已下载的用户可继续使用，未下载的用户将不再看到该版本"
      >
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="table-scroll rounded-xl border border-border">
          <table className="data-table">
            <thead>
              <tr>
                <th>类</th>
                <th>版本</th>
                <th>平台</th>
                <th>通道</th>
                <th>SHA256</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(data?.kernels ?? []).map((k) => (
                <tr key={`${k.Version}/${k.Platform}`}>
                  <td>{ENGINES[k.Engine]?.label ?? k.Engine}</td>
                  <td className="font-mono text-[13px]">{k.Version}</td>
                  <td>{k.Platform}</td>
                  <td>{k.Channel === "stable" ? "稳定" : "预览"}</td>
                  <td className="font-mono text-[13px]">{k.SHA256.slice(0, 16)}…</td>
                  <td className="text-right">
                    <Button
                      variant="link"
                      className="text-destructive"
                      onClick={() => void withdraw(k)}
                    >
                      下架
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>
    </>
  );
}

/* ── 留言 ───────────────────────────────────────────────── */

function Messages() {
  const { data, error } = useLoaded<{
    messages: {
      ID: number;
      Topic: string;
      Email: string;
      Message: string;
      CreatedAt: string;
    }[];
  }>("/admin/messages");
  const topic: Record<string, string> = {
    sales: "销售",
    security: "安全披露",
    support: "使用问题",
  };
  return (
    <Block title="留言" note="联系表单收到的，最近 200 条">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data && data.messages.length === 0 ? (
        <p className="text-muted-foreground">还没有留言。</p>
      ) : null}
      {(data?.messages ?? []).map((m) => (
        <article key={m.ID} className="rounded-xl border border-border p-4">
          <h3 className="font-semibold">
            {topic[m.Topic] ?? m.Topic}，{m.Email}
          </h3>
          <p className="mt-1.5 whitespace-pre-wrap text-body">{m.Message}</p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {new Date(m.CreatedAt).toLocaleString("zh-CN")}
          </p>
        </article>
      ))}
    </Block>
  );
}
