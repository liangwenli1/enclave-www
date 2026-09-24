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
  { href: "/#product", label: "产品" },
  { href: "/pricing", label: "套餐" },
  { href: "/docs", label: "文档" },
  { href: "/download", label: "下载" },
] as const;
