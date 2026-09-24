import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SITE } from "@/lib/site";
import "./globals.css";

// 西文与数字用 Instrument Sans，代码与数字表格用 JetBrains Mono。都随站自托管（OFL），
// 不向第三方请求字体——Google Fonts 在国内会卡住整页渲染。中文落到系统字体。
const instrument = localFont({
  src: "./fonts/instrument-sans-latin-wght-normal.woff2",
  weight: "400 700",
  variable: "--font-instrument",
  display: "swap",
});
const jetbrains = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
  display: "swap",
});

// 每个请求的 CSP nonce 不一样（见 proxy.ts），页面必须按请求渲染，不能预渲染成静态文件。
export const dynamic = "force-dynamic";

const description =
  "Enclave 是运行在本机的多账号浏览器。每个环境拥有独立的指纹、Cookie 与出口 IP，跨境店铺、广告账户与社媒矩阵互不关联；团队按文件夹授权，登录态端到端加密同步。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Enclave：每个账号，一台独立的电脑",
    template: "%s · Enclave",
  },
  description,
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "zh_CN",
    title: "Enclave：每个账号，一台独立的电脑",
    description,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${instrument.variable} ${jetbrains.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          跳到正文
        </a>
        <SiteHeader />
        <div id="main">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
