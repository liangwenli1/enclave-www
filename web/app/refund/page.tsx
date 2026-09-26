import type { Metadata } from "next";
import { LocaleLink as Link } from "@/components/locale-link";
import { LegalPage } from "@/components/legal";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const english = (await getRequestLocale()) === "en";
  return { title: english ? "Refund Policy" : "退款政策", alternates: { canonical: english ? "/en/refund" : "/zh-cn/refund" } };
}

export default async function RefundPage() {
  const english = (await getRequestLocale()) === "en";
  if (english) return (
    <LegalPage title="Refund Policy" updated="2026-09-24">
      <p>The free plan is available without a payment method. Use it to evaluate Enclave before starting a paid subscription.</p>
      <h2>First subscription</h2><p>A full refund may be requested within seven days of the first subscription to a paid plan. The account returns to the free plan after the refund.</p>
      <h2>Renewals</h2><p>Automatic renewal charges are non-refundable. Subscriptions can be cancelled at any time and remain active through the current billing period.</p>
      <h2>Service disruption</h2><p>When an Enclave service failure causes an extended loss of access, refund requests are assessed according to the duration and impact of the disruption.</p>
      <h2>Request a refund</h2><p>Use the <Link href="/contact">contact form</Link> and include the account email and plan. Approved refunds return to the original payment method; processing time depends on the payment provider.</p>
    </LegalPage>
  );
  return (
    <LegalPage title="退款政策" updated="2026-09-24">
      <p>免费档永久可用，不需要绑卡。建议先用免费档确认 Enclave 是否适合，再订阅付费档。</p>
      <h2>首次订阅</h2>
      <p>首次订阅某一付费档后 7 天内，可以申请全额退款。退款完成后，账号回到免费档。</p>
      <h2>续费</h2>
      <p>自动续费产生的扣款不退款。可以随时在账号页取消订阅，取消后本期结束之前仍按原档位使用，到期后不再扣款。</p>
      <h2>服务故障</h2>
      <p>因我们的服务故障导致长时间无法使用的，按受影响的时长协商退款。</p>
      <h2>如何申请</h2>
      <p>
        通过<Link href="/contact">联系我们</Link>提交，写明账号邮箱与订阅的档位。款项原路退回，到账时间取决于付款渠道。
      </p>
    </LegalPage>
  );
}
