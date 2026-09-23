/* 账号接口。和页面同源（Caddy 把 /api/* 反代给账号服务），会话是 HttpOnly cookie，前端不碰任何令牌。 */

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init?.method ?? "GET",
    credentials: "same-origin",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json().catch(() => null)) as
    ({ ok?: boolean; code?: string; message?: string } & T) | null;
  if (!res.ok || data?.ok === false) {
    throw new ApiError(
      data?.code ?? `HTTP_${res.status}`,
      data?.message ?? `请求失败（${res.status}）`,
    );
  }
  return data as T;
}

export type Plan = {
  plan: string;
  label: string;
  envLimit: number;
  concurrent: number;
  /** 每个人能登录几台电脑。 */
  deviceLimit: number;
  /** 这个团队最多几个人（含所有者）。除 Team 外都是 1。 */
  seats: number;
};

/** 在团队里的角色。一个人用的账号永远是 owner。 */
export type Role = "owner" | "admin" | "operator";

export type Me = {
  user: { email: string; isAdmin: boolean; role: Role } | null;
  license: {
    plan: string;
    label: string;
    envLimit: number;
    concurrent: number;
    deviceLimit: number;
    /** 这个团队最多几个人（含所有者）。除 Team 外都是 1。 */
    seats: number;
    expiresAt: number | null;
    expiredPlan?: string;
    expiredAt?: number;
  };
  devices: { id: string; name: string; lastSeenAt: number }[];
  /** 账号下所有电脑合起来：登记了几个环境、此刻有几个在运行。 */
  usage: { profiles: number; running: number };
  billing: {
    /** 管理员把支付通道配好了，才能在线订阅。 */
    available: boolean;
    /** canceled = 已取消，到期前仍然有效。 */
    status: "" | "active" | "canceled" | "expired";
    /** 在支付通道那边有记录，才有「管理订阅」（换卡、取消、账单）。 */
    manageable: boolean;
  };
};

/** 一个环境在云端的登记：只有名字和内核版本，指纹、代理、Cookie 都不在服务器上。 */
/** 文件夹：授权的单位。开给成员之后，里面的环境他全都看得到。 */
export type FolderRow = {
  id: string;
  name: string;
  /** 里面有几个环境。删之前要让人知道会影响多少个。 */
  profiles: number;
  createdAt: number;
};

export type ProfileRow = {
  id: string;
  name: string;
  engineVersion: string;
  createdAt: number;
  /** 正在哪台设备上运行；空 = 没在运行。 */
  runningOn: string;
};
