import type { Metadata } from "next";
import { LocaleLink as Link } from "@/components/locale-link";
import { ContactForm } from "@/components/contact-form";
import { PageHead } from "@/components/page-head";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return { title: english ? "Contact" : "联系我们", description: english ? "Sales, product support, and security disclosures." : "购买咨询、使用问题与安全披露。", alternates: { canonical: english ? "/en/contact" : "/zh-cn/contact" } };
}

const TOPICS: [string, string][] = [
  ["购买与开通", "档位选择、线下付款开通、团队采购。"],
  ["使用问题", "安装、登录、代理、同步遇到问题时，写明系统与出错时的提示。"],
  ["安全披露", "发现安全问题，写明复现步骤；确认后会尽快修复。"],
];

export default async function ContactPage() {
  const english = (await getRequestLocale()) === "en";
  const topics = english
    ? ([
        ["Sales and access", "Plan selection, offline payment, and team purchasing."],
        ["Product support", "For installation, sign-in, proxy, or sync issues, include the operating system and exact error message."],
        ["Security disclosure", "Include clear reproduction steps. Confirmed issues will be addressed as quickly as possible."],
      ] as const)
    : TOPICS;
  return (
    <main>
      <PageHead eyebrow={english ? "Contact" : "联系我们"} title={english ? "Contact the Enclave team" : "联系 Enclave 团队"} lead={english ? "Replies are sent to the email address provided. Documentation may already answer common questions." : "回复将发送到所填邮箱。常见问题可先查阅文档。"} />
      <section className="py-14 sm:py-16">
        <div className="site-wrap grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="grid content-start gap-6">
            {topics.map(([title, text]) => (
              <div key={title} className="border-t border-border pt-4">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-[15px] text-body">{text}</p>
              </div>
            ))}
            <p className="text-[14.5px] text-muted-foreground">
              {english ? "Review the " : "也可先查阅"}<Link href="/docs" className="text-link hover:underline">{english ? "documentation" : "文档"}</Link>{english ? "." : "。"}
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
