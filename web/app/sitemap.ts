import type { MetadataRoute } from "next";
import { DOCS } from "@/content/docs";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/pricing", "/download", "/docs", "/changelog", "/security", "/check", "/contact", "/terms", "/privacy", "/refund"];
  return (["en", "zh-cn"] as const).flatMap((locale) => [
    ...pages.map((p) => ({ url: `${SITE.url}/${locale}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...DOCS.map((d) => ({ url: `${SITE.url}/${locale}/docs/${d.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ]);
}
