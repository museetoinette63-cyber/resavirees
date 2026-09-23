import type { BlocType } from "@prisma/client";

export type BlocContenuData = {
  id: string;
  type: BlocType;
  titre: string | null;
  contenu: string;
  imageUrl: string | null;
};

// Renders admin-authored BlocContenu entries on the public site (see
// prisma/schema.prisma `BlocContenu` — the client's "personnalisation :
// encarts, infos" request). Server component: purely presentational, no
// interactivity needed. Used both by (public)/layout.tsx (SITE_ENTIER,
// every page) and (public)/page.tsx (ACCUEIL, homepage only).
export default function BlocsContenu({ blocs }: { blocs: BlocContenuData[] }) {
  if (blocs.length === 0) return null;

  return (
    <div className="space-y-6">
      {blocs.map((bloc) => (
        <BlocContenuItem key={bloc.id} bloc={bloc} />
      ))}
    </div>
  );
}

function BlocContenuItem({ bloc }: { bloc: BlocContenuData }) {
  if (bloc.type === "ENCART") {
    return (
      <section className="rounded-lg border-2 border-gold bg-gold-light/30 p-5 shadow-sm">
        {bloc.titre ? (
          <h2 className="font-display text-lg font-semibold text-rust-dark">{bloc.titre}</h2>
        ) : null}
        <p className="mt-1 whitespace-pre-wrap text-ink">{bloc.contenu}</p>
      </section>
    );
  }

  if (bloc.type === "TEXTE_IMAGE") {
    return (
      <section className="flex flex-col gap-6 rounded-lg border-2 border-border-warm bg-cream-2 p-5 sm:flex-row sm:items-center">
        {bloc.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bloc.imageUrl}
            alt={bloc.titre ?? ""}
            className="h-48 w-full rounded-lg object-cover sm:h-40 sm:w-1/2"
          />
        ) : null}
        <div className="space-y-2 sm:flex-1">
          {bloc.titre ? (
            <h2 className="font-display text-xl font-semibold text-rust-dark">{bloc.titre}</h2>
          ) : null}
          <p className="whitespace-pre-wrap text-ink-soft">{bloc.contenu}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      {bloc.titre ? (
        <h2 className="font-display text-xl font-semibold text-rust-dark">{bloc.titre}</h2>
      ) : null}
      <p className="whitespace-pre-wrap text-ink-soft">{bloc.contenu}</p>
    </section>
  );
}
