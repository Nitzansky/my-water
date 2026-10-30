import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { getCategories, getPages, getPosts } from "@/lib/wp";

export const metadata: Metadata = { title: "מפת האתר", alternates: { canonical: "/site-map/" } };

const HIDDEN = /^\/(my-account|החשבון-שלי|lost-password|view-order|edit-address|change-password|logout|pay|order-received|cart|checkout|דף-תודה|cart-2|checkout-2|lost-password-2|404-page|portfolio|shop)\//;

export default async function SiteMapPage() {
  const [categories, pages, posts] = await Promise.all([getCategories(), getPages(), getPosts()]);
  const groups = [
    { title: "עמודים", links: [{ label: "דף הבית", href: "/" }, { label: "חנות", href: "/shop/" }, ...pages.filter((p) => p.path !== "/" && !HIDDEN.test(p.path)).map((p) => ({ label: p.title, href: p.path }))] },
    { title: "קטגוריות מוצרים", links: categories.filter((c) => c.count > 0).map((c) => ({ label: c.name, href: c.path })) },
    { title: "מאמרים", links: posts.map((p) => ({ label: p.title, href: p.path })) },
  ];
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "מפת האתר" }]} />
      <h1 className="h1">מפת האתר</h1>
      <div className="sitemap-grid">
        {groups.map((g) => (
          <section key={g.title} className="glass panel" aria-labelledby={g.title}>
            <h2 id={g.title} className="h2" style={{ fontSize: "1.875rem" }}>{g.title}</h2>
            <ul className="sitemap-list">{g.links.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
          </section>
        ))}
      </div>
    </div>
  );
}
