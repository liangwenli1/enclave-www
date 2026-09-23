import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import "./globals.css";

// 西文和数字用 Archivo，自托管，不向第三方请求字体；中文落到系统字体。
const archivo = localFont({
  src: "./fonts/archivo-latin.woff2",
  weight: "100 900",
  variable: "--font-archivo",
  display: "swap",
});

// 每个请求的 CSP nonce 不一样（见 proxy.ts），页面必须按请求渲染，不能预渲染成静态文件。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Enclave，运行在本机的多环境浏览器",
    template: "%s，Enclave",
  },
  description:
    "每个环境拥有独立的指纹、Cookie 与出口 IP，全部运行在本机。店铺、广告账户、社媒矩阵各自独立，网站无法看出它们来自同一个人。",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={archivo.variable}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
