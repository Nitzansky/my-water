// Sub-path the site is served under (only set for the GitHub Pages preview).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const SITE = {
  name: "myWater",
  tagline: "טיפה יותר",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://my-water.co.il",
  phone: "050-4032033",
  phoneHref: "tel:0504032033",
  phone2: "077-5232213",
  phone2Href: "tel:0775232213",
  whatsapp: "https://wa.me/972504032033",
  email: "watermiki@gmail.com",
  address: "דובה ויצחק שיינפיין 16, כפר סבא",
  street: "דובה ויצחק שיינפיין 16",
  city: "כפר סבא",
  geo: { lat: 32.1711322, lng: 34.9070395 },
  googleBusiness: "https://www.google.com/maps/place/My+Water/@32.1711322,34.9070395,17z",
  // The live site's Google Reviews widget (Elfsight) — the business's real Google reviews.
  reviewsWidget: "elfsight-app-e2b28c02-cf7b-4354-8db3-8f0d7900b23a",
  legalNote: "myWater היא חברת שירות פרטית ואינה קשורה לחברת תמי 4.",
};

export type NavLink = { label: string; href: string };

// Labels follow the design; every href is the live site's existing URL.
export const PRODUCT_MENU: NavLink[] = [
  { label: "תמי 4", href: "/product-category/filter-for-tami-4/" },
  { label: "מסנן אבנית", href: "/product-category/מסנן-אבנית/" },
  { label: "מיני בר", href: "/product-category/מיני-בר-מים-לבית/" },
  { label: "בר מים לעסק", href: "/product-category/bussinesswaterbar/" },
  { label: "מערכות מים תת כיור", href: "/product-category/מסננים-ופילטרים-להחלפה/" },
  { label: "מערכת אוסמוזה הפוכה", href: "/product-category/אוסמוזה-הפוכה/" },
  { label: "מוצרי מים למוסדות", href: "/product-category/מוצרי-מים-למוסדות/" },
  { label: "כל סוגי המסננים", href: "/product-category/filters/" },
  { label: "מסננים למקררים", href: "/product-category/מסננים-למקררים/" },
];

export const TAMI_FILTERS_MENU: NavLink[] = [
  { label: "מסנן לתמי 4 Primo", href: "/product-category/filter-for-tami-4/מסנן-לתמי-4-primo/" },
  { label: "מסנן לתמי 4 Family", href: "/product-category/filter-for-tami-4/מסנן-לתמי-family/" },
  { label: "פילטר לתמי 4 Edge", href: "/product-category/filter-for-tami-4/filter-for-tami-4-edge/" },
  { label: "תמי 4 בייסיק", href: "/product-category/filter-for-tami-4/תמי-4-בייסק/" },
  { label: "מסננים תואמים לתמי 4", href: "/product-category/filter-for-tami-4/similar-filter-for-tami-4/" },
  { label: "תת כיור לתמי 4", href: "/product-category/filter-for-tami-4/תת-כיור-לתמי-4/" },
  { label: "מעקף לתמי 4", href: "/product-category/filter-for-tami-4/bypass-to-tammy-4/" },
];

export const TAMI_SERVICE_MENU: NavLink[] = [
  { label: "טכנאי תמי 4", href: "/טכנאי-תמי-4/" },
  { label: "תקלות תמי 4", href: "/תקלות-תמי-4/" },
  { label: "חלפים לתמי 4", href: "/product-category/חלפים-לתמי-4/" },
  { label: "קפסולה לניקוי תמי 4", href: "/product-category/קפסולה-לניקוי-תמי-4/" },
];

export const TOP_LINKS: NavLink[] = [
  { label: "מיני בר", href: "/מיני-בר-לבית/" },
  { label: "מאמרים", href: "/מאמרים/" },
  { label: "אודות", href: "/about/" },
  { label: "שירות לקוחות", href: "/contact/" },
];

export const FOOTER_LINKS: NavLink[] = [
  { label: "הצהרת נגישות", href: "/accessibility/" },
  { label: "תקנון האתר", href: "/תקנון-האתר/" },
  { label: "מפת האתר", href: "/site-map/" },
];

// Short trust points, from the site's own wording (technician band, shop intro).
export const TRUST = ["30 שנות ניסיון", "100% אחריות על העבודה", "טכנאי עד הבית", "משלוח עד הבית"];
