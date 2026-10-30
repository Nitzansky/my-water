"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// Accessibility menu: text size, display modes and read-aloud (Web Speech API, Hebrew voice).
// Settings persist per visitor and are applied before paint by A11Y_BOOT in the root layout.
export const A11Y_KEY = "mw-a11y";
export const A11Y_SIZES = [100, 112, 125, 140, 160, 180];
const MODES = {
  contrast: "ניגודיות גבוהה",
  grayscale: "גווני אפור",
  links: "הדגשת קישורים",
  headings: "הדגשת כותרות",
  spacing: "מרווח שורות",
  readable: "גופן קריא",
  "stop-motion": "עצירת אנימציות",
  "big-cursor": "סמן גדול",
} as const;
type Mode = keyof typeof MODES;
type Settings = { size: number; modes: Partial<Record<Mode, boolean>>; hoverRead?: boolean; rate?: number };

// Runs inline in <head> so a saved setting never flashes the default look first.
// Large text sizes also switch the header to its compact layout (a11y-text-lg / a11y-text-xl).
export const A11Y_BOOT = `try{var s=JSON.parse(localStorage.getItem("${A11Y_KEY}")||"{}"),r=document.documentElement,z=${JSON.stringify(A11Y_SIZES)};if(s.size){r.style.fontSize=z[s.size]+"%";if(s.size>=2)r.classList.add("a11y-text-lg");if(s.size>=4)r.classList.add("a11y-text-xl")}for(var k in s.modes||{})if(s.modes[k])r.classList.add("a11y-"+k)}catch(e){}`;

const READABLE = "h1,h2,h3,h4,h5,h6,p,li,dt,dd,th,td,label,figcaption,blockquote,summary,a,button,.price,.kicker";
const RATES = [0.8, 1, 1.25];

function load(): Settings {
  try {
    return { size: 0, modes: {}, rate: 1, ...JSON.parse(localStorage.getItem(A11Y_KEY) || "{}") };
  } catch {
    return { size: 0, modes: {}, rate: 1 };
  }
}

