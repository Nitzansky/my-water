"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BuyButtons } from "../BuyButtons";
import { formatPrice } from "../ui";
import type { StoryScene } from "./story-scene";

export type StoryProduct = { id: number; name: string; path: string; price: number; image: string | null; inStock: boolean };

// Copy from the design handoff ("Scroll B5 - Hero") — awaiting client approval, like the home FAQ.
const STEPS = [
  { snap: "משקעים", title: "משקעים", text: "חול, חלודה וחלקיקים מהצנרת — המסנן עוצר אותם ראשונים.", label: "עוצר משקעים", fallback: { name: "מסנן מקורי לתמי 4", path: "/product-category/filter-for-tami-4/" } },
  { snap: "טעם וריח", title: "טעם וריח", text: "כלור ותרכובות שמשפיעות על הטעם נעצרים בשלב הבא.", label: "לטעם נקי", fallback: { name: "מסנן תואם לתמי 4", path: "/product-category/filter-for-tami-4/" } },
  { snap: "צלול", title: "צלול.", text: "מים שקופים וטעימים — כמו שהם צריכים להיות.", label: "הכי צלול", fallback: { name: "מערכת אוסמוזה הפוכה", path: "/product-category/אוסמוזה-הפוכה/" } },
];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// "on": live 3D; "off": weak device, data saver or reduced motion — the story becomes a normal stacked section.
type Mode = "pending" | "on" | "off";
type OffReason = "a11y" | "motion" | "data" | "weak" | "webgl" | "slow" | null;

// Why the 3D can't run here (null = it can). Settings the visitor chose are explained on the page.
function offReason(): OffReason {
  if (document.documentElement.classList.contains("a11y-stop-motion")) return "a11y";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return "motion";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "data";
  if ((nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) < 4) return "weak";
  try {
    return document.createElement("canvas").getContext("webgl2") ? null : "webgl";
  } catch {
    return "webgl";
  }
}

const OFF_NOTES: Partial<Record<Exclude<OffReason, null>, string>> = {
  a11y: "האנימציה התלת־ממדית כבויה כי „עצירת אנימציות” מופעלת בתפריט הנגישות.",
  motion: "האנימציה התלת־ממדית כבויה כי הגדרת „הפחתת תנועה” פעילה במכשיר.",
  data: "האנימציה התלת־ממדית כבויה כי מצב חיסכון בנתונים פעיל.",
};

