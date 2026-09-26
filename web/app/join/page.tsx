import type { Metadata } from "next";
import { JoinTeam } from "@/components/account/join-team";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return { title: english ? "Join Team" : "加入团队", description: english ? "Accept an invitation to join an Enclave team." : "接受邀请并加入 Enclave 团队。", robots: { index: false } };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const q = await searchParams;
  return (
    <main>
      <JoinTeam code={one(q.code)} />
    </main>
  );
}
