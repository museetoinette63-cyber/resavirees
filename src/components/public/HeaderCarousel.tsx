"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CadreOrne, Fleuron, romain } from "@/components/public/Ornaments";

export type CarouselPhoto = {
  id: string;
  url: string;
  legende: string | null;
};

const ROTATE_MS = 6500;

// Diaporama d'en-tête présenté comme une gravure encadrée : chaque photo
// est affichée EN ENTIER (object-contain) sur fond sombre, jamais rognée.
// Grand format sur l'accueil, plus compact ailleurs. Défilement automatique,
// pause au survol, flèches, numérotation romaine et balayage tactile.
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

  const flecheClass =
    "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border-2 border-ochre bg-wine-dark/90 text-2xl leading-none text-straw transition-[background-color,transform] duration-150 ease-snappy hover:bg-wine active:scale-90";

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Photos"
      className="mx-auto w-full max-w-6xl px-4 pt-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <CadreOrne className="bg-cream-2/70">
        <div
          className={`relative w-full overflow-hidden border-2 border-wine-dark bg-ink ${
            isHome
              ? "aspect-[4/3] max-h-[78vh] sm:aspect-[16/9] lg:aspect-[2/1]"
              : "aspect-[16/10] max-h-[60vh] sm:aspect-[5/2]"
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
                className={`${flecheClass} left-2`}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => go(current + 1)}
                aria-label="Photo suivante"
                className={`${flecheClass} right-2`}
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      </CadreOrne>

      {count > 1 || legende ? (
        <div className="mt-5 flex flex-col items-center gap-2 text-center">
          {legende ? <p className="font-display text-2xl italic text-wine-dark">{legende}</p> : null}
          {count > 1 ? (
            <>
              <Fleuron className="h-5 w-44 text-ochre" />
              <p className="font-title text-sm font-bold tracking-[0.3em] text-ochre" aria-label={`Photo ${current + 1} sur ${count}`}>
                {romain(current + 1)} · {romain(count)}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
