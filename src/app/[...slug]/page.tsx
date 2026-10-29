import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleList } from "@/components/ArticleList";
import { LeadForm } from "@/components/LeadForm";
import { StorePage } from "@/components/StorePage";
import { Breadcrumbs, CtaBand, JsonLd, ProductGrid } from "@/components/ui";
import { cleanHtml, linkedPaths, plainText } from "@/lib/content";
import { SITE } from "@/lib/site";
import { decode, getCategories, getEntryByPath, getPages, getPosts, getPostTerms, getProducts, type Entry } from "@/lib/wp";

type Props = { params: Promise<{ slug: string[] }> };

const toPath = (slug: string[]) => `/${slug.map(decode).join("/")}/`;

// Pages whose WordPress content is a WooCommerce/builder shortcode, rendered by the new site instead.
const STORE_PATHS = new Set(["/המוצרים-שלנו/"]);
const ARCHIVE_PATHS = new Set(["/מאמרים/", "/בלוג/"]);
const ACCOUNT_PATHS = new Set([
  "/my-account/", "/החשבון-שלי/", "/lost-password/", "/view-order/", "/edit-address/", "/change-password/",
  "/logout/", "/pay/", "/order-received/", "/wishlist/", "/דף-תודה/",
]);
const CONTACT_PATHS = new Set(["/contact/", "/צור-קשר/"]);
// Pages that had Elementor lead forms — same fields and button text as the original.
const FORMS: Record<string, { title: string; submitLabel: string; withMessage?: boolean }> = {
  "/טכנאי-תמי-4/": { title: "השאירו פרטים וטכנאי יחזור אליכם", submitLabel: "תתקנו לי את התמי 4 שלי!" },
  "/תקלות-תמי-4/": { title: "השאירו פרטים וטכנאי יחזור אליכם", submitLabel: "תתקנו לי את התמי 4 שלי!" },
  "/contact/": { title: "השאירו הודעה", submitLabel: "שלח", withMessage: true },
};
const OWN_ROUTES = new Set(["/", "/shop/", "/cart/", "/checkout/", "/accessibility/"]);

export async function generateStaticParams() {
  const [pages, posts] = await Promise.all([getPages(), getPosts()]);
  return [...pages, ...posts]
    .filter((e) => !OWN_ROUTES.has(e.path))
    .map((e) => ({ slug: e.path.replace(/^\/|\/$/g, "").split("/") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = toPath((await params).slug);
  const entry = await getEntryByPath(path);
  if (!entry) return {};
  const description = entry.seo?.description || plainText(entry.excerpt || entry.content).slice(0, 155);
  return {
    title: { absolute: entry.seo?.title?.replace(/ - My Water$/, " | myWater") ?? `${entry.title} | myWater` },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: entry.title, description, url: path, type: entry.type === "post" ? "article" : "website",
      images: entry.seo?.ogImage ? [entry.seo.ogImage] : entry.featuredImage ? [entry.featuredImage] : [],
    },
    robots: ACCOUNT_PATHS.has(path) || entry.seo?.robots?.index === "noindex" ? { index: false } : undefined,
  };
}

export default async function EntryPage({ params }: Props) {
  const path = toPath((await params).slug);
  if (STORE_PATHS.has(path)) return <StorePage />;
  const entry = await getEntryByPath(path);
  if (!entry) notFound();
  if (ARCHIVE_PATHS.has(path)) return <Articles title={entry.title} />;
  if (ACCOUNT_PATHS.has(path)) return <AccountNotice title={entry.title} />;
  return entry.type === "post" ? <Article entry={entry} /> : <ContentPage entry={entry} contact={CONTACT_PATHS.has(path)} />;
}

async function ContentPage({ entry, contact }: { entry: Entry; contact: boolean }) {
  const html = cleanHtml(entry.content);
  // Product/category links that lived in builder widgets (dropped by cleanHtml) become live cards.
  const kept = linkedPaths(html);
  const linked = linkedPaths(entry.content);
  const productPaths = linked.products.filter((p) => !kept.products.includes(p));
  const catPaths = linked.categories.filter((p) => !kept.categories.includes(p));
  const [products, categories] = await Promise.all([
    productPaths.length ? getProducts() : [], catPaths.length ? getCategories() : [],
  ]);
  const linkedProducts = productPaths.flatMap((p) => products.find((x) => x.path === p) ?? []);
  const linkedCats = catPaths.flatMap((p) => categories.find((x) => x.path === p) ?? []);
  const form = FORMS[entry.path] ?? (contact ? FORMS["/contact/"] : undefined);
  return (
    <div className="container page">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Breadcrumbs items={[{ label: entry.title }]} />
        <h1 className="h1">{entry.title}</h1>
      </div>
      {contact && <ContactBlock />}
      {form && !contact && <LeadForm {...form} source={entry.path} />}
      {html && <section className="glass panel content-panel"><div className="prose" dangerouslySetInnerHTML={{ __html: html }} /></section>}
      {linkedProducts.length > 0 && <ProductGrid products={linkedProducts} label={entry.title} />}
      {linkedCats.length > 0 && (
        <nav aria-label="קטגוריות" className="linked-cats">
          {linkedCats.map((c) => <Link key={c.id} href={c.path} className="pill">{c.name} <span className="pill__count">({c.count})</span></Link>)}
        </nav>
      )}
      {form && contact && <LeadForm {...form} source={entry.path} />}
      {contact && <MapBlock />}
      <CtaBand />
    </div>
  );
}

async function Article({ entry }: { entry: Entry }) {
  const [posts, allTags] = await Promise.all([getPosts(), getPostTerms("tags")]);
  const tags = allTags.filter((t) => entry.tags.includes(t.id));
  const more = posts.filter((p) => p.id !== entry.id).slice(0, 3);
  const html = cleanHtml(entry.content);
  const date = new Date(entry.date);
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "מאמרים", href: "/מאמרים/" }, { label: entry.title }]} />
      <article className="article">
        <header style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="kicker">מאמר · <time dateTime={entry.date}>{date.toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" })}</time></span>
          <h1 className="h1-sm">{entry.title}</h1>
        </header>
        {entry.featuredImage && (
          <Image src={entry.featuredImage} alt="" width={1200} height={630} className="article__hero" sizes="(max-width: 860px) 92vw, 820px" priority />
        )}
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
        {tags.length > 0 && (
          <nav aria-label="תגיות" className="product-tags">
            {tags.map((t) => <Link key={t.id} href={t.path}>{t.name}</Link>)}
          </nav>
        )}
      </article>
      {more.length > 0 && (
        <section aria-labelledby="more" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <h2 id="more" className="h2">מאמרים נוספים</h2>
          <ArticleList posts={more} />
        </section>
      )}
      <CtaBand />
      <JsonLd
        data={{
          "@context": "https://schema.org", "@type": "Article", headline: entry.title, datePublished: entry.date, dateModified: entry.modified,
          mainEntityOfPage: new URL(entry.path, SITE.url).href, image: entry.featuredImage ? [entry.featuredImage] : undefined,
          author: { "@type": "Organization", name: "myWater" }, publisher: { "@id": `${SITE.url}/#business` },
        }}
      />
    </div>
  );
}

