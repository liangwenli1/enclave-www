import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/account-panel";

export const metadata: Metadata = {
  title: "账号",
  description: "登录或注册 Enclave，查看档位、额度、已登录的电脑与团队。",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <main>
      <AccountPanel />
    </main>
  );
}
