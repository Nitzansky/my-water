import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyButtons } from "@/components/BuyButtons";
import { Gallery } from "@/components/Gallery";
import { Breadcrumbs, CtaBand, JsonLd, Price, ProductGrid } from "@/components/ui";
import { cleanHtml, plainText } from "@/lib/content";
import { SITE } from "@/lib/site";
import { decode, getProduct, getProducts, getProductSeo } from "@/lib/wp";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [product, seo] = await Promise.all([getProduct(slug), getProductSeo(slug)]);
  if (!product) return {};
  const description = seo?.description || plainText(product.shortDescription || product.description).slice(0, 155) || product.name;
  const image = product.images[0]?.white ?? product.images[0]?.src;
  return {
    title: { absolute: seo?.title?.replace(/ - My Water$/, " | myWater") ?? `${product.name} | myWater` },
    description,
    alternates: { canonical: product.path },
    openGraph: { title: product.name, description, url: product.path, images: image ? [{ url: image, width: 1200, height: 1200 }] : [] },
    robots: seo?.robots?.index === "noindex" ? { index: false } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(decode(slug));
  if (!product) notFound();

  const all = await getProducts();
  const mainCat = product.categories.find((c) => c.name !== "כללי") ?? product.categories[0];
  const related = all
    .filter((p) => p.id !== product.id && p.categories.some((c) => product.categories.some((pc) => pc.id === c.id && pc.name !== "כללי")))
    .slice(0, 4);
  const description = cleanHtml(product.description);
  const short = cleanHtml(product.shortDescription);
  // Long summaries (full spec sheets) move into the details section so price and buy stay above the fold.
  const shortIsLong = plainText(short).length > 280 || /<img/.test(short);

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "המוצרים שלנו", href: "/shop/" }, ...(mainCat ? [{ label: mainCat.name, href: mainCat.path }] : []), { label: product.name }]} />

      <section className="product-top">
        <Gallery images={product.images} name={product.name} />
        <div className="product-info">
          {mainCat && <span className="product-info__tag">{mainCat.name}</span>}
          <h1 className="h1-sm">{product.name}</h1>
          {short && !shortIsLong && <div className="prose product-info__short" dangerouslySetInnerHTML={{ __html: short }} />}
          <Price product={product} className="price product-info__price" />
          <p className="product-info__stock" data-in={product.inStock}>{product.inStock ? "במלאי — זמין למשלוח" : "אזל מהמלאי כרגע"}</p>
          <BuyButtons
            large
            inStock={product.inStock}
            product={{ id: product.id, name: product.name, price: product.price, path: product.path, image: product.images[0]?.src ?? null }}
          />
          <ul className="product-info__perks">
            <li>✓ משלוח עד הבית או איסוף מכפר סבא</li>
            <li>✓ אפשרות להתקנה עם טכנאי</li>
            <li>✓ ייעוץ בטלפון <a href={SITE.phoneHref} dir="ltr">{SITE.phone}</a></li>
          </ul>
          {product.sku && <p className="product-info__meta">מק״ט: {product.sku}</p>}
        </div>
      </section>

      {(description || shortIsLong || product.attributes.length > 0) && (
        <section className="glass panel" style={{ maxWidth: 860 }} aria-labelledby="details">
          <h2 id="details" className="h2">פרטי המוצר</h2>
          {shortIsLong && <div className="prose" dangerouslySetInnerHTML={{ __html: short }} />}
          {description && <div className="prose" dangerouslySetInnerHTML={{ __html: description }} />}
          {product.attributes.length > 0 && (
            <table className="spec">
              <caption className="sr-only">מפרט</caption>
              <tbody>
                {product.attributes.map((a) => (
                  <tr key={a.name}><th scope="row">{a.name}</th><td>{a.terms.join(", ")}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {product.tags.length > 0 && (
        <nav aria-label="תגיות" className="product-tags">
          {product.tags.map((t) => <Link key={t.id} href={t.path}>{t.name}</Link>)}
        </nav>
      )}

      {related.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }} aria-labelledby="related">
          <h2 id="related" className="h2">מוצרים נוספים</h2>
          <ProductGrid products={related} label="מוצרים נוספים" />
        </section>
      )}

      <CtaBand />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          sku: product.sku || String(product.id),
          url: new URL(product.path, SITE.url).href,
          image: product.images.map((i) => new URL(i.white ?? i.src, SITE.url).href),
          description: plainText(product.shortDescription || product.description).slice(0, 500) || product.name,
          category: mainCat?.name,
          offers: {
            "@type": "Offer",
            url: new URL(product.path, SITE.url).href,
            priceCurrency: "ILS",
            price: product.price.toFixed(2),
            availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@id": `${SITE.url}/#business` },
          },
        }}
      />
    </div>
  );
}
