import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HeroCarousel } from "@/components/HeroCarousel";
import { WaterStory } from "@/components/story/WaterStory";
import { JsonLd, ProductGrid } from "@/components/ui";
import { BASE_PATH, SITE } from "@/lib/site";
import { getBestsellers, getEntryByPath, getProducts, type Product } from "@/lib/wp";

export async function generateMetadata(): Promise<Metadata> {
  const home = await getEntryByPath("/");
  return {
    title: { absolute: home?.seo?.title?.replace(/ - My Water$/, " | myWater") ?? "myWater — מסננים לתמי 4, ברי מים וטכנאי עד הבית" },
    description: home?.seo?.description ?? undefined,
    alternates: { canonical: "/" },
  };
}

// The live home page's category cards — original titles and links.
const SYSTEMS = [
  { title: "תמי 4", href: "/tami-4/", from: "/product-category/filter-for-tami-4/" },
  { title: "מערכות למניעת אבנית", href: "/product-category/מסנן-אבנית/" },
  { title: "מיני בר", href: "/product-category/מיני-בר-מים-לבית/" },
  { title: "ברי מים לעסק", href: "/product-category/bussinesswaterbar/" },
  { title: "מערכות מים תת כיור", href: "/product-category/מסננים-ופילטרים-להחלפה/" },
  { title: "אוסמוזה הפוכה", href: "/product-category/אוסמוזה-הפוכה/" },
  { title: "קולרים לעסקים ומוסדות", href: "/product-category/מוצרי-מים-למוסדות/" },
  { title: "מערכת תת כיורית למים חמים וקרים", href: "/product-category/undersink-system-for-hot-and-cold-water/" },
  { title: "כל סוגי המסננים", href: "/product-category/filters/" },
  { title: "מסננים למקררים", href: "/product-category/מסננים-למקררים/" },
];

const FAULTS = [
  { label: "לא מקרר", href: "/תקלות-תמי-4/" },
  { label: "לא יוצאים מים", href: "/תקלות-תמי-4/" },
  { label: "תקלה 8 — חימום", href: "/תקלות-תמי-4/" },
  { label: "לא נדלק", href: "/תקלות-תמי-4/" },
];

const FAQ = [
  { q: "כל כמה זמן מחליפים מסנן לתמי 4?", a: "בדרך כלל כל כמה חודשים, לפי צריכת המים והמלצת היצרן. אפשר לפנות אלינו ונבדוק מתי הגיע הזמן אצלכם." },
  { q: "מה ההבדל בין מסנן מקורי למסנן תואם?", a: "מסנן מקורי מיוצר על ידי יצרן המכשיר. מסנן תואם מתאים לאותו מכשיר ומיוצר על ידי יצרן אחר. שניהם זמינים אצלנו." },
  { q: "האם טכנאי מגיע להחליף את המסנן?", a: "כן. טכנאי מגיע לבית או לעסק להחלפת מסננים, התקנת מערכות ותיקון תקלות." },
  { q: "באילו אזורים אתם נותנים שירות?", a: "אנחנו בכפר סבא ומשרתים את האזור. התקשרו לבדיקת זמינות." },
];

// Products for the 3D story's filter stages (design picks: original filter, compatible filter, RO system).
const STORY_PRODUCT_IDS = [5384, 6328, 1514];

function imageFor(products: Product[], categoryPath: string) {
  const p = products.find((x) => x.inStock && x.images[0]?.enhanced && x.categories.some((c) => c.path.startsWith(categoryPath)));
  return p?.images[0]?.src ?? null;
}

