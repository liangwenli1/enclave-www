import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { PageHead } from "@/components/page-head";

export const metadata: Metadata = {
  title: "联系我们",
  description: "购买咨询、使用问题与安全披露。",
  alternates: { canonical: "/contact" },
};

const TOPICS: [string, string][] = [
  ["购买与开通", "档位选择、线下付款开通、团队采购。"],
  ["使用问题", "安装、登录、代理、同步遇到问题时，写明系统与出错时的提示。"],
  ["安全披露", "发现安全问题，写明复现步骤；确认后会尽快修复。"],
];

export default function ContactPage() {
  return (
    <main>
      <PageHead eyebrow="联系我们" title="有问题，直接写给我们" lead="回复会发到所填的邮箱。常见问题可以先查看文档。" />
      <section className="py-14 sm:py-16">
        <div className="site-wrap grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="grid content-start gap-6">
            {TOPICS.map(([title, text]) => (
              <div key={title} className="border-t border-border pt-4">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-[15px] text-body">{text}</p>
              </div>
            ))}
            <p className="text-[14.5px] text-muted-foreground">
              也可以先看看<Link href="/docs" className="text-link hover:underline">文档</Link>。
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
