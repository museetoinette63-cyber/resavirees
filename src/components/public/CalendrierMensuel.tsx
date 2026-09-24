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
    <div className="rounded-lg border-2 border-border-warm bg-cream-2 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDisplayedMonth((mois) => subMonths(mois, 1))}
          disabled={!peutReculer}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft transition-[background-color,transform] duration-150 ease-snappy hover:bg-gold-light/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        >
          ← Mois précédent
        </button>
        <p className="font-display text-base font-semibold capitalize text-rust-dark">
          {format(displayedMonth, "MMMM yyyy", { locale: fr })}
        </p>
        <button
          type="button"
          onClick={() => setDisplayedMonth((mois) => addMonths(mois, 1))}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft transition-[background-color,transform] duration-150 ease-snappy hover:bg-gold-light/30 active:scale-95"
        >
          Mois suivant →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase text-ink-soft/70">
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
                "aspect-square rounded-md text-sm transition-[background-color,transform,box-shadow] duration-150 ease-snappy",
                !dansLeMois ? "text-ink-soft/30" : "",
                aDesCreneaux
                  ? "cursor-pointer bg-rust font-semibold text-cream hover:bg-rust-dark active:scale-90"
                  : "cursor-default text-ink-soft",
                estSelectionne ? "ring-2 ring-gold ring-offset-1 ring-offset-cream-2" : "",
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
        <div key={selectedDayKey} className="mt-6 animate-fade-in-up border-t-2 border-border-warm pt-4">
          <p className="mb-2 text-sm font-medium text-ink">
            Créneaux disponibles le{" "}
            {formatInTimeZone(creneauReference.dateHeure, TIME_ZONE, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
          <ul className="flex flex-wrap gap-2">
            {selectedCreneaux.map((creneau, i) => (
              <li key={creneau.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-in-up">
                <button
                  type="button"
                  onClick={() => router.push(`/visites/${visiteSlug}/reserver/${creneau.id}`)}
                  className="rounded-md border-2 border-gold px-3 py-1.5 text-sm font-medium text-rust-dark transition-[background-color,color,transform] duration-150 ease-snappy hover:bg-gold hover:text-cream active:scale-95"
                >
                  {formatInTimeZone(creneau.dateHeure, TIME_ZONE, "HH:mm", { locale: fr })}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink-soft">
          Sélectionnez un jour en surbrillance pour voir les horaires disponibles.
        </p>
      )}
    </div>
  );
}
