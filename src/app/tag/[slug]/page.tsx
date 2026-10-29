import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { archiveMetadata, PostArchive } from "@/components/PostArchive";
import { decode, getPostTerms } from "@/lib/wp";

type Props = { params: Promise<{ slug: string }> };

const findTerm = async (slug: string) => (await getPostTerms("tags")).find((t) => t.slug === decode(slug));

export async function generateStaticParams() {
  return (await getPostTerms("tags")).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const term = await findTerm((await params).slug);
  return term ? archiveMetadata(term, "תגית") : {};
}

export default async function TagArchive({ params }: Props) {
  const term = await findTerm((await params).slug);
  if (!term) notFound();
  return <PostArchive term={term} kind="תגית" ids={(p) => p.tags.includes(term.id)} />;
}
