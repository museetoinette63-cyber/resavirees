"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export type CarouselPhoto = {
  id: string;
  url: string;
  legende: string | null;
};

const ROTATE_MS = 6000;

// Diaporama d'en-tête : chaque photo est affichée EN ENTIER (object-contain)
// sur un fond flouté de la même image — jamais rognée. Grand format sur
// l'accueil, plus compact sur les autres pages. Défilement automatique,
// pause au survol, flèches, pastilles et balayage tactile.
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
      className="mx-auto w-full max-w-6xl px-4 pt-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`relative overflow-hidden rounded-[1.75rem] border border-gold/60 bg-ink shadow-[0_30px_60px_-28px_rgba(46,33,24,0.6)] ring-4 ring-cream-2 ${
          isHome
            ? "aspect-[4/3] max-h-[78vh] w-full sm:aspect-[16/9] lg:aspect-[2/1]"
            : "aspect-[16/10] w-full sm:aspect-[3/1]"
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
        {photos.map((photo, i) => {
          const active = i === current;
          return (
            <div
              key={photo.id}
              aria-hidden={!active}
              className={`absolute inset-0 transition-[opacity,transform] duration-[1200ms] ease-fluid ${
                active ? "scale-100 opacity-100" : "scale-[1.03] opacity-0"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.legende ?? ""}
                className="relative h-full w-full object-contain"
              />
            </div>
          );
        })}

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(current - 1)}
              aria-label="Photo précédente"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-cream/85 text-xl text-rust-dark shadow-md backdrop-blur transition-[background-color,transform] duration-150 ease-snappy hover:bg-cream active:scale-90"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              aria-label="Photo suivante"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-cream/85 text-xl text-rust-dark shadow-md backdrop-blur transition-[background-color,transform] duration-150 ease-snappy hover:bg-cream active:scale-90"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {count > 1 || legende ? (
        <div className="mt-4 flex flex-col items-center gap-2">
          {legende ? (
            <p className="text-center font-display text-lg italic text-ink-soft">{legende}</p>
          ) : null}
          {count > 1 ? (
            <div className="flex items-center gap-2">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Afficher la photo ${i + 1}`}
                  aria-current={i === current}
                  className={`h-2 rounded-full transition-[width,background-color] duration-300 ease-snappy ${
                    i === current ? "w-8 bg-rust" : "w-2 bg-gold/50 hover:bg-gold"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
