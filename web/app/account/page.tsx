import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/account-panel";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return { title: english ? "Account" : "账号", description: english ? "Manage your Enclave plan, usage, devices, and team." : "管理 Enclave 档位、额度、登录设备与团队。", robots: { index: false } };
}

export default function AccountPage() {
  return (
    <main>
      <AccountPanel />
    </main>
  );
}
