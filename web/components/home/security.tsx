import type { ReactNode } from "react";
import { LocaleLink as Link } from "@/components/locale-link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { LockIcon } from "@/components/icons";
import { getRequestLocale } from "@/lib/i18n/request-locale";

/* 加密同步路径。保持浅色页面节奏，窄屏时改为纵向。 */

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const Laptop = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
    <rect x="6" y="7" width="20" height="13" rx="1.5" {...stroke} />
    <path d="M3 24h26l-2-4H5z" {...stroke} />
  </svg>
);
const Server = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
    <rect x="6" y="5" width="20" height="9" rx="1.5" {...stroke} />
    <rect x="6" y="17" width="20" height="9" rx="1.5" {...stroke} />
    <path d="M10 9.5h.01M10 21.5h.01M15 9.5h7M15 21.5h7" {...stroke} strokeWidth={2} />
  </svg>
);

function Node({ icon, title, text, tag, locked }: { icon: ReactNode; title: string; text: string; tag: string; locked: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-primary">{icon}</div>
      <p className="mt-3 font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{text}</p>
      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-chip px-2.5 py-0.5 text-[12.5px] text-chip-foreground">
        {locked ? <LockIcon className="size-3" /> : null}
        {tag}
      </p>
    </div>
  );
}

function Hop({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-[12.5px] font-medium text-primary md:flex-col md:gap-1 md:px-1 md:py-0">
      <span>{label}</span>
      <ArrowDown className="size-4 md:hidden" aria-hidden="true" />
      <ArrowRight className="hidden size-4 md:block" aria-hidden="true" />
    </div>
  );
}

const POINTS = [
  ["新设备需经现有设备确认", "现有设备确认并核对 6 位数字后，才会向新设备传递密钥。"],
  ["移除成员后自动轮换密钥", "对应设备将立即解绑，相关环境在后台自动更换密钥。"],
  ["完整性校验失败时阻止启动", "每次启动前校验内核文件；文件与签名清单不一致时拒绝启动。"],
] as const;

export async function SecurityBand() {
  const english = (await getRequestLocale()) === "en";
  const points = english
    ? ([
        ["New devices require approval", "An existing device confirms a six-digit code before transferring the encryption key."],
        ["Keys rotate when members are removed", "The member's device is revoked immediately and affected environments receive new keys."],
        ["Modified kernels cannot start", "Kernel files are checked before every launch and blocked if they do not match the signed manifest."],
      ] as const)
    : POINTS;
  return (
    <section className="border-y border-border bg-muted">
      <div className="site-wrap py-24 sm:py-28">
        <div className="max-w-[40em]">
          <p className="eyebrow">{english ? "Security" : "安全"}</p>
          <h2 className="display-3 mt-3">{english ? "End-to-end encrypted sync" : "端到端加密同步"}</h2>
          <p className="lead mt-5">
            {english
              ? "Data is encrypted on this computer and can only be decrypted by authorized devices. The server stores ciphertext only."
              : "同步数据在本机完成加密，仅已授权设备可以解密。服务器只保存密文。"}
          </p>
        </div>

        <figure className="mt-12">
          <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <Node icon={<Laptop />} title={english ? "This computer" : "本机"} text={english ? "Login state, cookies, and proxy credentials are encrypted here." : "登录态、Cookie、代理密码在这里加密。"} tag={english ? "Key stored locally" : "密钥在本机"} locked />
            <Hop label={english ? "Encrypted upload" : "加密后上传"} />
            <Node icon={<Server />} title={english ? "Server" : "服务器"} text={english ? "Stores ciphertext and version data, without the decryption key." : "只保存密文与版本号，没有解开的钥匙。"} tag={english ? "Ciphertext only" : "只有密文"} locked={false} />
            <Hop label={english ? "Download ciphertext" : "下载密文"} />
            <Node icon={<Laptop />} title={english ? "Another team device" : "团队的另一台电脑"} text={english ? "Receives the key after a six-digit verification, then decrypts locally." : "核对 6 位数字后获得密钥，在本机解开。"} tag={english ? "Approved by an existing device" : "密钥由已有电脑交付"} locked />
          </div>
          <figcaption className="sr-only">
            {english ? "Encrypted sync path from the local device through ciphertext storage to an approved team device." : "加密同步的路径：本机加密后上传，服务器只保存密文，团队的另一台电脑在核对 6 位数字后获得密钥并在本机解密。"}
          </figcaption>
        </figure>

        <div className="mt-14 grid gap-8 border-t border-border pt-10 md:grid-cols-3">
          {points.map(([title, text]) => (
            <div key={title}>
              <p className="font-semibold text-foreground">{title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <Link href="/security" className="mt-10 inline-flex items-center gap-1.5 font-medium text-link hover:underline hover:underline-offset-4">
          {english ? "Read about our security design" : "了解安全设计"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
