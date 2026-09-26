import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocaleLink as Link } from "@/components/locale-link";
import type { Locale } from "@/lib/i18n/locale";
import { SITE } from "@/lib/site";

const COPY = {
  en: {
    description: "A local-first browser workspace for managing separate account environments.",
    columns: [
      { title: "Product", links: [["/#product", "Features"], ["/pricing", "Pricing"], ["/download", "Download"], ["/changelog", "Changelog"]] },
      { title: "Resources", links: [["/docs", "Documentation"], ["/check", "Fingerprint check"], ["/security", "Security"]] },
      { title: "Support", links: [["/contact", "Contact"], ["/terms", "Terms"], ["/privacy", "Privacy"], ["/refund", "Refund policy"]] },
    ],
  },
  "zh-cn": {
    description: "每个账号，一台独立的电脑。运行在本机的多账号浏览器。",
    columns: [
      { title: "产品", links: [["/#product", "功能"], ["/pricing", "套餐"], ["/download", "下载"], ["/changelog", "更新日志"]] },
      { title: "资源", links: [["/docs", "文档"], ["/check", "浏览器指纹检测"], ["/security", "安全"]] },
      { title: "支持", links: [["/contact", "联系我们"], ["/terms", "服务条款"], ["/privacy", "隐私政策"], ["/refund", "退款政策"]] },
    ],
  },
} as const;

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  return (
    <footer className="border-t border-border bg-background">
      <div className="site-wrap grid grid-cols-2 gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-2 grid content-start gap-3 md:col-span-1">
          <Brand />
          <p className="max-w-[18em] text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
        {copy.columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="grid content-start gap-2.5 text-sm">
            <p className="font-semibold text-foreground">{col.title}</p>
            {col.links.map(([href, label]) => (
              <Link key={href} href={href} className="w-fit text-muted-foreground hover:text-foreground">
                {label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="site-wrap grid items-center gap-2 py-4 text-[13px] text-muted-foreground sm:grid-cols-[1fr_auto_1fr]">
          <span>© 2026 Enclave</span>
          <span className="sm:text-center">{SITE.domain}</span>
          <div className="sm:justify-self-end">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
