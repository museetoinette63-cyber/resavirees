// Affiche une photo en entier (object-contain) sur un fond sombre de
// passe-partout : aucune zone rognée. `className` règle le format et la
// forme (ex. `rounded-t-full` pour une arcade).
export default function PhotoFrame({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden bg-ink ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </div>
  );
}
