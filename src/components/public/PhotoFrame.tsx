// Affiche une photo en entier (object-contain) sur un fond flouté de la
// même image : aucune zone rognée, et pas de bandes vides moches quand le
// format de la photo ne correspond pas au cadre.
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
    <div className={`relative overflow-hidden bg-cream-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="relative h-full w-full object-contain" />
    </div>
  );
}
