import type { Metadata } from "next";
import { DeviceAuthorize } from "@/components/account/device-authorize";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return { title: english ? "Authorize Desktop Sign-in" : "授权工作台登录", description: english ? "Authorize Enclave on this device to access the current account." : "授权本机 Enclave 工作台登录当前账号。", robots: { index: false } };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function DevicePage({ searchParams }: PageProps<"/device">) {
  const q = await searchParams;
  return (
    <main>
      <DeviceAuthorize challenge={one(q.challenge)} deviceId={one(q.device)} deviceName={one(q.name)} />
    </main>
  );
}
