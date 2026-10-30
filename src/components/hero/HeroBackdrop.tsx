"use client";

// The hero photo stays fixed behind the hero and the systems section, zooms into the bar as the page
// scrolls, then hands over to the 3D bar (WaterStory), which zooms back out. Only a transform on one
// composited layer per frame; without motion (reduced motion / "עצירת אנימציות") it just stays put.
import Image from "next/image";
import { useEffect, useRef } from "react";
import { FADE, HANDOFF, clamp, ease } from "../story/timing";
import { photoFrame } from "./hero-photo";

export function HeroBackdrop() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layer.current!;
    let raf = 0;
    const update = () => {
      raf = 0;
      // The backdrop and the 3D stage are both 100% × 100lvh, so the two frames line up exactly.
      const vw = el.clientWidth, vh = el.clientHeight, y = scrollY;
      const story = document.querySelector<HTMLElement>(".story");
      const live = !!story && story.dataset.mode !== "off";
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-stop-motion");
      const start = story ? story.getBoundingClientRect().top + y : document.documentElement.scrollHeight;
      // Without the 3D the photo simply fades out as the systems section ends.
      const end = live ? start + HANDOFF * vh : start - 0.5 * vh;
      const z = still ? 0 : ease(clamp(y / Math.max(1, end)));
      const fade = clamp((y - end) / (FADE * vh));

      const { s, tx, ty } = photoFrame(vw, vh, z);
      el.style.transform = z > 0 ? `translate(${tx}px,${ty}px) scale(${s})` : "";
      el.style.opacity = String(1 - fade);
      el.style.visibility = fade >= 1 ? "hidden" : "";
      // On phones the photo is dimmed behind the hero text; it comes up to full strength as it zooms.
      el.style.setProperty("--hero-bg-o", vw <= 760 ? String(0.55 + 0.45 * clamp(z * 2)) : "1");
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    // The story switching its 3D on/off, or the motion settings changing, move the timing.
    const mo = new MutationObserver(queue);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const story = document.querySelector(".story");
    if (story) mo.observe(story, { attributes: true, attributeFilter: ["data-mode"] });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", queue);
      removeEventListener("resize", queue);
      mo.disconnect();
    };
  }, []);

  return (
    <div className="hero-backdrop" aria-hidden="true">
      <div ref={layer} className="hero-backdrop__layer">
        <Image src="/hero-dispenser.webp" alt="" fill priority sizes="100vw" className="hero__bg" />
      </div>
    </div>
  );
}
