import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/formatMoney";
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS } from "@/lib/reservationStatusLabels";
import { cn } from "@/lib/cn";
import { EditClientForm, ManualDevisForm, ManualFactureForm } from "./client-detail-forms";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      reservations: {
        include: { creneau: { include: { visite: true } } },
        orderBy: { createdAt: "desc" },
      },
      devis: { include: { facture: true }, orderBy: { createdAt: "desc" } },
      factures: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) {
    notFound();
  }

  const devisSansFacture = client.devis
    .filter((d) => !d.facture)
    .map((d) => ({ id: d.id, numero: d.numero, montantTotal: d.montantTotal.toString() }));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/clients" className="text-sm text-stone-500 hover:underline">
          ← Comptes clients
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-stone-900">{client.nomOuRaisonSociale}</h1>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-900">Coordonnées</h2>
        <div className="mt-3">
          <EditClientForm
            client={{
              id: client.id,
              nomOuRaisonSociale: client.nomOuRaisonSociale,
              email: client.email,
              telephone: client.telephone,
              adressePostale: client.adressePostale,
              notes: client.notes,
            }}
          />
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-900">Réservations</h2>
        {client.reservations.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">Aucune réservation.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 text-sm">
            {client.reservations.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <div>
                  <Link href={`/admin/reservations/${r.id}`} className="text-stone-900 underline">
                    {r.creneau.visite.nom}
                  </Link>
                  <p className="text-xs text-stone-500">
                    {r.creneau.dateHeure.toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    RESERVATION_STATUS_COLORS[r.status]
                  )}
                >
                  {RESERVATION_STATUS_LABELS[r.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-900">Devis</h2>
        {client.devis.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">Aucun devis.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 text-sm">
            {client.devis.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-stone-900">
                    {d.numero}{" "}
                    {d.origineManuelle ? <span className="text-xs text-stone-400">(manuel)</span> : null}
                  </p>
                  <p className="text-xs text-stone-500">{formatEuros(d.montantTotal)}</p>
                </div>
                {d.pdfUrl ? (
                  <a href={d.pdfUrl} target="_blank" rel="noreferrer" className="text-stone-900 underline">
                    PDF
                  </a>
                ) : (
                  <span className="text-xs text-stone-400">{d.facture ? "facturé" : "sans facture"}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-stone-100 pt-4">
          <ManualDevisForm clientId={client.id} />
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-900">Factures</h2>
        {client.factures.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">Aucune facture.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 text-sm">
            {client.factures.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-stone-900">{f.numero}</p>
                  <p className="text-xs text-stone-500">
                    {formatEuros(f.montantFinal)} — {f.soldeStatutPaiement}
                  </p>
                </div>
                {f.pdfUrl ? (
                  <a href={f.pdfUrl} target="_blank" rel="noreferrer" className="text-stone-900 underline">
                    PDF
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-stone-100 pt-4">
          <ManualFactureForm clientId={client.id} devisOptions={devisSansFacture} />
        </div>
      </section>
    </div>
  );
}
