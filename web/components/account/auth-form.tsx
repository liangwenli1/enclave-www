"use client";

import { useState, type FormEvent } from "react";
import { cn } from "cn";
import { Field } from "@/components/field";
import { ErrorText } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export type AuthMode = "in" | "up";

/** 登录 / 注册。账号页、工作台登录确认页共用。 */
export function AuthForm({
  mode,
  onMode,
  onDone,
}: {
  mode: AuthMode;
  onMode: (m: AuthMode) => void;
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
    <div className="grid gap-6">
      <div role="tablist" aria-label="登录或注册" className="grid grid-cols-2 rounded-full bg-accent p-1">
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
            onClick={() => {
              setError("");
              onMode(key);
            }}
            className={cn(
              "cursor-pointer rounded-full py-2 text-[14.5px] transition-colors",
              mode === key ? "bg-card font-medium text-foreground shadow-sm" : "text-body hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <form className="grid gap-4" onSubmit={(e) => void submit(e)}>
        <Field id="email" label="邮箱">
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="name@company.com" />
        </Field>
        <Field id="password" label={mode === "up" ? "密码（至少 10 位）" : "密码"}>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "up" ? 10 : 1}
            autoComplete={mode === "up" ? "new-password" : "current-password"}
          />
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button size="lg" type="submit" disabled={busy} className="mt-1 w-full">
          {busy ? "处理中…" : mode === "in" ? "登录" : "注册并开通免费档"}
        </Button>
        {mode === "up" ? (
          <p className="text-center text-[13px] text-muted-foreground">免费档：3 个环境、同时运行 1 个，无需绑卡。</p>
        ) : null}
      </form>
    </div>
  );
}
