"use client";

import { useRef, useState } from "react";
import { ProductCard } from "./ui";
import type { Product } from "@/lib/wp";

// A product grid that shows `step` products at a time. The rest are still in the HTML (hidden), so every
// product link stays crawlable; "הצגת עוד" reveals the next batch and moves focus to its first product.
export function PagedGrid({ products, label = "מוצרים", step = 12 }: { products: Product[]; label?: string; step?: number }) {
  const [shown, setShown] = useState(step);
  const list = useRef<HTMLUListElement>(null);
  const left = products.length - shown;

  const more = () => {
    const first = shown;
    setShown((n) => n + step);
    requestAnimationFrame(() => list.current?.querySelectorAll<HTMLAnchorElement>(".product-card__title a")[first]?.focus());
  };

  return (
    <div className="paged">
      <ul ref={list} className="product-grid" aria-label={label}>
        {products.map((p, i) => (
          <li key={p.id} hidden={i >= shown}><ProductCard product={p} priority={i < 4} /></li>
        ))}
      </ul>
      {left > 0 && (
        <div className="paged__more">
          <span>מוצגים {shown} מתוך {products.length}</span>
          <button type="button" className="btn paged__btn" onClick={more}>הצגת עוד {Math.min(step, left)} מוצרים</button>
        </div>
      )}
    </div>
  );
}
