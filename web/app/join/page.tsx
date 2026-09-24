import type { Metadata } from "next";
import { JoinTeam } from "@/components/account/join-team";

export const metadata: Metadata = {
  title: "加入团队",
  description: "接受邀请，加入一个 Enclave 团队。",
  robots: { index: false },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const q = await searchParams;
  return (
    <main>
      <JoinTeam code={one(q.code)} />
    </main>
  );
}
