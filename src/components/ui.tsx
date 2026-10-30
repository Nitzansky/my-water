import Image from "next/image";
import Link from "next/link";
import { BuyButtons } from "./BuyButtons";
import { FOOTER_LINKS, PRODUCT_MENU, SITE, TAMI_SERVICE_MENU, TOP_LINKS } from "@/lib/site";
import type { Product } from "@/lib/wp";

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);

export function Price({ product, className = "price" }: { product: Product; className?: string }) {
  const discounted = product.onSale && product.regularPrice > product.price;
  return (
    <span className={className}>
      {discounted && <span className="sr-only">מחיר מבצע: </span>}
      {formatPrice(product.price)}
      {discounted && (
        <>
          <span className="sr-only"> במקום </span>
          <del>{formatPrice(product.regularPrice)}</del>
        </>
      )}
    </span>
  );
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ label: "ראשי", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="פירורי לחם">
        <ol className="crumbs">
          {all.map((c, i) => (
            <li key={i}>
              {i === all.length - 1 || !c.href ? <span aria-current="page">{c.label}</span> : <Link href={c.href}>{c.label}</Link>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: new URL(c.href, SITE.url).href } : {}),
          })),
        }}
      />
    </>
  );
}

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const img = product.images[0];
  const cat = product.categories.find((c) => c.name !== "כללי") ?? product.categories[0];
  return (
    <article className="product-card">
      <Link href={product.path} className="product-card__media glow" tabIndex={-1} aria-hidden="true">
        {img && <Image src={img.src} alt="" fill sizes="(max-width: 600px) 90vw, (max-width: 1200px) 33vw, 280px" priority={priority} />}
        <span className="product-card__badges">
          {product.onSale && product.regularPrice > product.price && <span className="tag-chip sale">מבצע</span>}
          {!product.inStock && <span className="tag-chip out">אזל</span>}
        </span>
      </Link>
      <div className="product-card__body">
        <h3 className="product-card__title"><Link href={product.path}>{product.name}</Link></h3>
        {cat && <p className="product-card__cat">{cat.name}</p>}
      </div>
      <div className="product-card__foot">
        <Price product={product} />
        <BuyButtons
          inStock={product.inStock}
          product={{ id: product.id, name: product.name, price: product.price, path: product.path, image: img?.src ?? null }}
        />
      </div>
    </article>
  );
}

export function ProductGrid({ products, label = "מוצרים" }: { products: Product[]; label?: string }) {
  return (
    <ul className="product-grid" aria-label={label}>
      {products.map((p, i) => <li key={p.id}><ProductCard product={p} priority={i < 4} /></li>)}
    </ul>
  );
}

const WaIcon = ({ size = 24 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flex: "none" }}>
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 7c0 5.45-4.44 9.89-9.89 9.89m8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.31-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.49-8.41" />
  </svg>
);

export function WhatsAppFab() {
  return (
    <a href={SITE.whatsapp} target="_blank" rel="noopener" className="wa-fab" aria-label="שליחת הודעה בוואטסאפ (נפתח בחלון חדש)">
      <WaIcon /><span>וואטסאפ</span>
    </a>
  );
}

export function CtaBand({ title = "לא בטוחים מה מתאים?", text = "ספרו לנו את דגם הבר ונמליץ — או שטכנאי יגיע ויחליף." }: { title?: string; text?: string }) {
  return (
    <section className="dark-band" aria-label={title}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 className="h2" style={{ color: "#fff" }}>{title}</h2>
        <p style={{ margin: 0, font: "400 1rem/1.55 var(--font-ui)", color: "var(--on-dark-muted)" }}>{text}</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifySelf: "end" }}>
        <a href={SITE.phoneHref} className="btn btn-white"><span dir="ltr">{SITE.phone}</span></a>
        <a href={SITE.whatsapp} target="_blank" rel="noopener" className="btn btn-outline-light"><WaIcon size={18} />וואטסאפ</a>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div>
          <Image src="/mywater-logo.png" alt="myWater — טיפה יותר" width={120} height={40} style={{ height: 40, width: "auto" }} />
          <address style={{ fontStyle: "normal", marginTop: 12 }}>
            {SITE.address}
            <br />
            <a href={SITE.phoneHref} dir="ltr">{SITE.phone}</a> · <a href={SITE.phone2Href} dir="ltr">{SITE.phone2}</a>
            <br />
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </address>
        </div>
        <nav aria-label="קטגוריות ראשיות">
          <h2>המוצרים שלנו</h2>
          <ul>{PRODUCT_MENU.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
        </nav>
        <nav aria-label="שירות">
          <h2>תמי 4 ושירות</h2>
          <ul>
            <li><Link href="/tami-4/">תמי 4</Link></li>
            {TAMI_SERVICE_MENU.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
          </ul>
        </nav>
        <nav aria-label="מידע">
          <h2>מידע</h2>
          <ul>
            {TOP_LINKS.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
            {FOOTER_LINKS.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
          </ul>
        </nav>
      </div>
      <div className="site-footer__bottom">
        <span>© {new Date().getFullYear()} myWater · {SITE.legalNote}</span>
        <a href={SITE.googleBusiness} target="_blank" rel="noopener">גוגל לעסק שלי</a>
      </div>
    </footer>
  );
}
