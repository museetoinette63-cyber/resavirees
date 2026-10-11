// Affiche une photo en entier (object-contain) : aucune zone rognée. Quand
// le format de la photo ne correspond pas au cadre, le fond uni de pierre
// joue le rôle d'un passe-partout.
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
    <div className={`bg-cream-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </div>
  );
}
