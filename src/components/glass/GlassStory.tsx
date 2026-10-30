"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "../ui";
import type { GlassScene } from "./scene";

export type StageProduct = { name: string; path: string; price: number; image: string | null; inStock: boolean };
type Stage = { title: string; text: string; label: string; fallback: { name: string; path: string }; product: StageProduct | null };

// Copy from the design handoff ("Scroll B5 - Hero") — awaiting client approval, like the home FAQ.
export const STAGES: Omit<Stage, "product">[] = [
  { title: "משקעים", text: "חול, חלודה וחלקיקים מהצנרת — המסנן עוצר אותם ראשונים.", label: "עוצר משקעים", fallback: { name: "מסנן מקורי לתמי 4", path: "/product-category/filter-for-tami-4/" } },
  { title: "טעם וריח", text: "כלור ותרכובות שמשפיעות על הטעם נעצרים בשלב הבא.", label: "לטעם נקי", fallback: { name: "מסנן תואם לתמי 4", path: "/product-category/filter-for-tami-4/" } },
  { title: "צלול.", text: "מים שקופים וטעימים — כמו שהם צריכים להיות.", label: "הכי צלול", fallback: { name: "מערכת אוסמוזה הפוכה", path: "/product-category/אוסמוזה-הפוכה/" } },
];

// The 3D only loads when the section is near, on capable devices, and when motion is welcome.
function canRun3D() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (document.documentElement.classList.contains("a11y-stop-motion")) return false;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return false;
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function GlassStory({ products }: { products: (StageProduct | null)[] }) {
  const [stage, setStage] = useState(0);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<GlassScene | null>(null);
  const auto = useRef(true);
  const stages: Stage[] = STAGES.map((s, i) => ({ ...s, product: products[i] ?? null }));

  useEffect(() => {
    const el = host.current;
    if (!el || !canRun3D()) return;
    let disposed = false;
    const io = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const { mountGlassScene } = await import("./scene");
        if (disposed) return;
        scene.current = mountGlassScene(el, {
          stage: 0,
          // autoplay walks through the stages once; any click takes over
          onStageDone: (i) => {
            if (!auto.current || i >= STAGES.length - 1) return;
            setStage(i + 1);
            scene.current?.setStage(i + 1);
          },
        });
        setReady(true);
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => {
      disposed = true;
      io.disconnect();
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  const choose = (i: number) => {
    auto.current = false;
    setStage(i);
    scene.current?.setStage(i);
    if (paused) { setPaused(false); scene.current?.setPaused(false); }
  };

  return (
    <section className="glass-story" aria-labelledby="glass-title">
      <div className="glass-story__stage glow" data-ready={ready}>
        <Image src="/glass-poster.webp" alt="" fill sizes="(max-width: 900px) 92vw, 46vw" className="glass-story__poster" />
        <div ref={host} className="glass-story__canvas" />
        {ready && (
          <button
            type="button" className="round-btn glass-story__pause" aria-pressed={paused}
            aria-label={paused ? "הפעלת האנימציה" : "השהיית האנימציה"}
            onClick={() => { setPaused(!paused); scene.current?.setPaused(!paused); }}
          >
            <span aria-hidden="true">{paused ? "▶" : "❚❚"}</span>
          </button>
        )}
      </div>

      <div className="glass-story__copy">
        <span className="kicker">myWater · כפר סבא</span>
        <h2 id="glass-title" className="h2">מה יש בכוס שלכם?</h2>
        <p className="lead">הכוס נראית צלולה. אבל מה שחשוב קורה בפנים — ברמה שהעין לא רואה.</p>
        <ol className="glass-steps">
          {stages.map((s, i) => {
            const p = s.product;
            return (
              <li key={s.title} className="glass-step glass" data-active={i === stage}>
                <button type="button" className="glass-step__head" aria-pressed={i === stage} onClick={() => choose(i)}>
                  <span className="glass-step__num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <span className="glass-step__title">{s.title}</span>
                </button>
                <p className="glass-step__text">{s.text}</p>
                <Link href={p?.path ?? s.fallback.path} className="glass-step__product">
                  {p?.image && <Image src={p.image} alt="" width={56} height={56} />}
                  <span className="glass-step__meta">
                    <span className="glass-step__label">{s.label}</span>
                    <span className="glass-step__name">{p?.name ?? s.fallback.name}</span>
                  </span>
                  {p && <span className="glass-step__price">{formatPrice(p.price)}</span>}
                  <span aria-hidden="true" className="glass-step__go">←</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
