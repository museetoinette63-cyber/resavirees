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
      <section className="rounded-sm border-2 border-ochre bg-straw/30 p-5">
        {bloc.titre ? (
          <h2 className="font-display text-lg font-semibold text-wine-dark">{bloc.titre}</h2>
        ) : null}
        <p className="mt-1 whitespace-pre-wrap text-ink">{bloc.contenu}</p>
      </section>
    );
  }

  if (bloc.type === "TEXTE_IMAGE") {
    return (
      <section className="flex flex-col gap-6 rounded-sm border-[3px] border-double border-ochre bg-cream-2 p-5 sm:flex-row sm:items-center">
        {bloc.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bloc.imageUrl}
            alt={bloc.titre ?? ""}
            className="h-48 w-full rounded-sm object-cover sm:h-40 sm:w-1/2"
          />
        ) : null}
        <div className="space-y-2 sm:flex-1">
          {bloc.titre ? (
            <h2 className="font-display text-xl font-semibold text-wine-dark">{bloc.titre}</h2>
          ) : null}
          <p className="whitespace-pre-wrap text-ink-soft">{bloc.contenu}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      {bloc.titre ? (
        <h2 className="font-display text-xl font-semibold text-wine-dark">{bloc.titre}</h2>
      ) : null}
      <p className="whitespace-pre-wrap text-ink-soft">{bloc.contenu}</p>
    </section>
  );
}
