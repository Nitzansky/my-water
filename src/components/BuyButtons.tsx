"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type CartProduct } from "./cart";

type Props = { product: CartProduct; inStock: boolean; large?: boolean };

// The design's split pill: "הוספה לסל" adds to the cart, "קנייה מהירה" adds and goes to checkout.
export function BuyButtons({ product, inStock, large }: Props) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!inStock) {
    return (
      <div className={`split ${large ? "split-lg" : ""}`} role="group" aria-label={`קנייה: ${product.name}`}>
        <button type="button" disabled>אזל מהמלאי</button>
        <a href={`https://wa.me/972504032033?text=${encodeURIComponent(`שלום, אשמח לדעת מתי ${product.name} יחזור למלאי`)}`}>עדכנו אותי</a>
      </div>
    );
  }

  const onAdd = () => {
    add(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <>
      {large && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span id={`qty-${product.id}`} style={{ font: "600 15px/1 var(--font-ui)", color: "var(--body)" }}>כמות</span>
          <div className="stepper" role="group" aria-labelledby={`qty-${product.id}`}>
            <button type="button" aria-label="הוספת יחידה" onClick={() => setQty((q) => q + 1)}>+</button>
            <output aria-live="polite">{qty}</output>
            <button type="button" aria-label="הפחתת יחידה" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty === 1}>−</button>
          </div>
        </div>
      )}
      <div className={`split ${large ? "split-lg" : ""}`} role="group" aria-label={`קנייה: ${product.name}`}>
        <button type="button" onClick={onAdd}>{added ? "✓ נוסף לסל" : "הוספה לסל"}</button>
        <Link
          href="/checkout/"
          onClick={(e) => {
            e.preventDefault();
            add(product, qty);
            router.push("/checkout/");
          }}
          aria-label={`קנייה מהירה: ${product.name}`}
        >
          {large ? "קנייה מהירה ←" : "קנייה מהירה"}
        </Link>
      </div>
    </>
  );
}
