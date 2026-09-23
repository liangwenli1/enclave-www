import type { Metadata } from "next";
import { DeviceAuthorize } from "@/components/device-authorize";

export const metadata: Metadata = {
  title: "登录工作台",
  description: "确认本机的 Enclave 工作台登录当前账号。",
  robots: { index: false },
};

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const q = await searchParams;
  return (
    <main className="www-main">
      <DeviceAuthorize
        challenge={one(q.challenge)}
        deviceId={one(q.device)}
        deviceName={one(q.name)}
      />
    </main>
  );
}
