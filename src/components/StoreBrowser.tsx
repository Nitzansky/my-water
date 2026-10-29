"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductCard } from "./ui";
import type { NavLink } from "@/lib/site";
import type { Product } from "@/lib/wp";

type Sort = "default" | "price-asc" | "price-desc" | "name";

export function StoreBrowser({ products, chips }: { products: Product[]; chips: NavLink[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState(params.get("cat") ?? "");
  const [sort, setSort] = useState<Sort>("default");

  const inChip = (p: Product, href: string) => p.categories.some((c) => c.path.startsWith(href));
  const term = q.trim().toLowerCase();

  const list = useMemo(() => {
    const filtered = products.filter(
      (p) => (!cat || inChip(p, cat)) && (!term || `${p.name} ${p.sku} ${p.categories.map((c) => c.name).join(" ")}`.toLowerCase().includes(term)),
    );
    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "he"));
    return sorted;
  }, [products, cat, term, sort]);

  const syncUrl = (next: { q?: string; cat?: string }) => {
    const u = new URLSearchParams();
    const nq = next.q ?? q, nc = next.cat ?? cat;
    if (nq.trim()) u.set("q", nq.trim());
    if (nc) u.set("cat", nc);
    router.replace(u.size ? `?${u}` : "?", { scroll: false });
  };

  const chipLabel = chips.find((c) => c.href === cat)?.label;
  const heading = term ? `תוצאות עבור "${q.trim()}"` : chipLabel ?? "כל המוצרים";

  return (
    <>
      <form role="search" className="store-search" onSubmit={(e) => { e.preventDefault(); syncUrl({}); }}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => syncUrl({})} placeholder="חיפוש מוצר, דגם או חלק" aria-label="חיפוש מוצרים" autoComplete="off" />
        {q && <button type="button" onClick={() => { setQ(""); syncUrl({ q: "" }); }}>ניקוי</button>}
      </form>

      <div className="chips-bar">
        <div className="chips" role="group" aria-label="סינון לפי קטגוריה">
          {[{ label: "הכל", href: "" }, ...chips].map((c) => (
            <button key={c.href} type="button" className="chip" aria-pressed={cat === c.href} onClick={() => { setCat(c.href); syncUrl({ cat: c.href }); }}>
              {c.label}
              <sup>{c.href ? products.filter((p) => inChip(p, c.href)).length : products.length}</sup>
            </button>
          ))}
        </div>
      </div>

      <div className="store-head">
        <h2 className="h2">{heading}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <label className="store-sort">
            <span>מיון</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="default">מומלץ</option>
              <option value="price-asc">מחיר: מהנמוך לגבוה</option>
              <option value="price-desc">מחיר: מהגבוה לנמוך</option>
              <option value="name">שם: א–ת</option>
            </select>
          </label>
          <span role="status" style={{ font: "400 15px/1.5 var(--font-ui)", color: "var(--muted)" }}>
            {list.length === 1 ? "מוצר אחד" : `${list.length} מוצרים`}
          </span>
        </div>
      </div>

      {list.length ? (
        <ul className="product-grid" aria-label={heading}>
          {list.map((p, i) => <li key={p.id}><ProductCard product={p} priority={i < 4} /></li>)}
        </ul>
      ) : (
        <p style={{ margin: 0, padding: "48px 0", font: "300 28px/1.3 var(--font-display)", color: "var(--body)", textAlign: "center" }}>
          לא מצאנו מוצר שמתאים. <a href="tel:0504032033" style={{ color: "var(--brand)" }}>התקשרו ונעזור</a>
        </p>
      )}
    </>
  );
}
