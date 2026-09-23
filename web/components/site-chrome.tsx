"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  ["/", "产品"],
  ["/pricing", "套餐"],
  ["/download", "下载"],
  ["/docs", "文档"],
  ["/account", "账号"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="www-header">
      <div className="www-bar">
        <Link className="www-brand" href="/">
          <svg
            className="www-mark"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect width="24" height="24" fill="currentColor" />
            <g className="cut" fill="none" strokeWidth="1.7">
              <path d="M6 17a6 6 0 0 1 12 0" />
              <path d="M9 17a3 3 0 0 1 6 0" />
              <path d="M4.5 12.5A8.5 8.5 0 0 1 12 7" />
            </g>
          </svg>
          Enclave
        </Link>
        <nav className="www-nav">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              data-active={pathname === href}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="www-footer">
      <div className="www-foot">
        <div>Enclave，运行在本机的多环境浏览器</div>
        <nav>
          <Link href="/docs">文档</Link>
          <Link href="/download">下载与校验</Link>
          <Link href="/legal">安全与法律</Link>
        </nav>
      </div>
    </footer>
  );
}
