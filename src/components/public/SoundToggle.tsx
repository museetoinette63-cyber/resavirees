"use client";

import { useRef, useState } from "react";

// Compact ambient-sound toggle for the site header. Starts paused/off on
// every page load — never autoplays — and only starts on an explicit user
// click. `preload="none"` so the audio file isn't even fetched until the
// visitor opts in.
export default function SoundToggle({
  url,
  nom,
}: {
  url: string;
  nom: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  }

  const label = nom ? `Ambiance sonore : ${nom}` : "Ambiance sonore";

  return (
    <>
      <audio ref={audioRef} src={url} loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        title={label}
        aria-label={playing ? `Couper ${label}` : `Activer ${label}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gold text-rust-dark transition-[background-color,transform] duration-150 ease-snappy hover:bg-gold-light/30 active:scale-90"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="m16 9 5 6" />
            <path d="m21 9-5 6" />
          </svg>
        )}
      </button>
    </>
  );
}
