"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

/** 销售咨询、使用问题、安全披露都走这里。不需要登录。 */
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
    <form
      className="grid max-w-[560px] gap-4 rounded-xl border border-input p-7"
      onSubmit={(e) => void submit(e)}
    >
      <Field id="topic" label="主题">
        <NativeSelect id="topic" name="topic" className="w-full">
          <option value="sales">销售 / 开通咨询</option>
          <option value="security">安全披露</option>
          <option value="support">使用问题</option>
        </NativeSelect>
      </Field>
      <Field id="contact-email" label="邮箱">
        <Input
          id="contact-email"
          name="email"
          type="email"
          required
          placeholder="you@company.com"
        />
      </Field>
      <Field id="message" label="内容">
        <Textarea
          id="message"
          name="message"
          required
          minLength={5}
          maxLength={1000}
          rows={5}
          placeholder="请写清楚问题或需求"
        />
      </Field>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {sent ? (
        <p className="text-sm text-link">已收到，我们将通过所填邮箱回复。</p>
      ) : null}
      <div>
        <Button variant="outline" type="submit" disabled={busy}>
          {busy ? "提交中…" : "提交"}
        </Button>
      </div>
    </form>
  );
}
