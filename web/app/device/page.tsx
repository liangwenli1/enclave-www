import type { Metadata } from "next";
import { DeviceAuthorize } from "@/components/account/device-authorize";

export const metadata: Metadata = {
  title: "登录工作台",
  description: "确认本机的 Enclave 工作台登录当前账号。",
  robots: { index: false },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function DevicePage({ searchParams }: PageProps<"/device">) {
  const q = await searchParams;
  return (
    <main>
      <DeviceAuthorize challenge={one(q.challenge)} deviceId={one(q.device)} deviceName={one(q.name)} />
    </main>
  );
}
