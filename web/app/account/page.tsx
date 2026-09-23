import type { Metadata } from "next";
import { AccountPanel } from "@/components/account-panel";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "账号",
  description: "注册、登录，查看套餐与已绑定设备，申请升级或联系我们。",
};

export default function AccountPage() {
  return (
    <main className="www-main">
      <AccountPanel />
      <section className="www-section" id="contact">
        <div className="www-section-head">
          <h2>联系我们</h2>
          <p>销售咨询、开通与安全披露均通过此处提交</p>
        </div>
        <div className="pt-4">
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
