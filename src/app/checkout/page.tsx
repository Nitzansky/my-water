import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "קופה", robots: { index: false } };

// Placeholder: the real checkout (WooCommerce order + Grow payment) is built in the checkout phase.
export default function CheckoutPage() {
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "סל קניות", href: "/cart/" }, { label: "קופה" }]} />
      <h1 className="h1">קופה</h1>
      <section className="glass panel" style={{ maxWidth: 720 }}>
        <p className="lead">הקופה המאובטחת (תשלום באשראי ובביט) תחובר בשלב הבא של הבנייה.</p>
        <p className="lead">להזמנה כבר עכשיו: <a href={SITE.phoneHref} dir="ltr" style={{ color: "var(--brand)" }}>{SITE.phone}</a> או בוואטסאפ.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/cart/" className="btn btn-primary">חזרה לסל</Link>
          <a href={SITE.whatsapp} target="_blank" rel="noopener" className="btn btn-wa">הזמנה בוואטסאפ</a>
        </div>
      </section>
    </div>
  );
}
