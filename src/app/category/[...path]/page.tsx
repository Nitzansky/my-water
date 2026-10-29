import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { archiveMetadata, PostArchive } from "@/components/PostArchive";
import { decode, getPostTerms } from "@/lib/wp";

type Props = { params: Promise<{ path: string[] }> };

const findTerm = async (path: string[]) => {
  const p = `/category/${path.map(decode).join("/")}/`;
  return (await getPostTerms("categories")).find((t) => t.path === p);
};

export async function generateStaticParams() {
  return (await getPostTerms("categories")).map((t) => ({ path: t.path.replace(/^\/category\/|\/$/g, "").split("/") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const term = await findTerm((await params).path);
  return term ? archiveMetadata(term, "קטגוריה") : {};
}

export default async function CategoryArchive({ params }: Props) {
  const term = await findTerm((await params).path);
  if (!term) notFound();
  // include sub-categories, like WordPress does
  const all = await getPostTerms("categories");
  const ids = new Set([term.id, ...all.filter((t) => t.parent === term.id).map((t) => t.id)]);
  return <PostArchive term={term} kind="קטגוריה" ids={(p) => p.categories.some((c) => ids.has(c))} />;
}
