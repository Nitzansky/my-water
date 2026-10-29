import Image from "next/image";
import Link from "next/link";
import { plainText } from "@/lib/content";
import type { Entry } from "@/lib/wp";

export function ArticleList({ posts }: { posts: Entry[] }) {
  return (
    <ul className="article-grid">
      {posts.map((p) => (
        <li key={p.id}>
          <Link href={p.path} className="glass article-card">
            {p.featuredImage && <Image src={p.featuredImage} alt="" width={640} height={360} sizes="(max-width: 700px) 92vw, 380px" />}
            <span className="kicker"><time dateTime={p.date}>{new Date(p.date).toLocaleDateString("he-IL", { year: "numeric", month: "long" })}</time></span>
            <h2 className="article-card__title">{p.title}</h2>
            <p className="article-card__excerpt">{plainText(p.excerpt).replace(/\[&hellip;\]|\[…\]/, "…").slice(0, 160)}</p>
            <span className="article-card__more" aria-hidden="true">לקריאה ←</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
