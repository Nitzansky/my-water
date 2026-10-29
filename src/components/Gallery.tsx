"use client";

import Image from "next/image";
import { useState } from "react";
import type { ImageRef } from "@/lib/wp";

export function Gallery({ images, name }: { images: ImageRef[]; name: string }) {
  const [active, setActive] = useState(0);
  const main = images[active];
  return (
    <div className="gallery">
      <div className="gallery__main glow">
        {main ? (
          <Image src={main.src} alt={main.alt || name} fill priority sizes="(max-width: 900px) 92vw, 560px" />
        ) : (
          <span className="gallery__empty">אין תמונה</span>
        )}
      </div>
      {images.length > 1 && (
        <ul className="gallery__thumbs" aria-label="תמונות נוספות">
          {images.map((img, i) => (
            <li key={img.src}>
              <button type="button" aria-label={`תמונה ${i + 1} מתוך ${images.length}`} aria-pressed={i === active} onClick={() => setActive(i)}>
                <Image src={img.src} alt="" fill sizes="120px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
