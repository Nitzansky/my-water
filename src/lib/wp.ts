// Read-only access to the WordPress / WooCommerce back office through its public REST APIs.
import "server-only";
import images from "@/data/images.json";

const WP = process.env.WP_URL ?? "https://my-water.co.il";
const REVALIDATE = 3600;

export type ImageRef = { src: string; white: string | null; alt: string; width: number; height: number; enhanced: boolean };
export type Term = { id: number; name: string; slug: string; path: string };
export type Product = {
  id: number;
  name: string;
  slug: string;
  path: string;
  sku: string;
  description: string;
  shortDescription: string;
  price: number;
  regularPrice: number;
  onSale: boolean;
  inStock: boolean;
  images: ImageRef[];
  categories: Term[];
  tags: Term[];
  attributes: { name: string; terms: string[] }[];
};
export type Category = Term & { parent: number; count: number; description: string; image: string | null };
export type Entry = {
  id: number;
  type: "page" | "post";
  path: string;
  title: string;
  content: string;
  excerpt: string;
  date: string;
  modified: string;
  featuredImage: string | null;
  categories: number[];
  tags: number[];
  seo: { title?: string; description?: string; ogImage?: string; robots?: { index?: string } } | null;
};

const imageMap = images as Record<string, { cutout: string; white: string; width: number; height: number }>;

export const decode = (s: string) => {
  try {
    return decodeURIComponent(s).normalize("NFC");
  } catch {
    return s.normalize("NFC");
  }
};
const pathOf = (url: string) => decode(url.replace(/^https?:\/\/(www\.)?my-water\.co\.il/, "")) || "/";
const entities = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ");

async function get<T>(endpoint: string): Promise<{ data: T; totalPages: number }> {
  const res = await fetch(`${WP}${endpoint}`, { next: { revalidate: REVALIDATE }, headers: { "User-Agent": "myWater-frontend" } });
  if (!res.ok) throw new Error(`WordPress ${res.status} for ${endpoint}`);
  return { data: (await res.json()) as T, totalPages: Number(res.headers.get("x-wp-totalpages") ?? 1) };
}

async function getAll<T>(endpoint: string): Promise<T[]> {
  const sep = endpoint.includes("?") ? "&" : "?";
  const first = await get<T[]>(`${endpoint}${sep}per_page=100&page=1`);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => get<T[]>(`${endpoint}${sep}per_page=100&page=${i + 2}`)),
  );
  return [first.data, ...rest.map((r) => r.data)].flat();
}

// ---- products -----------------------------------------------------------------------------
type StoreImage = { src: string; alt: string; name: string };
type StoreTerm = { id: number; name: string; slug: string; link: string };
type StoreProduct = {
  id: number; name: string; slug: string; permalink: string; sku: string; description: string; short_description: string;
  on_sale: boolean; is_in_stock: boolean; images: StoreImage[]; categories: StoreTerm[]; tags: StoreTerm[];
  prices: { price: string; regular_price: string; currency_minor_unit: number };
  attributes: { name: string; terms: { name: string }[] }[];
};

function toImage(img: StoreImage, fallbackAlt: string): ImageRef {
  const hit = imageMap[decode(img.src)];
  return hit
    ? { src: hit.cutout, white: hit.white, alt: img.alt || fallbackAlt, width: hit.width, height: hit.height, enhanced: true }
    : { src: img.src, white: null, alt: img.alt || fallbackAlt, width: 1000, height: 1000, enhanced: false };
}

const toTerm = (t: StoreTerm): Term => ({ id: t.id, name: entities(t.name), slug: decode(t.slug), path: pathOf(t.link) });

function toProduct(p: StoreProduct): Product {
  const unit = 10 ** p.prices.currency_minor_unit;
  const name = entities(p.name);
  return {
    id: p.id,
    name,
    slug: decode(p.slug),
    path: pathOf(p.permalink),
    sku: p.sku,
    description: p.description,
    shortDescription: p.short_description,
    price: Number(p.prices.price) / unit,
    regularPrice: Number(p.prices.regular_price) / unit,
    onSale: p.on_sale,
    inStock: p.is_in_stock,
    images: p.images.map((i) => toImage(i, name)),
    categories: p.categories.map(toTerm),
    tags: p.tags.map(toTerm),
    attributes: p.attributes.map((a) => ({ name: entities(a.name), terms: a.terms.map((t) => entities(t.name)) })),
  };
}

export async function getProducts(): Promise<Product[]> {
  const products = (await getAll<StoreProduct>("/wp-json/wc/store/v1/products?orderby=menu_order&order=asc")).map(toProduct);
  // A product saved without a name in WordPress falls back to its Yoast SEO title.
  const unnamed = products.filter((p) => !p.name.trim());
  if (unnamed.length) {
    const seo = await getAll<{ slug: string; yoast_head_json?: { title?: string } }>("/wp-json/wp/v2/product?_fields=slug,yoast_head_json");
    for (const p of unnamed) {
      const title = seo.find((s) => decode(s.slug) === p.slug)?.yoast_head_json?.title;
      p.name = title ? entities(title.split(" | ")[0].split(" - ")[0]).trim() : `מוצר ${p.id}`;
      p.images = p.images.map((i) => ({ ...i, alt: i.alt || p.name }));
    }
  }
  return products;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  const s = decode(slug);
  return (await getProducts()).find((p) => p.slug === s);
}