async function Articles({ title }: { title: string }) {
  const posts = await getPosts();
  return (
    <div className="container page">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Breadcrumbs items={[{ label: title }]} />
        <h1 className="h1">{title}</h1>
        <p className="lead">{posts.length} מאמרים על מסנני מים, ברי מים, תחזוקה וטיפים.</p>
      </div>
      <ArticleList posts={posts} />
      <CtaBand />
    </div>
  );
}

function AccountNotice({ title }: { title: string }) {
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: title }]} />
      <h1 className="h1-sm">{title}</h1>
      <section className="glass panel" style={{ maxWidth: 720 }}>
        <p className="lead">אזור החשבון (התחברות, הזמנות, כתובות ורשימת המשאלות) יחובר למערכת ההזמנות בשלב הקופה.</p>
        <p className="lead">בינתיים, לכל שאלה על הזמנה: <a href={SITE.phoneHref} dir="ltr" style={{ color: "var(--brand)" }}>{SITE.phone}</a></p>
      </section>
    </div>
  );
}

function ContactBlock() {
  return (
    <section className="glass panel" style={{ maxWidth: 720 }} aria-labelledby="talk">
      <h2 id="talk" className="h2">דברו איתנו</h2>
      <a href={SITE.phoneHref} style={{ font: "300 34px/1.2 var(--font-display)" }}><span dir="ltr">{SITE.phone}</span></a>
      <a href={SITE.phone2Href} style={{ font: "300 26px/1.2 var(--font-display)", color: "var(--body)" }}><span dir="ltr">{SITE.phone2}</span></a>
      <a href={`mailto:${SITE.email}`} style={{ font: "600 16px/1.4 var(--font-ui)", color: "var(--brand)" }}>{SITE.email}</a>
      <a href={SITE.whatsapp} target="_blank" rel="noopener" className="btn btn-wa" style={{ alignSelf: "flex-start" }}>וואטסאפ</a>
      <address style={{ fontStyle: "normal", font: "400 16px/1.5 var(--font-ui)", color: "var(--body)" }}>{SITE.address}</address>
    </section>
  );
}

function MapBlock() {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-label="מפה">
      <div style={{ height: "clamp(240px,34vw,380px)", borderRadius: "var(--r-24)", overflow: "hidden", border: "1px solid var(--glass-border)" }}>
        <iframe title="מפה — myWater כפר סבא" src={`https://www.google.com/maps?q=${SITE.geo.lat},${SITE.geo.lng}&z=16&output=embed`} loading="lazy" style={{ width: "100%", height: "100%", border: 0 }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, font: "600 15px/1.3 var(--font-ui)" }}>
        <a href={`https://www.google.com/maps/search/?api=1&query=${SITE.geo.lat},${SITE.geo.lng}`} style={{ color: "var(--brand)" }} target="_blank" rel="noopener">ניווט עם Google Maps ←</a>
        <a href={SITE.googleBusiness} style={{ color: "var(--brand)" }} target="_blank" rel="noopener">Google לעסק שלי ←</a>
      </div>
    </section>
  );
}
