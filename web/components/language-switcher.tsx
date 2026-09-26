"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "@/components/locale-provider";
import { localizePath } from "@/lib/i18n/locale";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();

  const target = (nextLocale: "en" | "zh-cn") => {
    const query = search.toString();
    const nextPath = localizePath(pathname, nextLocale);
    return `${nextPath}${query ? `?${query}` : ""}`;
  };

  const remember = (nextLocale: "en" | "zh-cn") => {
    document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  };

  return (
    <div className="inline-flex min-h-10 items-center gap-2" aria-label={locale === "zh-cn" ? "选择语言" : "Choose language"}>
      <Link
        href={target("zh-cn")}
        onClick={() => remember("zh-cn")}
        aria-pressed={locale === "zh-cn"}
        className={locale === "zh-cn" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}
      >
        简体中文
      </Link>
      <span aria-hidden="true" className="text-border">/</span>
      <Link
        href={target("en")}
        onClick={() => remember("en")}
        aria-pressed={locale === "en"}
        className={locale === "en" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}
      >
        English
      </Link>
    </div>
  );
}
