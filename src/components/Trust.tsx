import { SITE, TRUST } from "@/lib/site";

const Check = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

// A row of trust points; the last one links to the Google reviews (on the home page, the reviews section).
export function TrustStrip({ reviewsHref = SITE.googleBusiness, compact, items = TRUST }: { reviewsHref?: string; compact?: boolean; items?: string[] }) {
  const external = reviewsHref.startsWith("http");
  return (
    <ul className={`trust ${compact ? "trust--compact" : ""}`} aria-label="למה myWater">
      {items.map((t) => <li key={t}><Check />{t}</li>)}
      <li>
        <a href={reviewsHref} {...(external ? { target: "_blank", rel: "noopener" } : {})}>
          <span className="trust__star" aria-hidden="true">★</span>הביקורות שלנו בגוגל
          {external && <span className="sr-only"> (נפתח בחלון חדש)</span>}
        </a>
      </li>
    </ul>
  );
}
