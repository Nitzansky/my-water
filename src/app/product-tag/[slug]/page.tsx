import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, CtaBand, ProductGrid } from "@/components/ui";
import { decode, getProducts } from "@/lib/wp";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const s = decode(slug);
  const products = (await getProducts()).filter((p) => p.tags.some((t) => t.slug === s));
  const tag = products[0]?.tags.find((t) => t.slug === s);
  return { tag, products };
}

export async function generateStaticParams() {
  const slugs = new Set((await getProducts()).flatMap((p) => p.tags.map((t) => t.slug)));
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await load((await params).slug);
  return tag ? { title: tag.name, alternates: { canonical: tag.path } } : {};
}

export default async function TagPage({ params }: Props) {
  const { tag, products } = await load((await params).slug);
  if (!tag) notFound();
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "המוצרים שלנו", href: "/shop/" }, { label: tag.name }]} />
      <h1 className="h1-sm">{tag.name}</h1>
      <ProductGrid products={products} label={tag.name} />
      <CtaBand />
    </div>
  );
}
