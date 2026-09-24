import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "退款政策",
  alternates: { canonical: "/refund" },
};

export default function RefundPage() {
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
