/** 站点常量。域名只在这里写一次，metadata、sitemap、分享卡片都从这里取。 */
export const SITE = {
  name: "Enclave",
  url: "https://tapzm.com",
  domain: "tapzm.com",
  /** 安装包挂在桌面客户端仓库的 GitHub Release 上。 */
  repo: "https://github.com/liangwenli1/enclave",
} as const;

/** 顶栏与页脚共用的导航。 */
export const NAV = [
  { href: "/#product", key: "product" },
  { href: "/pricing", key: "pricing" },
  { href: "/docs", key: "docs" },
  { href: "/download", key: "download" },
] as const;
