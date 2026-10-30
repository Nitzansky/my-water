"use client";

import { useEffect, useRef } from "react";
import { SITE } from "@/lib/site";

// The business's Google reviews through the live site's Elfsight widget. Its script (third-party) loads
// only when the section comes near the viewport, so it costs nothing on first load. The widget slot collapses
// while empty (Elfsight answers WIDGET_NOT_FOUND for the current id — it needs renewing), and the link card
// to the Google reviews is always there.
export function Reviews() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      if (document.querySelector('script[src="https://elfsightcdn.com/platform.js"]')) return;
      const s = document.createElement("script");
      s.src = "https://elfsightcdn.com/platform.js";
      s.async = true;
      document.body.appendChild(s);
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} id="reviews" className="reviews" aria-labelledby="reviews-title">
      <div className="store-head">
        <h2 id="reviews-title" className="h2">הלקוחות המרוצים שלנו מספרים</h2>
        <a href={SITE.googleBusiness} target="_blank" rel="noopener" className="reviews__all">
          לכל הביקורות בגוגל ←<span className="sr-only"> (נפתח בחלון חדש)</span>
        </a>
      </div>
      <div className="reviews__widget">
        <div className={SITE.reviewsWidget} data-elfsight-app-lazy />
      </div>
      <a href={SITE.googleBusiness} target="_blank" rel="noopener" className="glass reviews__card">
        <span className="reviews__g" aria-hidden="true">G</span>
        <span className="reviews__text">
          <strong>הביקורות שלנו בגוגל</strong>
          <span>קראו מה הלקוחות כותבים עלינו — ושתפו גם אתם</span>
        </span>
        <span className="reviews__arrow" aria-hidden="true">←</span>
        <span className="sr-only"> (נפתח בחלון חדש)</span>
      </a>
    </section>
  );
}
