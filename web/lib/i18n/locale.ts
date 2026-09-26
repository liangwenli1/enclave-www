export const LOCALES = ["en", "zh-cn"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value.toLowerCase() as Locale);
}

export function localeFromPath(pathname: string): Locale | null {
  const segment = pathname.split("/")[1]?.toLowerCase() ?? "";
  return isLocale(segment) ? segment : null;
}

export function localeFromLanguage(value: string | null | undefined): Locale {
  if (!value) return "en";
  return /(^|,|\s)zh(?:-|_|;|,|$)/i.test(value) ? "zh-cn" : "en";
}

export function htmlLanguage(locale: Locale): string {
  return locale === "zh-cn" ? "zh-CN" : "en";
}

export function localizePath(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/api/")) return href;
  const current = localeFromPath(href);
  if (current) return `/${locale}${href.slice(current.length + 1) || "/"}`;
  return `/${locale}${href === "/" ? "" : href}`;
}
