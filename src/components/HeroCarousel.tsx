"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BuyButtons } from "./BuyButtons";
import { formatPrice } from "./ui";

export type HeroProduct = { id: number; name: string; path: string; price: number; image: string | null; category: string; inStock: boolean };

export function HeroCarousel({ products }: { products: HeroProduct[] }) {
  const [i, setI] = useState(0);
  const p = products[i];
  if (!p) return null;
  const go = (d: number) => setI((n) => (n + d + products.length) % products.length);

  return (
    <section className="hero-card glass" aria-roledescription="קרוסלה" aria-label="הנמכרים ביותר">
      <div className="hero-card__head">
        <h2 className="hero-card__title">הנמכרים ביותר</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="round-btn" onClick={() => go(-1)} aria-label="המוצר הקודם">→</button>
          <button type="button" className="round-btn" onClick={() => go(1)} aria-label="המוצר הבא">←</button>
        </div>
      </div>
      <div className="hero-card__item" aria-roledescription="שקופית" aria-label={`${i + 1} מתוך ${products.length}`} aria-live="polite">
        <Link href={p.path} className="hero-card__img glow" tabIndex={-1} aria-hidden="true">
          {p.image && <Image src={p.image} alt="" fill sizes="104px" />}
        </Link>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span className="kicker">{p.category}</span>
          <Link href={p.path} className="hero-card__name">{p.name}</Link>
          <span className="price" style={{ fontSize: 24 }}>{formatPrice(p.price)}</span>
        </div>
      </div>
      <BuyButtons inStock={p.inStock} product={{ id: p.id, name: p.name, price: p.price, path: p.path, image: p.image }} />
      <div className="hero-card__foot">
        <div className="dots" aria-hidden="true">{products.map((_, n) => <span key={n} data-on={n === i} />)}</div>
        <Link href="/shop/" className="hero-card__all">לכל המוצרים ←</Link>
      </div>
    </section>
  );
}