export default async function Home() {
  const [products, best] = await Promise.all([getProducts(), getBestsellers(8)]);
  const bestsellers = best.length >= 4 ? best : products.filter((p) => p.inStock).slice(0, 8);
  const heroProducts = bestsellers.slice(0, 5).map((p) => ({
    id: p.id, name: p.name, path: p.path, price: p.price, image: p.images[0]?.src ?? null, inStock: p.inStock,
    category: (p.categories.find((c) => c.name !== "כללי") ?? p.categories[0])?.name ?? "",
  }));

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <Image src="/hero-tami.webp" alt="" fill priority sizes="100vw" className="hero__bg" />
        <div className="hero__inner">
          <div className="hero__content">
            <span className="kicker">מסננים לתמי 4 וברי מים · כפר סבא</span>
            <h1 id="hero-title" className="hero__title">
              {["לשתות נקי", "זה לשתות בריא!"].map((line, l) => (
                <span key={l} className="hero__line">
                  {line.split(" ").map((w, i) => (
                    <span key={i}>
                      {i > 0 && " "}
                      <span className="hero__word" style={{ animationDelay: `${(l * 2 + i) * 130}ms` }}>{w}</span>
                    </span>
                  ))}
                </span>
              ))}
            </h1>
            <p className="lead">מים צלולים מהבר שלכם — עם המסנן הנכון, וטכנאי שמגיע עד הבית.</p>
            <form action={`${BASE_PATH}/shop/`} role="search" className="hero-search glass">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
              <input type="search" name="q" placeholder="חפשו מסנן, דגם או חלק…" aria-label="חיפוש מוצרים" />
              <button type="submit" className="btn btn-primary">חיפוש</button>
            </form>
            <HeroCarousel products={heroProducts} />
          </div>
        </div>
      </section>

      <div className="container page" style={{ gap: 72 }}>
        <section aria-labelledby="systems" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <h2 id="systems" className="h2">מידע מקיף על כל המערכות לטיהור ולהשבחת מי שתיה</h2>
          <ul className="systems">
            {SYSTEMS.map((s) => {
              const img = imageFor(products, s.from ?? s.href);
              return (
                <li key={s.href}>
                  <Link href={s.href} className="glass system-card">
                    <span className="system-card__img glow">{img && <Image src={img} alt="" fill sizes="120px" />}</span>
                    <span className="system-card__title">{s.title}</span>
                    <span className="system-card__more" aria-hidden="true">קראו עוד ←</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <WaterStory
        products={STORY_PRODUCT_IDS.map((id) => {
          const p = products.find((x) => x.id === id && x.inStock);
          return p ? { id: p.id, name: p.name, path: p.path, price: p.price, image: p.images[0]?.src ?? null, inStock: p.inStock } : null;
        })}
      />

      <div className="container page" style={{ gap: 72 }}>
        <section aria-labelledby="best" data-snap="הנמכרים ביותר" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="store-head">
            <h2 id="best" className="h2">הנמכרים ביותר</h2>
            <Link href="/shop/" style={{ font: "600 1rem/1 var(--font-ui)", color: "var(--brand)" }}>לכל החנות ←</Link>
          </div>
          <ProductGrid products={bestsellers} label="הנמכרים ביותר" />
        </section>

        <section className="dark-band tech-band" aria-labelledby="tech">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="kicker" style={{ color: "#9fd3f5" }}>טכנאי תמי 4 פרטי · 30 שנות ניסיון</span>
            <h2 id="tech" className="h2" style={{ color: "#fff" }}>התמי 4 לא עובד?</h2>
            <p style={{ margin: 0, font: "400 1.0625rem/1.6 var(--font-ui)", color: "var(--on-dark-muted)" }}>תיקון מהיר ויסודי, חלפים מקוריים וחדשים, ו־100% אחריות על העבודה.</p>
            <p style={{ margin: 0, font: "400 0.875rem/1.5 var(--font-ui)", color: "var(--on-dark-muted)" }}>* לא חברת תמי 4 — שירות תיקונים פרטי</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ font: "600 0.9375rem/1 var(--font-ui)", color: "var(--on-dark-muted)" }}>תקלות נפוצות:</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FAULTS.map((f) => <Link key={f.label} href={f.href} className="btn btn-outline-light" style={{ minHeight: 44, fontSize: "0.9375rem" }}>{f.label}</Link>)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link href="/טכנאי-תמי-4/" className="btn btn-white">הזמנת טכנאי תמי 4 ←</Link>
              <a href={SITE.phoneHref} className="btn btn-outline-light"><span dir="ltr">{SITE.phone}</span></a>
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-title" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}>
          <h2 id="faq-title" className="h2">מה כדאי לדעת.</h2>
          <div className="glass faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary><h3 style={{ margin: 0, font: "inherit" }}>{f.q}</h3></summary>
                <p className="answer">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="dark-band" aria-labelledby="last">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 id="last" className="h2" style={{ color: "#fff" }}>מתי החלפתם מסנן לאחרונה?</h2>
            <p style={{ margin: 0, font: "400 1rem/1.55 var(--font-ui)", color: "var(--on-dark-muted)" }}>מסננים לתמי 4, אוסמוזה הפוכה ומסנני אבנית — עם טכנאי עד הבית.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifySelf: "end" }}>
            <Link href="/טכנאי-תמי-4/" className="btn btn-white">הזמנת טכנאי</Link>
            <a href={SITE.phone2Href} className="btn btn-outline-light"><span dir="ltr">{SITE.phone2}</span></a>
          </div>
        </section>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: "myWater", url: SITE.url, potentialAction: { "@type": "SearchAction", target: `${SITE.url}/shop/?q={search_term_string}`, "query-input": "required name=search_term_string" } }} />
    </>
  );
}
