"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { ErrorText } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

/** 购买咨询、使用问题、安全披露都走这里。不需要登录。 */
export function ContactForm() {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    setError("");
    setSent(false);
    setBusy(true);
    try {
      await api("/contact", {
        method: "POST",
        body: {
          topic: form.get("topic"),
          email: String(form.get("email")).trim().toLowerCase(),
          message: String(form.get("message")).trim(),
        },
      });
      el.reset();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  };

  return (
    <form className="grid gap-5 rounded-2xl border border-border bg-card p-6 shadow-frame sm:p-8" onSubmit={(e) => void submit(e)}>
      <Field id="topic" label="主题">
        <NativeSelect id="topic" name="topic" className="w-full">
          <option value="sales">购买与开通</option>
          <option value="support">使用问题</option>
          <option value="security">安全披露</option>
        </NativeSelect>
      </Field>
      <Field id="contact-email" label="邮箱">
        <Input id="contact-email" name="email" type="email" required autoComplete="email" placeholder="name@company.com" />
      </Field>
      <Field id="message" label="内容" hint="5 到 1000 字。">
        <Textarea id="message" name="message" required minLength={5} maxLength={1000} rows={6} placeholder="写清楚问题或需求" />
      </Field>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {sent ? (
        <p role="status" className="rounded-lg bg-[#e3f4ea] px-3.5 py-2.5 text-sm text-ok">
          已收到，回复会发到所填的邮箱。
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "提交中…" : "提交"}
        </Button>
      </div>
    </form>
  );
}
