import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { getCategories, getPages, getPosts, getPostTerms, getProducts } from "@/lib/wp";

export const dynamic = "force-static";

const NOINDEX = /^\/(my-account|החשבון-שלי|lost-password|view-order|edit-address|change-password|logout|pay|order-received|wishlist|cart|checkout|דף-תודה|cart-2|checkout-2|lost-password-2|404-page)\//;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, pages, posts, postCats, postTags] = await Promise.all([
    getProducts(), getCategories(), getPages(), getPosts(), getPostTerms("categories"), getPostTerms("tags"),
  ]);
  const url = (p: string) => new URL(encodeURI(p), SITE.url).href;
  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/shop/"), changeFrequency: "daily", priority: 0.9 },
    ...categories.filter((c) => c.count > 0).map((c) => ({ url: url(c.path), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: url(p.path), changeFrequency: "weekly" as const, priority: 0.7, images: p.images.map((i) => url(i.white ?? i.src)) })),
    ...pages.filter((p) => p.path !== "/" && !NOINDEX.test(p.path)).map((p) => ({ url: url(p.path), lastModified: p.modified, priority: 0.6 })),
    ...posts.map((p) => ({ url: url(p.path), lastModified: p.modified, priority: 0.5 })),
    ...[...postCats, ...postTags].filter((t) => t.count > 0 && t.seo?.robots?.index !== "noindex").map((t) => ({ url: url(t.path), priority: 0.3 })),
  ];
}