// Chrome stops long utterances after ~15s, so text is spoken in sentence-sized chunks.
function chunks(text: string): string[] {
  const parts = text.split(/\n+/).flatMap((line) => line.replace(/\s+/g, " ").match(/[^.!?:]+[.!?:]*\s*/g) ?? []);
  const out: string[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (!p.trim()) continue;
    if (last && last.length + p.length < 180) out[out.length - 1] = `${last.trimEnd()} ${p.trim()}`;
    else out.push(p.trim());
  }
  return out;
}

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Settings>({ size: 0, modes: {}, rate: 1 });
  const [ready, setReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [canSpeak, setCanSpeak] = useState(true);
  const voice = useRef<SpeechSynthesisVoice | null>(null);
  const marked = useRef<Element | null>(null);
  const hoverT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setS(load());
    setReady(true);
  }, []);

  // apply + persist (only after the saved settings were loaded)
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.style.fontSize = s.size ? `${A11Y_SIZES[s.size]}%` : "";
    root.classList.toggle("a11y-text-lg", s.size >= 2);
    root.classList.toggle("a11y-text-xl", s.size >= 4);
    (Object.keys(MODES) as Mode[]).forEach((k) => root.classList.toggle(`a11y-${k}`, !!s.modes[k]));
    root.classList.toggle("a11y-hover-read", !!s.hoverRead);
    try {
      localStorage.setItem(A11Y_KEY, JSON.stringify(s));
    } catch {}
  }, [s, ready]);

  // pick a Hebrew voice (voices load asynchronously, so also re-checked when speaking)
  const pick = useCallback(() => {
    if (voice.current || !("speechSynthesis" in window)) return voice.current;
    voice.current = speechSynthesis.getVoices().find((v) => /^(he|iw)\b/i.test(v.lang.replace("_", "-"))) ?? null;
    return voice.current;
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return setCanSpeak(false);
    pick();
    speechSynthesis.addEventListener("voiceschanged", pick);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", pick);
      speechSynthesis.cancel();
    };
  }, [pick]);

  const unmark = () => {
    marked.current?.classList.remove("a11y-reading");
    marked.current = null;
  };

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    unmark();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, el?: Element | null) => {
      if (!("speechSynthesis" in window) || !text.trim()) return;
      speechSynthesis.cancel();
      unmark();
      if (el) {
        el.classList.add("a11y-reading");
        marked.current = el;
      }
      const parts = chunks(text);
      const v = pick();
      setSpeaking(true);
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        u.lang = v?.lang ?? "he-IL";
        if (v) u.voice = v;
        u.rate = s.rate ?? 1;
        if (i === parts.length - 1) u.onend = u.onerror = () => { unmark(); setSpeaking(false); };
        speechSynthesis.speak(u);
      });
    },
    [s.rate, pick],
  );

  const readPage = () => {
    const selected = window.getSelection()?.toString().trim();
    if (selected) return speak(selected);
    const main = document.getElementById("main");
    if (main) speak(main.innerText, null);
  };

  // "read on hover / focus" mode
  useEffect(() => {
    if (!s.hoverRead) return;
    const target = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.(READABLE);
      if (!el || wrap.current?.contains(el)) return null;
      return el;
    };
    const textOf = (el: Element) =>
      (el.getAttribute("aria-label") || (el as HTMLElement).innerText || el.getAttribute("alt") || "").trim();
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      clearTimeout(hoverT.current);
      const el = target(e);
      if (!el || el === marked.current) return;
      hoverT.current = setTimeout(() => speak(textOf(el), el), 350);
    };
    const onFocus = (e: FocusEvent) => {
      const el = target(e);
      if (el) speak(textOf(el), el);
    };
    // touch: tapping plain text reads it (links and buttons still work as usual)
    const onTap = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const el = target(e);
      if (el && !el.closest("a,button,input,select,textarea,label,summary")) speak(textOf(el), el);
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("pointerup", onTap);
    return () => {
      clearTimeout(hoverT.current);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("pointerup", onTap);
    };
  }, [s.hoverRead, speak]);

  // Escape / click outside closes the panel
  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  const toggle = (k: Mode) => setS((p) => ({ ...p, modes: { ...p.modes, [k]: !p.modes[k] } }));
  const close = () => { setOpen(false); trigger.current?.focus(); };

  return (
    <div className="a11y" ref={wrap}>
      <button
        ref={trigger} type="button" className="a11y-trigger" aria-expanded={open} aria-controls="a11y-panel"
        aria-label="תפריט נגישות" title="תפריט נגישות" onClick={() => setOpen((o) => !o)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
          <circle cx="12" cy="4" r="2" />
          <path d="M20.5 7.5c-2.6.7-5.6 1-8.5 1s-5.9-.3-8.5-1l-.5 2c2 .6 4.3 1 6.5 1.2V14l-2 8h2.2l1.8-6.5L13.3 22h2.2l-2-8v-3.3c2.2-.2 4.5-.6 6.5-1.2z" />
        </svg>
      </button>

      <div id="a11y-panel" className="a11y-panel" role="region" aria-label="הגדרות נגישות" hidden={!open}>
        <div className="a11y-head">
          <h2 className="a11y-title">הגדרות נגישות</h2>
          <button ref={closeBtn} type="button" className="a11y-close" aria-label="סגירת תפריט הנגישות" onClick={close}>✕</button>
        </div>

        <section className="a11y-section" aria-labelledby="a11y-read-h">
          <h3 id="a11y-read-h" className="a11y-sub">הקראת טקסט</h3>
          {canSpeak ? (
            <>
              <div className="a11y-row">
                <button type="button" className="a11y-btn a11y-btn--main" onClick={speaking ? stop : readPage}>
                  {speaking ? "■ עצירת הקראה" : "▶ הקראת העמוד"}
                </button>
                <button
                  type="button" className="a11y-toggle" aria-pressed={!!s.hoverRead}
                  onClick={() => { stop(); setS((p) => ({ ...p, hoverRead: !p.hoverRead })); }}
                >
                  הקראה בריחוף ובמיקוד
                </button>
              </div>
              <div className="a11y-row">
                <span id="a11y-rate-l">קצב הקראה</span>
                <div className="a11y-seg" role="group" aria-labelledby="a11y-rate-l">
                  {RATES.map((r, i) => (
                    <button key={r} type="button" aria-pressed={(s.rate ?? 1) === r} onClick={() => setS((p) => ({ ...p, rate: r }))}>
                      {["איטי", "רגיל", "מהיר"][i]}
                    </button>
                  ))}
                </div>
              </div>
              <p className="a11y-hint">טיפ: סמנו טקסט ולחצו „הקראת העמוד” כדי לשמוע רק אותו.</p>
            </>
          ) : (
            <p className="a11y-hint">הדפדפן הזה אינו תומך בהקראת טקסט.</p>
          )}
        </section>

        <section className="a11y-section" aria-labelledby="a11y-size-l">
          <div className="a11y-row">
            <h3 id="a11y-size-l" className="a11y-sub">גודל טקסט</h3>
            <div className="a11y-seg" role="group" aria-labelledby="a11y-size-l">
              <button type="button" aria-label="הקטנת גודל הטקסט" disabled={s.size === 0} onClick={() => setS((p) => ({ ...p, size: Math.max(0, p.size - 1) }))}>A−</button>
              <output aria-live="polite">{A11Y_SIZES[s.size]}%</output>
              <button type="button" aria-label="הגדלת גודל הטקסט" disabled={s.size === A11Y_SIZES.length - 1} onClick={() => setS((p) => ({ ...p, size: Math.min(A11Y_SIZES.length - 1, p.size + 1) }))}>A+</button>
            </div>
          </div>
        </section>

        <div className="a11y-grid">
          {(Object.keys(MODES) as Mode[]).map((k) => (
            <button key={k} type="button" className="a11y-toggle" aria-pressed={!!s.modes[k]} onClick={() => toggle(k)}>{MODES[k]}</button>
          ))}
        </div>

        <div className="a11y-foot">
          <button type="button" className="a11y-reset" onClick={() => { stop(); setS({ size: 0, modes: {}, rate: 1 }); }}>איפוס הגדרות</button>
          <Link href="/accessibility/" className="a11y-statement" onClick={() => setOpen(false)}>הצהרת נגישות</Link>
        </div>
      </div>
    </div>
  );
}
