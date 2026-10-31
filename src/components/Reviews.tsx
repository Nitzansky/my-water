"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";

// The business's Google rating and reviews, live from the Places API (New). Google's terms don't allow storing
// reviews, so they're fetched in the browser when the section comes near the viewport (nothing on first load).
// The key is a browser key restricted to this site's domains and to the Places API.
// Without a key/Place ID, or if the request fails, only the link card to the Google reviews shows.
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const PLACE_ID = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID;

type Review = {
  rating: number;
  text?: { text: string };
  originalText?: { text: string };
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
};
type Place = { rating?: number; userRatingCount?: number; googleMapsUri?: string; reviews?: Review[] };

const writeReviewUrl = PLACE_ID ? `https://search.google.com/local/writereview?placeid=${PLACE_ID}` : null;

function Stars({ value, size = "1rem" }: { value: number; size?: string }) {
  return (
    <span className="stars" style={{ fontSize: size, ["--fill" as string]: `${(value / 5) * 100}%` }} role="img" aria-label={`${value.toLocaleString("he-IL")} מתוך 5 כוכבים`}>
      ★★★★★
    </span>
  );
}

export function Reviews() {
  const ref = useRef<HTMLElement>(null);
  const [place, setPlace] = useState<Place | null>(null);

  useEffect(() => {
    if (!KEY || !PLACE_ID) return;
    const el = ref.current!;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=he`, {
        headers: { "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews" },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((p: Place | null) => p && setPlace(p))
        .catch(() => {});
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const mapsUrl = place?.googleMapsUri ?? SITE.googleBusiness;
  const reviews = (place?.reviews ?? []).filter((r) => (r.originalText ?? r.text)?.text);

  return (
    <section ref={ref} id="reviews" className="reviews" aria-labelledby="reviews-title">
      <div className="store-head">
        <h2 id="reviews-title" className="h2">הלקוחות המרוצים שלנו מספרים</h2>
        <a href={mapsUrl} target="_blank" rel="noopener" className="reviews__all">
          לכל הביקורות בגוגל ←<span className="sr-only"> (נפתח בחלון חדש)</span>
        </a>
      </div>

      {place?.rating ? (
        <div className="reviews__summary">
          <span className="reviews__score">{place.rating.toLocaleString("he-IL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
          <span className="reviews__summary-meta">
            <Stars value={place.rating} size="1.25rem" />
            <span>{place.userRatingCount?.toLocaleString("he-IL")} ביקורות בגוגל</span>
          </span>
          {writeReviewUrl && (
            <a href={writeReviewUrl} target="_blank" rel="noopener" className="btn reviews__write">
              כתבו לנו ביקורת<span className="sr-only"> (נפתח בחלון חדש)</span>
            </a>
          )}
        </div>
      ) : null}

      {reviews.length > 0 && (
        <ul className="reviews__list">
          {reviews.map((r, i) => {
            const a = r.authorAttribution ?? {};
            return (
              <li key={i} className="glass reviews__item">
                <div className="reviews__author">
                  {a.photoUri ? <img src={a.photoUri} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" /> : <span className="reviews__avatar" aria-hidden="true">{a.displayName?.[0]}</span>}
                  <span>
                    {a.uri ? <a href={a.uri} target="_blank" rel="noopener">{a.displayName}</a> : <strong>{a.displayName}</strong>}
                    <span className="reviews__when">{r.relativePublishTimeDescription}</span>
                  </span>
                </div>
                <Stars value={r.rating} />
                <p className="reviews__body">{(r.originalText ?? r.text)!.text}</p>
              </li>
            );
          })}
        </ul>
      )}

      {reviews.length > 0 ? (
        <p className="reviews__credit">ביקורות מ-Google</p>
      ) : (
        <a href={mapsUrl} target="_blank" rel="noopener" className="glass reviews__card">
          <span className="reviews__g" aria-hidden="true">G</span>
          <span className="reviews__text">
            <strong>הביקורות שלנו בגוגל</strong>
            <span>קראו מה הלקוחות כותבים עלינו — ושתפו גם אתם</span>
          </span>
          <span className="reviews__arrow" aria-hidden="true">←</span>
          <span className="sr-only"> (נפתח בחלון חדש)</span>
        </a>
      )}
    </section>
  );
}
