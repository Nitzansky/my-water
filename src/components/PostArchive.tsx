import type { Metadata } from "next";
import { ArticleList } from "./ArticleList";
import { Breadcrumbs, CtaBand, JsonLd } from "./ui";
import { cleanHtml, plainText } from "@/lib/content";
import { SITE } from "@/lib/site";
import { getPosts, type PostTerm } from "@/lib/wp";

export function archiveMetadata(term: PostTerm, kind: string): Metadata {
  return {
    title: { absolute: term.seo?.title?.replace(/ - My Water$/, " | myWater") ?? `${kind}: ${term.name} | myWater` },
    description: term.seo?.description || plainText(term.description).slice(0, 155) || `מאמרים בנושא ${term.name}.`,
    alternates: { canonical: term.path },
    robots: term.seo?.robots?.index === "noindex" ? { index: false } : undefined,
  };
}

// Article archive for a post category or tag.
export async function PostArchive({ term, kind, ids }: { term: PostTerm; kind: string; ids: (p: { categories: number[]; tags: number[] }) => boolean }) {
  const posts = (await getPosts()).filter(ids);
  const description = cleanHtml(term.description);
  return (
    <div className="container page">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Breadcrumbs items={[{ label: "מאמרים", href: "/מאמרים/" }, { label: term.name }]} />
        <span className="kicker">{kind}</span>
        <h1 className="h1">{term.name}</h1>
        {description ? <div className="prose lead" dangerouslySetInnerHTML={{ __html: description }} /> : <p className="lead">{posts.length} מאמרים</p>}
      </div>
      {posts.length > 0 ? <ArticleList posts={posts} /> : <p className="lead">אין עדיין מאמרים בנושא זה.</p>}
      <CtaBand />
      <JsonLd
        data={{
          "@context": "https://schema.org", "@type": "CollectionPage", name: term.name, url: new URL(term.path, SITE.url).href,
          mainEntity: { "@type": "ItemList", itemListElement: posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: new URL(p.path, SITE.url).href, name: p.title })) },
        }}
      />
    </div>
  );
}
