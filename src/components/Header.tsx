"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CartCount } from "./cart";
import { PRODUCT_MENU, SITE, TAMI_FILTERS_MENU, TAMI_SERVICE_MENU, TOP_LINKS, type NavLink } from "@/lib/site";

export type SearchItem = { name: string; path: string; image: string | null };

type MenuKey = "prod" | "tami" | null;

export function Header({ searchIndex }: { searchIndex: SearchItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<MenuKey>(null);
  const [mobile, setMobile] = useState(false);
  const closeT = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isCurrent = (href: string) => decodeURIComponent(pathname) === href;
  const enter = (k: MenuKey) => () => { clearTimeout(closeT.current); setOpen(k); };
  const leave = () => { clearTimeout(closeT.current); closeT.current = setTimeout(() => setOpen(null), 160); };

  return (
    <header className="site-header">
      <div className="site-header__glass" aria-hidden="true" />
      <Link href="/" aria-label="myWater — דף הבית" className="site-header__logo">
        <Image src="/mywater-logo.png" alt="myWater — טיפה יותר" width={136} height={44} priority />
      </Link>

      <nav aria-label="ראשי" className="nav-desktop">
        <Link href="/" aria-current={isCurrent("/") ? "page" : undefined}>דף הבית</Link>
        <Dropdown
          label="המוצרים שלנו" href="/המוצרים-שלנו/" k="prod" open={open} setOpen={setOpen} enter={enter} leave={leave}
          current={isCurrent("/המוצרים-שלנו/") || pathname.startsWith("/product")}
        >
          <div className="menu-grid">{PRODUCT_MENU.map((l) => <MenuLink key={l.href} {...l} />)}</div>
          <Link href="/shop/" className="menu-all">לכל המוצרים<span aria-hidden="true">←</span></Link>
        </Dropdown>
        <Dropdown label="תמי 4" href="/tami-4/" k="tami" open={open} setOpen={setOpen} enter={enter} leave={leave} current={isCurrent("/tami-4/")} wide>
          <div className="menu-cols">
            <div>
              <span className="kicker menu-heading">מסנן לתמי 4</span>
              {TAMI_FILTERS_MENU.map((l) => <MenuLink key={l.href} {...l} />)}
            </div>
            <div className="menu-col-split">
              <span className="kicker menu-heading">שירות וחלפים</span>
              {TAMI_SERVICE_MENU.map((l) => <MenuLink key={l.href} {...l} />)}
            </div>
          </div>
        </Dropdown>
        {TOP_LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>{l.label}</Link>
        ))}
      </nav>

      <button type="button" className="pill nav-mobile-toggle" aria-label="תפריט" aria-expanded={mobile} aria-controls="mobile-menu" onClick={() => setMobile((m) => !m)}>
        <span aria-hidden="true">{mobile ? "✕" : "☰"}</span><span className="nav-mobile-toggle__label">תפריט</span>
      </button>

      <div className="site-header__actions">
        <HeaderSearch index={searchIndex} />
        <Link href="/cart/" className="pill">
          סל<span className="sr-only"> קניות</span><CartCount />
        </Link>
        <a href={SITE.phoneHref} className="btn btn-primary header-phone">
          <span className="header-phone__full" dir="ltr">{SITE.phone}</span>
          <span className="header-phone__short">התקשרו</span>
        </a>
      </div>

      {mobile && (
        <nav id="mobile-menu" aria-label="תפריט נייד" className="mobile-menu">
          <div className="menu-grid-auto">
            <MenuLink label="דף הבית" href="/" />
            {TOP_LINKS.map((l) => <MenuLink key={l.href} {...l} />)}
          </div>
          <MobileGroup title="המוצרים שלנו" links={[...PRODUCT_MENU, { label: "לכל המוצרים", href: "/shop/" }]} />
          <MobileGroup title="מסנן לתמי 4" links={TAMI_FILTERS_MENU} />
          <MobileGroup title="תמי 4 — שירות וחלפים" links={[{ label: "תמי 4", href: "/tami-4/" }, ...TAMI_SERVICE_MENU]} />
        </nav>
      )}
    </header>
  );
}

function MenuLink({ label, href }: NavLink) {
  return <Link href={href} className="menu-link">{label}</Link>;
}

function MobileGroup({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div className="mobile-group">
      <span className="kicker menu-heading">{title}</span>
      <div className="menu-grid-auto">{links.map((l) => <MenuLink key={l.href} {...l} />)}</div>
    </div>
  );
}

type DropdownProps = {
  label: string; href: string; k: Exclude<MenuKey, null>; open: MenuKey; setOpen: (k: MenuKey) => void;
  enter: (k: MenuKey) => () => void; leave: () => void; current: boolean; wide?: boolean; children: React.ReactNode;
};

function Dropdown({ label, href, k, open, setOpen, enter, leave, current, wide, children }: DropdownProps) {
  const id = useId();
  const isOpen = open === k;
  return (
    <div className="nav-dd" onMouseEnter={enter(k)} onMouseLeave={leave}>
      <Link href={href} aria-current={current ? "page" : undefined}>{label}</Link>
      <button
        type="button" className="nav-dd__toggle" aria-expanded={isOpen} aria-controls={id}
        aria-label={`${isOpen ? "סגירת" : "פתיחת"} תפריט ${label}`} onClick={() => setOpen(isOpen ? null : k)}
      >
        <span aria-hidden="true" style={{ transform: isOpen ? "rotate(180deg)" : undefined }}>▼</span>
      </button>
      <div id={id} className={`menu-panel ${wide ? "menu-panel--wide" : ""}`} hidden={!isOpen}>{children}</div>
    </div>
  );
}

function HeaderSearch({ index }: { index: SearchItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrap = useRef<HTMLFormElement>(null);

  const term = q.trim().toLowerCase();
  const results = term.length < 2 ? [] : index.filter((p) => p.name.toLowerCase().includes(term)).slice(0, 6);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <form
      ref={wrap} role="search" className="header-search"
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        router.push(active >= 0 && results[active] ? results[active].path : `/shop/?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
      <input
        type="search" value={q} placeholder="חיפוש מוצר…" aria-label="חיפוש מוצרים" autoComplete="off"
        role="combobox" aria-expanded={open && results.length > 0} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
        }}
      />
      {open && results.length > 0 && (
        <ul id={listId} role="listbox" className="search-results">
          {results.map((r, i) => (
            <li key={r.path} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <Link href={r.path} onClick={() => setOpen(false)}>
                {r.image ? <Image src={r.image} alt="" width={40} height={40} /> : <span className="search-results__ph" />}
                <span>{r.name}</span>
              </Link>
            </li>
          ))}
          <li role="option" aria-selected={false}>
            <Link href={`/shop/?q=${encodeURIComponent(q.trim())}`} className="search-results__all" onClick={() => setOpen(false)}>כל התוצאות עבור &quot;{q.trim()}&quot; ←</Link>
          </li>
        </ul>
      )}
    </form>
  );
}
