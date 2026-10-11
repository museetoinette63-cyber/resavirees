"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export type CarouselPhoto = {
  id: string;
  url: string;
  legende: string | null;
};

const ROTATE_MS = 6500;

// Diaporama d'en-tête présenté comme un tirage encadré : chaque photo est
// affichée EN ENTIER (object-contain) sur fond sombre, jamais rognée. Grand
// format sur l'accueil, plus compact ailleurs. Défilement automatique, pause
// au survol, flèches, compteur et balayage tactile.
export default function HeaderCarousel({ photos }: { photos: CarouselPhoto[] }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const count = photos.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const current = count > 0 ? index % count : 0;

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearTimeout(timer);
  }, [count, paused, index]);

  if (count === 0) return null;

  const go = (next: number) => setIndex(((next % count) + count) % count);
  const legende = photos[current].legende;

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Photos"
      className="mx-auto w-full max-w-6xl px-4 pt-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="border border-ink/30 bg-cream-2 p-2 sm:p-3">
        <div
          className={`relative w-full overflow-hidden bg-ink ${
            isHome
              ? "aspect-[4/3] max-h-[78vh] sm:aspect-[16/9] lg:aspect-[2/1]"
              : "aspect-[16/10] sm:aspect-[3/1]"
          }`}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const delta = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(delta) > 40) go(current + (delta < 0 ? 1 : -1));
          }}
        >
          {photos.map((photo, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.id}
              src={photo.url}
              alt={photo.legende ?? ""}
              aria-hidden={i !== current}
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-[900ms] ease-fluid ${
                i === current ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(current - 1)}
                aria-label="Photo précédente"
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-ink/70 text-2xl leading-none text-cream transition-[background-color,transform] duration-150 ease-snappy hover:bg-ink active:scale-90"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => go(current + 1)}
                aria-label="Photo suivante"
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-ink/70 text-2xl leading-none text-cream transition-[background-color,transform] duration-150 ease-snappy hover:bg-ink active:scale-90"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      </div>

      {count > 1 || legende ? (
        <div className="mt-3 flex items-baseline justify-between gap-4 text-sm text-ink-soft">
          <p className="font-display italic">{legende ?? ""}</p>
          {count > 1 ? (
            <p className="shrink-0 tabular-nums" aria-live="off">
              {current + 1} / {count}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
