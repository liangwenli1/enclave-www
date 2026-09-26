import { NextRequest, NextResponse } from "next/server";
import { isLocale, localeFromLanguage, localeFromPath } from "@/lib/i18n/locale";

/**
 * 每个请求一个随机 nonce，页面里只有带这个 nonce 的脚本和样式能执行。
 * 账号接口和页面同源（Caddy 把 /api/* 反代给账号服务），所以 connect-src 只要 'self'。
 */
export function proxy(request: NextRequest) {
  // Next.js may run the proxy again for the internal, locale-stripped rewrite.
  // Let that second pass render the route instead of redirecting it back to the
  // public locale URL and creating a redirect loop.
  if (request.headers.get("x-enclave-internal-rewrite") === "1") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const pathLocale = localeFromPath(pathname);
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value.toLowerCase();
  const locale = pathLocale ?? (cookieLocale && isLocale(cookieLocale) ? cookieLocale : localeFromLanguage(request.headers.get("accept-language")));

  if (!pathLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url, 307);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("x-enclave-locale", locale);
  headers.set("x-enclave-internal-rewrite", "1");
  headers.set("Content-Security-Policy", csp);
  const url = request.nextUrl.clone();
  url.pathname = pathname.slice(pathLocale.length + 1) || "/";
  const response = NextResponse.rewrite(url, { request: { headers } });
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  // 静态资源（截图、图标、分享图、robots、sitemap）和预取请求不需要 nonce。
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|shots/|.*\\.[^/]+$|apple-icon|opengraph-image|twitter-image|robots\\.txt|sitemap\\.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
