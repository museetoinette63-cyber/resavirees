// Ornements dessinés en SVG pour le site public : fleuron (séparateur),
// coins de cadre, médaillon à chiffre romain. Aucun état, aucune donnée.

export function Fleuron({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 28" aria-hidden="true" className={className} fill="currentColor">
      <path d="M4 14H78M162 14H236" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="84" cy="14" r="2" />
      <circle cx="156" cy="14" r="2" />
      <path d="M108 14C102 7 94 7 89 14C94 21 102 21 108 14Z" />
      <path d="M132 14C138 7 146 7 151 14C146 21 138 21 132 14Z" />
      <g transform="translate(120 14)">
        <ellipse rx="3.4" ry="7" cy="-6" />
        <ellipse rx="3.4" ry="7" cy="6" />
        <ellipse rx="7" ry="3.4" cx="-6" />
        <ellipse rx="7" ry="3.4" cx="6" />
      </g>
    </svg>
  );
}

function CoinOrne({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path d="M2 46V16C2 8 8 2 16 2H46" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M9 46V19C9 13 13 9 19 9H46" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="16" cy="16" r="3.4" fill="currentColor" />
      <circle cx="31" cy="5.5" r="1.6" fill="currentColor" />
      <circle cx="5.5" cy="31" r="1.6" fill="currentColor" />
    </svg>
  );
}

// Portail roman : un tympan en demi-cercle orné d'un quadrilobe, sous lequel
// vient le contenu (photo affichée EN ENTIER, jamais rognée par la courbe).
export function NicheArcade({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-t-full border-2 border-wine-dark bg-ink">
      <div className="flex aspect-[2/1] items-center justify-center">
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-16 w-16 text-ochre" fill="currentColor">
          <ellipse cx="24" cy="14" rx="5" ry="9" />
          <ellipse cx="24" cy="34" rx="5" ry="9" />
          <ellipse cx="14" cy="24" rx="9" ry="5" />
          <ellipse cx="34" cy="24" rx="9" ry="5" />
          <circle cx="24" cy="24" r="3.5" className="text-ink" fill="currentColor" />
        </svg>
      </div>
      {children}
    </div>
  );
}

const TAILLES = {
  md: { padding: "p-7 sm:p-8", coin: "h-8 w-8" },
  sm: { padding: "p-5", coin: "h-6 w-6" },
} as const;

// Cadre à double filet doré avec un ornement à chaque coin.
export function CadreOrne({
  children,
  className = "",
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: keyof typeof TAILLES;
}) {
  const { padding, coin } = TAILLES[size];
  const base = `pointer-events-none absolute text-ochre ${coin}`;
  return (
    <div className={`relative border-[3px] border-double border-ochre ${padding} ${className}`}>
      {children}
      <CoinOrne className={`${base} left-0.5 top-0.5`} />
      <CoinOrne className={`${base} right-0.5 top-0.5 rotate-90`} />
      <CoinOrne className={`${base} bottom-0.5 right-0.5 rotate-180`} />
      <CoinOrne className={`${base} bottom-0.5 left-0.5 -rotate-90`} />
    </div>
  );
}

const ROMAINS: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function romain(n: number): string {
  let reste = n;
  let out = "";
  for (const [valeur, signe] of ROMAINS) {
    while (reste >= valeur) {
      out += signe;
      reste -= valeur;
    }
  }
  return out;
}

// Médaillon rond à double filet, pour un chiffre romain.
export function Medaillon({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-double border-ochre bg-cream-2 font-title text-xl font-bold text-wine-dark">
      {children}
    </span>
  );
}
