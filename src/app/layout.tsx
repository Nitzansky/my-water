import type { Metadata, Viewport } from "next";
import { Assistant, Frank_Ruhl_Libre } from "next/font/google";
import { A11Y_BOOT, AccessibilityMenu } from "@/components/AccessibilityMenu";
import { CartProvider } from "@/components/cart";
import { Header } from "@/components/Header";
import { Footer, JsonLd, WhatsAppFab } from "@/components/ui";
import { SITE } from "@/lib/site";
import { getProducts } from "@/lib/wp";
import "./globals.css";
import "./ui.css";

const frank = Frank_Ruhl_Libre({ subsets: ["hebrew", "latin"], weight: ["300", "400"], variable: "--font-frank", display: "swap" });
const assistant = Assistant({ subsets: ["hebrew", "latin"], weight: ["400", "600", "700"], variable: "--font-assistant", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "myWater — מסננים לתמי 4, ברי מים וטכנאי עד הבית | כפר סבא", template: "%s | myWater" },
  description: "מסננים לתמי 4, ברי מים, מערכות אוסמוזה הפוכה ומסנני אבנית — במשלוח עד הבית או עם טכנאי שמגיע ומתקין. כפר סבא.",
  openGraph: { locale: "he_IL", siteName: "myWater", type: "website" },
  // Only production is indexed; previews (and the GitHub Pages copy) are noindex.
  robots: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true" ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0068b3", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const products = await getProducts();
  const searchIndex = products.map((p) => ({ name: p.name, path: p.path, image: p.images[0]?.src ?? null }));

  return (
    // suppressHydrationWarning: A11Y_BOOT sets the visitor's saved text size/modes on <html> before hydration,
    // and browser extensions (e.g. ColorZilla) add attributes to <body>.
    <html lang="he" dir="rtl" className={`${frank.variable} ${assistant.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT }} />
      </head>
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">דילוג לתוכן הראשי</a>
        <div className="site-bg" aria-hidden="true" />
        <CartProvider>
          <Header searchIndex={searchIndex} />
          <main id="main" tabIndex={-1}>{children}</main>
          <Footer />
          <WhatsAppFab />
          <AccessibilityMenu />
        </CartProvider>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": ["LocalBusiness", "Store"],
            "@id": `${SITE.url}/#business`,
            name: "myWater",
            url: SITE.url,
            logo: `${SITE.url}/mywater-logo.png`,
            image: `${SITE.url}/hero-tami.webp`,
            telephone: "+972-50-4032033",
            email: SITE.email,
            address: { "@type": "PostalAddress", streetAddress: SITE.street, addressLocality: SITE.city, addressCountry: "IL" },
            geo: { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng },
            areaServed: "IL",
            priceRange: "₪₪",
            sameAs: [SITE.googleBusiness],
          }}
        />
      </body>
    </html>
  );
}