// ---- categories ---------------------------------------------------------------------------
type StoreCategory = { id: number; name: string; slug: string; parent: number; count: number; description: string; permalink: string; image: { src: string } | null };

export async function getCategories(): Promise<Category[]> {
  const cats = await getAll<StoreCategory>("/wp-json/wc/store/v1/products/categories");
  return cats.map((c) => ({
    id: c.id, name: entities(c.name), slug: decode(c.slug), path: pathOf(c.permalink), parent: c.parent, count: c.count,
    description: c.description, image: c.image?.src ?? null,
  }));
}

export async function getCategoryByPath(path: string): Promise<Category | undefined> {
  const p = decode(path);
  return (await getCategories()).find((c) => c.path === p);
}

export async function getProductsInCategory(cat: Category): Promise<Product[]> {
  const all = await getCategories();
  const ids = new Set([cat.id]);
  // include sub-categories, like WooCommerce does
  for (let grew = true; grew; ) {
    grew = false;
    for (const c of all) if (ids.has(c.parent) && !ids.has(c.id)) { ids.add(c.id); grew = true; }
  }
  return (await getProducts()).filter((p) => p.categories.some((c) => ids.has(c.id)));
}

// ---- pages & posts ------------------------------------------------------------------------
type WpEntry = {
  id: number; type: string; link: string; date: string; modified: string; title: { rendered: string };
  content: { rendered: string }; excerpt: { rendered: string }; featured_media: number; categories?: number[]; tags?: number[];
  yoast_head_json?: { title?: string; description?: string; og_image?: { url: string }[]; robots?: { index?: string } };
  _embedded?: { "wp:featuredmedia"?: { source_url: string }[] };
};

const FIELDS = "id,type,link,date,modified,title,content,excerpt,featured_media,categories,tags,yoast_head_json,_links,_embedded";

function toEntry(e: WpEntry): Entry {
  return {
    id: e.id,
    type: e.type === "post" ? "post" : "page",
    path: pathOf(e.link),
    title: entities(e.title.rendered),
    content: e.content.rendered,
    excerpt: e.excerpt?.rendered ?? "",
    date: e.date,
    modified: e.modified,
    featuredImage: e._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null,
    categories: e.categories ?? [],
    tags: e.tags ?? [],
    seo: e.yoast_head_json
      ? { title: e.yoast_head_json.title, description: e.yoast_head_json.description, ogImage: e.yoast_head_json.og_image?.[0]?.url, robots: e.yoast_head_json.robots }
      : null,
  };
}

export async function getPages(): Promise<Entry[]> {
  return (await getAll<WpEntry>(`/wp-json/wp/v2/pages?_embed=wp:featuredmedia&_fields=${FIELDS}`)).map(toEntry);
}

export async function getPosts(): Promise<Entry[]> {
  return (await getAll<WpEntry>(`/wp-json/wp/v2/posts?_embed=wp:featuredmedia&_fields=${FIELDS}`)).map(toEntry);
}

export async function getEntryByPath(path: string): Promise<Entry | undefined> {
  const p = decode(path);
  const [pages, posts] = await Promise.all([getPages(), getPosts()]);
  return [...pages, ...posts].find((e) => e.path === p);
}

// Post categories and tags (/category/…, /tag/…).
export type PostTerm = Term & { parent: number; count: number; description: string; seo: Entry["seo"] };
type WpTerm = { id: number; name: string; slug: string; link: string; parent?: number; count: number; description: string; yoast_head_json?: WpEntry["yoast_head_json"] };

export async function getPostTerms(taxonomy: "categories" | "tags"): Promise<PostTerm[]> {
  const terms = await getAll<WpTerm>(`/wp-json/wp/v2/${taxonomy}?_fields=id,name,slug,link,parent,count,description,yoast_head_json`);
  return terms.map((t) => ({
    id: t.id, name: entities(t.name), slug: decode(t.slug), path: pathOf(t.link), parent: t.parent ?? 0, count: t.count, description: t.description,
    seo: t.yoast_head_json ? { title: t.yoast_head_json.title, description: t.yoast_head_json.description, robots: t.yoast_head_json.robots } : null,
  }));
}

// Yoast SEO fields for products (titles, robots, og image) — keeps the existing Google titles.
export async function getProductSeo(slug: string): Promise<Entry["seo"]> {
  const all = await getAll<{ slug: string; yoast_head_json?: WpEntry["yoast_head_json"] }>("/wp-json/wp/v2/product?_fields=slug,yoast_head_json");
  const y = all.find((p) => decode(p.slug) === decode(slug))?.yoast_head_json;
  return y ? { title: y.title, description: y.description, ogImage: y.og_image?.[0]?.url, robots: y.robots } : null;
}

export async function getBestsellers(limit = 8): Promise<Product[]> {
  const { data } = await get<StoreProduct[]>(`/wp-json/wc/store/v1/products?orderby=popularity&order=desc&per_page=${limit}`);
  return data.map(toProduct).filter((p) => p.inStock);
}
