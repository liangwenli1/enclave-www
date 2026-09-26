import data from "./plans.json";

/*
 * 套餐。额度抄自服务器（api/internal/license），api/internal/license/site_test.go 钉住两边一致；
 * 价格只在这里（plans.json），收银台里的产品价格要和它相同。
 */

export type PlanId = "free" | "solo" | "pro" | "team";

/** 本机 API：off = 不开放，discover = 只读，full = 可启动与停止。 */
export type ApiLevel = "off" | "discover" | "full";

export type SitePlan = {
  plan: PlanId;
  name: string;
  /** 美元 / 月 */
  price: number;
  envLimit: number;
  concurrent: number;
  /** 每个人可登录几台电脑 */
  deviceLimit: number;
  /** 团队最多几个人（含所有者） */
  seats: number;
  api: ApiLevel;
};

export const PLANS = data.plans as SitePlan[];

/** 套餐表里唯一被强调的一档。 */
export const FEATURED: PlanId = "pro";

export const PLAN_FOR: Record<PlanId, string> = {
  free: "适合个人体验与轻量使用",
  solo: "适合个人管理多账号",
  pro: "适合高频运营与 API 自动化",
  team: "适合多人协作与权限管理",
};

export const PLAN_FOR_EN: Record<PlanId, string> = {
  free: "For evaluation and light personal use",
  solo: "For individuals managing multiple accounts",
  pro: "For high-volume operations and API automation",
  team: "For team collaboration and access control",
};

export const API_LABEL: Record<ApiLevel, string> = {
  off: "—",
  discover: "只读",
  full: "可启动与停止",
};