// Glide to a scroll position (the design's arrows): 500–1400ms, easeInOutCubic, cancelled by any input.
function glide(y1: number) {
  const y0 = scrollY, d = y1 - y0;
  if (Math.abs(d) < 2) return;
  const dur = Math.min(1400, 500 + Math.abs(d) * 0.5), t0 = performance.now();
  let stop = false;
  const cancel = () => { stop = true; };
  addEventListener("wheel", cancel, { once: true, passive: true });
  addEventListener("touchstart", cancel, { once: true, passive: true });
  addEventListener("keydown", cancel, { once: true, passive: true });
  const step = (now: number) => {
    if (stop) return;
    const t = Math.min(1, (now - t0) / dur);
    scrollTo(0, y0 + d * easeInOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const top = (el: Element) => el.getBoundingClientRect().top + scrollY;

export function WaterStory({ products }: { products: (StoryProduct | null)[] }) {
  // undefined until checked on the client; failures found while running ("slow", "webgl") stick.
  const [reason, setReason] = useState<OffReason | undefined>(undefined);
  const mode: Mode = reason === undefined ? "pending" : reason ? "off" : "on";
  const [nav, setNav] = useState<{ show: boolean; up: boolean; label: string }>({ show: false, up: false, label: "" });
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);
  const discover = useRef<HTMLElement>(null);

  // Re-checked live: toggling "עצירת אנימציות" or the system's reduce-motion switches the 3D on/off.
  useEffect(() => {
    const check = () => {
      const r = offReason();
      setReason((prev) => (prev === "slow" || prev === "webgl" ? prev : r));
    };
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", check);
    return () => { mo.disconnect(); mq.removeEventListener("change", check); };
  }, []);

  // Load the 3D when the story is within ~1.5 screens, then drive it from the scroll position.
  useEffect(() => {
    if (mode !== "on") return;
    const el = root.current!, st = stage.current!, layer = zoom.current!, target = discover.current!;
    let scene: StoryScene | null = null, disposed = false, raf = 0;

    const onFrame = ({ q, rect }: { q: number; rect: { x: number; y: number; w: number; h: number; vw: number; vh: number } }) => {
      // The hero photo sits on the bar's screen and shrinks with it as the camera pulls back.
      const sc = Math.min(1, Math.min(rect.w / rect.vw, rect.h / rect.vh));
      const tx = rect.x + rect.w / 2 - (rect.vw * sc) / 2, ty = rect.y + rect.h / 2 - (rect.vh * sc) / 2;
      layer.style.transform = q <= 0.001 ? "none" : `translate(${tx}px,${ty}px) scale(${sc})`;
      layer.style.borderRadius = q <= 0.001 ? "0" : `${Math.min(400, 24 / Math.max(sc, 0.02))}px`;
      layer.style.opacity = String(1 - clamp((q - 0.5) / 0.35));
    };

    const reveals = [...el.querySelectorAll<HTMLElement>("[data-reveal]")];
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const vh = innerHeight, y = scrollY, start = top(el), dStart = top(target);
      const end = start + el.offsetHeight - vh;
      scene?.setIntro(clamp((y - start) / Math.max(1, dStart - start)));
      scene?.setProgress(clamp((y - dStart) / Math.max(1, end - dStart)));
      for (const r of reveals) {
        const R = r.getBoundingClientRect();
        const o = Math.min(clamp((vh * 0.9 - R.top) / (vh * 0.3)), clamp((R.bottom - vh * 0.1) / (vh * 0.3)));
        r.style.opacity = String(o);
        r.style.transform = `translateY(${(1 - o) * 24}px)`;
      }
    };

    const io = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting || scene) return;
        io.disconnect();
        const { mountStoryScene } = await import("./story-scene");
        if (disposed) return;
        try {
          scene = await mountStoryScene(st, { onFrame, onSlow: () => setReason("slow") });
          if (disposed) scene.dispose();
          else st.dataset.ready = "true";
        } catch {
          setReason("webgl");
        }
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(el);

    // Only run the scroll tick while the story is on screen.
    const vis = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !raf) tick();
      if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    });
    vis.observe(el);

    return () => {
      disposed = true;
      io.disconnect();
      vis.disconnect();
      cancelAnimationFrame(raf);
      scene?.dispose();
      reveals.forEach((r) => { r.style.opacity = ""; r.style.transform = ""; });
    };
  }, [mode]);

  // Auto-glide (design): once the visitor scrolls into the intro, ease on to "מה יש בכוס".
  // Any wheel, touch or key input takes over immediately.
  useEffect(() => {
    if (mode !== "on") return;
    const el = root.current!, target = discover.current!;
    let v = 0, lastY = scrollY, lastT = performance.now(), inputT = 0, engaged = false, ours = -1, prev = performance.now(), raf = 0;
    const Kk = 9, C = 2 * Math.sqrt(Kk), AMAX = 5000;
    const input = () => { inputT = performance.now(); };
    const onTouch = () => { input(); v = 0; };
    const onScroll = () => {
      const now = performance.now(), y = scrollY;
      if (ours >= 0 && Math.abs(y - ours) < 1.5) { lastY = y; lastT = now; return; }
      const dt = Math.max(1, now - lastT), mv = ((y - lastY) / dt) * 1000;
      v = v * 0.6 + mv * 0.4;
      lastY = y; lastT = now; inputT = now;
      const start = top(el), end = top(target);
      if (mv < -30 || y >= end - 2 || y < start) engaged = false;
      else if (y > start + 8 && mv > 0) engaged = true;
    };
    const spring = (now: number) => {
      raf = requestAnimationFrame(spring);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      if (!engaged || now - inputT < 80) { ours = -1; return; }
      const end = top(target), x = scrollY, d = end - x;
      if (d <= 1) { engaged = false; v = 0; ours = -1; return; }
      if (d < 6 || (v < 40 && d < 20)) { ours = end; scrollTo(0, end); engaged = false; v = 0; return; }
      const acc = Math.max(-AMAX, Math.min(AMAX, Kk * d - C * v));
      v = Math.max(0, v + acc * dt);
      const nx = Math.min(end, x + v * dt);
      ours = nx;
      scrollTo(0, nx);
    };
    (["wheel", "touchmove", "keydown"] as const).forEach((ev) => addEventListener(ev, input, { passive: true }));
    addEventListener("touchstart", onTouch, { passive: true });
    addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(spring);
    return () => {
      cancelAnimationFrame(raf);
      (["wheel", "touchmove", "keydown"] as const).forEach((ev) => removeEventListener(ev, input));
      removeEventListener("touchstart", onTouch);
      removeEventListener("scroll", onScroll);
    };
  }, [mode]);

  // "הבא: …" arrows while the story is on screen.
  useEffect(() => {
    if (mode !== "on") return;
    const el = root.current!;
    const update = () => {
      const R = el.getBoundingClientRect(), vh = innerHeight;
      const inStory = R.top < vh * 0.5 && R.bottom > vh * 0.5;
      const snaps = [...document.querySelectorAll<HTMLElement>("[data-snap]")];
      const next = snaps.find((s) => top(s) > scrollY + 12);
      setNav({ show: inStory && !!next, up: R.top < -8, label: next?.dataset.snap ?? "" });
    };
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, [mode]);

  const go = (dir: 1 | -1) => {
    const snaps = [...document.querySelectorAll<HTMLElement>("[data-snap]")].map(top);
    const y = scrollY;
    const t = dir > 0 ? snaps.find((s) => s > y + 12) : [...snaps].reverse().find((s) => s < y - 12) ?? top(root.current!);
    if (t !== undefined) glide(Math.min(t, document.documentElement.scrollHeight - innerHeight));
  };

  return (
    <div ref={root} className="story" data-mode={mode}>
      <div className="story__sticky" aria-hidden="true">
        <div ref={stage} className="story__stage" />
        <div ref={zoom} className="story__zoom">
          <Image src="/hero-tami.webp" alt="" fill sizes="100vw" />
        </div>
      </div>

      <div className="story__intro" />
      {mode === "off" && reason && OFF_NOTES[reason] && <p className="story__note">{OFF_NOTES[reason]}</p>}

      <section ref={discover} id="discover" className="story__sec" data-snap="מה יש בכוס" aria-labelledby="story-title">
        <div className="story__panel" data-reveal>
          <span className="kicker">myWater · כפר סבא</span>
          <h2 id="story-title" className="story__title story__title--xl">מה יש<br />בכוס שלכם?</h2>
          <p className="story__text">מסננים, ברי מים ומערכות טיהור — עם טכנאי עד הבית.</p>
        </div>
      </section>

      <section className="story__sec" data-snap="הכוס נראית צלולה">
        <div className="story__panel" data-reveal>
          <h2 className="story__title">הכוס נראית צלולה.</h2>
          <p className="story__text">אבל מה שחשוב קורה בפנים — ברמה שהעין לא רואה.</p>
        </div>
      </section>

      {STEPS.map((s, i) => {
        const p = products[i];
        return (
          <section key={s.snap} className="story__sec" data-snap={s.snap}>
            <div className="story__panel" data-reveal>
              <div className="story__num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</div>
              <h2 className="story__title">{s.title}</h2>
              <p className="story__text">{s.text}</p>
              <div className="story__product">
                <Link href={p?.path ?? s.fallback.path} className="story__product-link">
                  {p?.image && <Image src={p.image} alt="" width={64} height={64} />}
                  <span className="story__product-meta">
                    <span className="story__product-label">{s.label}</span>
                    <span className="story__product-name">{p?.name ?? s.fallback.name}</span>
                    {p && <span className="story__product-price">{formatPrice(p.price)}</span>}
                  </span>
                </Link>
                {p && <BuyButtons inStock={p.inStock} product={{ id: p.id, name: p.name, price: p.price, path: p.path, image: p.image }} />}
              </div>
            </div>
          </section>
        );
      })}

      {mode === "on" && (
        <div className="story-nav" data-show={nav.show}>
          <span className="story-nav__label" aria-hidden="true">הבא: {nav.label}</span>
          {nav.up && <button type="button" className="story-nav__btn" aria-label="לחלק הקודם" onClick={() => go(-1)}>↑</button>}
          <button type="button" className="story-nav__btn" aria-label={`לחלק הבא: ${nav.label}`} onClick={() => go(1)}>↓</button>
        </div>
      )}
    </div>
  );
}
