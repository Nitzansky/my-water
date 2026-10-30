"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PagedGrid } from "./PagedGrid";
import { index, score } from "@/lib/search";
import { PRODUCT_MENU, SITE, type NavLink } from "@/lib/site";
import type { Product } from "@/lib/wp";

type Sort = "default" | "price-asc" | "price-desc" | "name";

// The shop's product list (search, category tabs) and, without `chips`/`search`, a category page's list.
// Both get sorting and an in-stock filter; out-of-stock products always come last.
export function StoreBrowser({ products, chips, search = true, label }: { products: Product[]; chips?: NavLink[]; search?: boolean; label?: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState<Sort>("default");
  const [inStock, setInStock] = useState(false);

  // ?q= and ?cat= (links from the header/hero search) are read after hydration, so the static HTML is the full list.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (search) setQ(params.get("q") ?? "");
    if (chips) setCat(params.get("cat") ?? "");
  }, [search, chips]);

  const inChip = (p: Product, href: string) => p.categories.some((c) => c.path.startsWith(href));
  const indexed = useMemo(
    () => new Map(products.map((p) => [p.id, index(`${p.name} ${p.sku} ${p.categories.map((c) => c.name).join(" ")} ${p.tags.map((t) => t.name).join(" ")}`)])),
    [products],
  );
  const term = q.trim();

  const list = useMemo(() => {
    const scored = products
      .filter((p) => (!cat || inChip(p, cat)) && (!inStock || p.inStock))
      .map((p, i) => ({ p, i, s: term ? score(term, indexed.get(p.id)!) : 1 }))
      .filter((x) => x.s > 0);
    const by: Record<Sort, (a: (typeof scored)[0], b: (typeof scored)[0]) => number> = {
      default: (a, b) => b.s - a.s || a.i - b.i,
      "price-asc": (a, b) => a.p.price - b.p.price,
      "price-desc": (a, b) => b.p.price - a.p.price,
      name: (a, b) => a.p.name.localeCompare(b.p.name, "he"),
    };
    return scored.sort((a, b) => Number(!a.p.inStock) - Number(!b.p.inStock) || by[sort](a, b)).map((x) => x.p);
  }, [products, cat, term, sort, inStock, indexed]);

  const syncUrl = (next: { q?: string; cat?: string }) => {
    const u = new URLSearchParams();
    const nq = next.q ?? q, nc = next.cat ?? cat;
    if (nq.trim()) u.set("q", nq.trim());
    if (nc) u.set("cat", nc);
    history.replaceState(history.state, "", u.size ? `?${u}` : location.pathname);
  };

  const chipLabel = chips?.find((c) => c.href === cat)?.label;
  const heading = term ? `תוצאות עבור "${term}"` : chipLabel ?? label ?? "כל המוצרים";
  const outCount = products.filter((p) => !p.inStock).length;

  return (
    <>
      {search && (
        <form role="search" className="store-search" onSubmit={(e) => { e.preventDefault(); syncUrl({}); }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input id="store-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => syncUrl({})} placeholder="חיפוש מוצר, דגם או חלק" aria-label="חיפוש מוצרים" autoComplete="off" />
          {q && <button type="button" onClick={() => { setQ(""); syncUrl({ q: "" }); }}>ניקוי</button>}
        </form>
      )}

      {chips && (
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
      )}

      <div className="store-head">
        <h2 className="h2">{heading}</h2>
        <div className="store-tools">
          {outCount > 0 && (
            <label className="store-toggle">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
              <span>רק מוצרים במלאי</span>
            </label>
          )}
          <label className="store-sort">
            <span>מיון</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="default">מומלץ</option>
              <option value="price-asc">מחיר: מהנמוך לגבוה</option>
              <option value="price-desc">מחיר: מהגבוה לנמוך</option>
              <option value="name">שם: א–ת</option>
            </select>
          </label>
          <span role="status" className="store-count">{list.length === 1 ? "מוצר אחד" : `${list.length} מוצרים`}</span>
        </div>
      </div>

      {list.length ? (
        <PagedGrid key={`${term}|${cat}|${sort}|${inStock}`} products={list} label={heading} />
      ) : (
        <div className="no-results">
          <p className="no-results__title">לא מצאנו מוצר שמתאים{term ? ` ל"${term}"` : ""}.</p>
          <p>אולי תמצאו אותו באחת הקטגוריות:</p>
          <nav aria-label="קטגוריות" className="linked-cats">
            {PRODUCT_MENU.map((c) => <Link key={c.href} href={c.href} className="pill">{c.label}</Link>)}
          </nav>
          <p>או <a href={SITE.phoneHref}>התקשרו ונעזור</a> — <span dir="ltr">{SITE.phone}</span></p>
        </div>
      )}
    </>
  );
}
