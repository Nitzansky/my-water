import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, CtaBand, JsonLd, ProductGrid } from "@/components/ui";
import { cleanHtml, plainText } from "@/lib/content";
import { SITE } from "@/lib/site";
import { decode, getCategories, getCategoryByPath, getProductsInCategory, type Category } from "@/lib/wp";

type Props = { params: Promise<{ path: string[] }> };

const toPath = (segments: string[]) => `/product-category/${segments.map(decode).join("/")}/`;

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ path: c.path.replace(/^\/product-category\/|\/$/g, "").split("/") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = await getCategoryByPath(toPath((await params).path));
  if (!cat) return {};
  const description = plainText(cat.description).slice(0, 155) || `${cat.name} — ${cat.count} מוצרים במשלוח עד הבית או עם התקנה של טכנאי. myWater, כפר סבא.`;
  return { title: cat.name, description, alternates: { canonical: cat.path }, openGraph: { title: cat.name, description, url: cat.path } };
}

export default async function CategoryPage({ params }: Props) {
  const cat = await getCategoryByPath(toPath((await params).path));
  if (!cat) notFound();

  const [all, products] = await Promise.all([getCategories(), getProductsInCategory(cat)]);
  const parent = all.find((c) => c.id === cat.parent);
  const children = all.filter((c) => c.parent === cat.id && c.count > 0);
  const siblings = all.filter((c) => c.parent === cat.parent && c.id !== cat.id && c.count > 0);
  const description = cleanHtml(cat.description);

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "המוצרים שלנו", href: "/shop/" }, ...(parent ? [{ label: parent.name, href: parent.path }] : []), { label: cat.name }]} />

      <header style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}>
        <h1 className="h1">{cat.name}</h1>
        {description ? <div className="prose lead" dangerouslySetInnerHTML={{ __html: description }} /> : null}
      </header>

      {children.length > 0 && <CategoryLinks label="סינון לפי דגם" cats={children} />}

      <div className="store-head">
        <h2 className="h2">{children.length ? `כל המוצרים ב${cat.name}` : "המוצרים"}</h2>
        <span style={{ font: "400 0.9375rem/1.5 var(--font-ui)", color: "var(--muted)" }}>{products.length === 1 ? "מוצר אחד" : `${products.length} מוצרים`}</span>
      </div>
      {products.length ? (
        <ProductGrid products={products} label={cat.name} />
      ) : (
        <p className="lead">אין כרגע מוצרים בקטגוריה. <a href={SITE.phoneHref} style={{ color: "var(--brand)" }}>התקשרו ונעזור</a></p>
      )}

      <CtaBand />

      {siblings.length > 0 && (
        <section aria-labelledby="more-cats" className="all-cats">
          <h2 id="more-cats" className="kicker" style={{ margin: 0 }}>עוד באתר</h2>
          <ul>{siblings.map((c) => <li key={c.id}><Link href={c.path}>{c.name}<span>{c.count}</span></Link></li>)}</ul>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: cat.name,
          url: new URL(cat.path, SITE.url).href,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: new URL(p.path, SITE.url).href, name: p.name })),
          },
        }}
      />
    </div>
  );
}

function CategoryLinks({ label, cats }: { label: string; cats: Category[] }) {
  return (
    <nav aria-label={label} className="chips">
      {cats.map((c) => <Link key={c.id} href={c.path} className="chip">{c.name}<sup>{c.count}</sup></Link>)}
    </nav>
  );
}
