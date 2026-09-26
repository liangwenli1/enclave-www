import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/admin", "/device", "/join", "/en/account", "/en/admin", "/en/device", "/en/join", "/zh-cn/account", "/zh-cn/admin", "/zh-cn/device", "/zh-cn/join", "/api/"] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
