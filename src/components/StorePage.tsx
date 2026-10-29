import Link from "next/link";
import { Suspense } from "react";
import { StoreBrowser } from "./StoreBrowser";
import { Breadcrumbs, CtaBand, ProductGrid } from "./ui";
import { PRODUCT_MENU } from "@/lib/site";
import { getCategories, getProducts } from "@/lib/wp";

export async function StorePage({ title = "המוצרים שלנו", crumb = "המוצרים שלנו" }: { title?: string; crumb?: string }) {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  // descriptions are not shown in the grid; keep the client payload small
  const light = products.map((p) => ({ ...p, description: "", shortDescription: "" }));

  return (
    <div className="container page">
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <Breadcrumbs items={[{ label: crumb }]} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 className="h1">{title}</h1>
          <p className="lead">מסננים, ברי מים, מערכות טיהור וחלפים — במשלוח עד הבית, או עם טכנאי שמגיע ומתקין.</p>
        </div>
      </div>

      <Suspense fallback={<ProductGrid products={light} />}>
        <StoreBrowser products={light} chips={PRODUCT_MENU} />
      </Suspense>

      <section aria-labelledby="all-cats" className="all-cats">
        <h2 id="all-cats" className="kicker" style={{ margin: 0 }}>כל הקטגוריות באתר</h2>
        <ul>
          {categories.filter((c) => c.count > 0).map((c) => (
            <li key={c.id}><Link href={c.path}>{c.name}<span>{c.count}</span></Link></li>
          ))}
        </ul>
      </section>

      <CtaBand />
    </div>
  );
}
