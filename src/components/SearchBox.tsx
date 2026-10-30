"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { index, score } from "@/lib/search";

export type SearchItem = { name: string; path: string; image: string | null };

const shopUrl = (q: string) => `/shop/?q=${encodeURIComponent(q.trim())}`;

// Product search with live results as you type (header and hero). Enter opens the highlighted product,
// or all results on the shop page.
export function SearchBox({ index: items, autoFocus, id, hero }: { index: SearchItem[]; autoFocus?: boolean; id?: string; hero?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrap = useRef<HTMLFormElement>(null);
  const indexed = useMemo(() => items.map((p) => ({ p, words: index(p.name) })), [items]);

  const term = q.trim();
  const results = term.length < 2 ? [] : indexed.map((x) => ({ p: x.p, s: score(term, x.words) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 6).map((x) => x.p);

  useEffect(() => {
    if (autoFocus) wrap.current?.querySelector("input")?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  return (
    <form
      ref={wrap} id={id} role="search" className={hero ? "hero-search glass" : "header-search"}
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        if (active >= 0 && results[active]) router.push(results[active].path);
        else if (term) router.push(shopUrl(term));
        else wrap.current?.querySelector("input")?.focus();
      }}
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
      <input
        type="search" value={q} placeholder={hero ? "חפשו מסנן, דגם או חלק…" : "חיפוש מוצר…"} aria-label="חיפוש מוצרים" autoComplete="off"
        enterKeyHint="search" role="combobox" aria-expanded={open && results.length > 0} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {hero && <button type="submit" className="btn btn-primary">חיפוש</button>}
      {open && term.length >= 2 && (
        <ul id={listId} role="listbox" className="search-results">
          {results.map((r, i) => (
            <li key={r.path} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <Link href={r.path} onClick={() => setOpen(false)}>
                {r.image ? <Image src={r.image} alt="" width={40} height={40} /> : <span className="search-results__ph" />}
                <span>{r.name}</span>
              </Link>
            </li>
          ))}
          {!results.length && <li className="search-results__none">לא מצאנו מוצר שמתאים.</li>}
          <li role="option" aria-selected={false}>
            <Link href={shopUrl(term)} className="search-results__all" onClick={() => setOpen(false)}>
              {results.length ? <>כל התוצאות עבור &quot;{term}&quot; ←</> : <>לחיפוש בכל החנות ←</>}
            </Link>
          </li>
        </ul>
      )}
    </form>
  );
}
