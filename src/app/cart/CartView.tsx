"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart";
import { formatPrice } from "@/components/ui";

export function CartView() {
  const { items, total, count, ready, setQty, remove } = useCart();

  if (!ready) return <p className="lead" aria-busy="true">טוען את הסל…</p>;

  if (!items.length) {
    return (
      <section className="glass panel" style={{ alignItems: "flex-start" }}>
        <p style={{ margin: 0, font: "300 28px/1.3 var(--font-display)" }}>הסל ריק.</p>
        <Link href="/shop/" className="btn btn-primary">למוצרים שלנו ←</Link>
      </section>
    );
  }

  return (
    <section className="cart-layout" aria-label="פריטים בסל">
      <ul className="cart-items">
        {items.map((it) => (
          <li key={it.id} className="glass cart-item">
            <div className="cart-item__img glow">{it.image && <Image src={it.image} alt="" fill sizes="80px" />}</div>
            <div className="cart-item__body">
              <Link href={it.path} className="cart-item__name">{it.name}</Link>
              <div className="stepper" role="group" aria-label={`כמות: ${it.name}`}>
                <button type="button" aria-label="הוספת יחידה" onClick={() => setQty(it.id, it.qty + 1)}>+</button>
                <output aria-live="polite">{it.qty}</output>
                <button type="button" aria-label="הפחתת יחידה" onClick={() => setQty(it.id, it.qty - 1)}>−</button>
              </div>
            </div>
            <div className="cart-item__side">
              <span className="price" style={{ fontSize: 22 }}>{formatPrice(it.price * it.qty)}</span>
              <button type="button" className="link-btn" onClick={() => remove(it.id)} aria-label={`הסרת ${it.name} מהסל`}>הסרה</button>
            </div>
          </li>
        ))}
      </ul>
      <aside className="glass panel cart-summary" aria-labelledby="summary">
        <h2 id="summary" style={{ margin: 0, font: "600 19px/1.3 var(--font-ui)" }}>סיכום</h2>
        <div className="cart-summary__row"><span>{count === 1 ? "מוצר אחד" : `${count} מוצרים`}</span><span>{formatPrice(total)}</span></div>
        <div className="cart-summary__row" style={{ color: "var(--muted)" }}><span>משלוח</span><span>יחושב בקופה</span></div>
        <div className="cart-summary__total"><span>סה״כ</span><span className="price" style={{ fontSize: 26 }}>{formatPrice(total)}</span></div>
        <Link href="/checkout/" className="btn btn-primary" style={{ minHeight: 56, fontSize: 17 }}>המשך לתשלום ←</Link>
        <Link href="/shop/" style={{ textAlign: "center", font: "600 15px/1.3 var(--font-ui)", color: "var(--brand)" }}>המשך קנייה</Link>
      </aside>
    </section>
  );
}
