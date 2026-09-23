"use client";

import { useEffect, useState } from "react";

export type CarouselPhoto = {
  id: string;
  url: string;
  legende: string | null;
};

const ROTATE_MS = 5000;

// Small (not full-bleed) auto-crossfading header slideshow. With 0 active
// photos it renders nothing; with exactly 1 it just shows it statically
// (no timer, no crossfade — nothing to rotate to).
export default function HeaderCarousel({ photos }: { photos: CarouselPhoto[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [photos.length]);

  if (photos.length === 0) return null;

  return (
    <div className="relative mt-3 h-16 w-full overflow-hidden rounded-lg border-2 border-gold sm:h-24">
      {photos.map((photo, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.legende ?? ""}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
