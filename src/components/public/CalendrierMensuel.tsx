"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

const TIME_ZONE = "Europe/Paris";
const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export interface CreneauDisponible {
  id: string;
  /** Instant UTC, sérialisé en ISO (les objets Date ne traversent pas la frontière serveur/client). */
  dateHeure: string;
}

interface CalendrierMensuelProps {
  visiteSlug: string;
  creneaux: CreneauDisponible[];
}

/**
 * Calendrier mensuel navigable affichant uniquement les créneaux PUBLIE
 * passés depuis le serveur. Regroupe les créneaux par jour calendaire
 * Europe/Paris ; un clic sur un jour en surbrillance affiche ses horaires,
 * un clic sur un horaire redirige vers la page de réservation du créneau.
 */
export default function CalendrierMensuel({ visiteSlug, creneaux }: CalendrierMensuelProps) {
  const router = useRouter();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [displayedMonth, setDisplayedMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const creneauxParJour = useMemo(() => {
    const map = new Map<string, CreneauDisponible[]>();
    for (const creneau of creneaux) {
      const zoned = toZonedTime(creneau.dateHeure, TIME_ZONE);
      const key = format(zoned, "yyyy-MM-dd");
      const liste = map.get(key);
      if (liste) {
        liste.push(creneau);
      } else {
        map.set(key, [creneau]);
      }
    }
    for (const liste of map.values()) {
      liste.sort((a, b) => a.dateHeure.localeCompare(b.dateHeure));
    }
    return map;
  }, [creneaux]);

  const jours = useMemo(() => {
    const debut = startOfWeek(startOfMonth(displayedMonth), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(displayedMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: debut, end: fin });
  }, [displayedMonth]);

  const peutReculer = displayedMonth > startOfMonth(today);
  const selectedCreneaux = selectedDayKey ? (creneauxParJour.get(selectedDayKey) ?? []) : [];
  const creneauReference = selectedCreneaux[0];

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDisplayedMonth((mois) => subMonths(mois, 1))}
          disabled={!peutReculer}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Mois précédent
        </button>
        <p className="text-sm font-semibold capitalize text-stone-900">
          {format(displayedMonth, "MMMM yyyy", { locale: fr })}
        </p>
        <button
          type="button"
          onClick={() => setDisplayedMonth((mois) => addMonths(mois, 1))}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
        >
          Mois suivant →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase text-stone-400">
        {JOURS_SEMAINE.map((jour) => (
          <div key={jour} className="py-1">
            {jour}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {jours.map((jour) => {
          const key = format(jour, "yyyy-MM-dd");
          const disponibles = creneauxParJour.get(key) ?? [];
          const dansLeMois = isSameMonth(jour, displayedMonth);
          const estPasse = isBefore(jour, today);
          const aDesCreneaux = disponibles.length > 0 && !estPasse;
          const estSelectionne = selectedDayKey === key;

          return (
            <button
              key={key}
              type="button"
              disabled={!aDesCreneaux}
              onClick={() => setSelectedDayKey(key)}
              className={[
                "aspect-square rounded-md text-sm transition",
                !dansLeMois ? "text-stone-300" : "",
                aDesCreneaux
                  ? "cursor-pointer bg-stone-900 font-semibold text-white hover:bg-stone-700"
                  : "cursor-default text-stone-700",
                estSelectionne ? "ring-2 ring-stone-900 ring-offset-1" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {format(jour, "d")}
            </button>
          );
        })}
      </div>

      {selectedDayKey && creneauReference ? (
        <div className="mt-6 border-t border-stone-200 pt-4">
          <p className="mb-2 text-sm font-medium text-stone-900">
            Créneaux disponibles le{" "}
            {formatInTimeZone(creneauReference.dateHeure, TIME_ZONE, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
          <ul className="flex flex-wrap gap-2">
            {selectedCreneaux.map((creneau) => (
              <li key={creneau.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/visites/${visiteSlug}/reserver/${creneau.id}`)}
                  className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-stone-900 hover:bg-stone-900 hover:text-white"
                >
                  {formatInTimeZone(creneau.dateHeure, TIME_ZONE, "HH:mm", { locale: fr })}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-sm text-stone-500">
          Sélectionnez un jour en surbrillance pour voir les horaires disponibles.
        </p>
      )}
    </div>
  );
}
