import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { nomOuRaisonSociale: "asc" },
    include: { _count: { select: { reservations: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Comptes clients</h1>
        <Link
          href="/admin/clients/nouveau"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Nouveau client
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Réservations</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">{c.nomOuRaisonSociale}</td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3">{c._count.reservations}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/clients/${c.id}`} className="text-stone-900 underline">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-stone-400">
                  Aucun client.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
