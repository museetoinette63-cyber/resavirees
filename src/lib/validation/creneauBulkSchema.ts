import { z } from "zod";

// Validates the "création de créneaux en lot" admin form (cahier des
// charges: bulk créneau creation, potentially several years ahead). The
// object-level refine below estimates how many Creneau rows the submission
// would create and rejects anything over 2000 up front, so a mis-set date
// range can't silently generate a runaway number of rows.

const MAX_CRENEAUX = 2000;

const isoDateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Date invalide (format ISO attendu).",
  });

const heureString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horaire invalide (format HH:mm attendu).");

function countMatchingDays(
  dateDebut: Date,
  dateFin: Date,
  joursDeSemaine: number[]
): number {
  const jours = new Set(joursDeSemaine);
  let count = 0;

  // Walk day-by-day (inclusive) from dateDebut to dateFin, counting days
  // whose weekday (0 = dimanche .. 6 = samedi) is one of the selected ones.
  const cursor = new Date(
    Date.UTC(
      dateDebut.getUTCFullYear(),
      dateDebut.getUTCMonth(),
      dateDebut.getUTCDate()
    )
  );
  const end = new Date(
    Date.UTC(dateFin.getUTCFullYear(), dateFin.getUTCMonth(), dateFin.getUTCDate())
  );

  while (cursor.getTime() <= end.getTime()) {
    if (jours.has(cursor.getUTCDay())) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
}

export const creneauBulkSchema = z
  .object({
    visiteId: z.string().min(1, "La visite est requise."),
    joursDeSemaine: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Sélectionnez au moins un jour de la semaine.")
      .refine((jours) => jours.every((j) => j >= 0 && j <= 6), {
        message: "Les jours de la semaine doivent être compris entre 0 (dimanche) et 6 (samedi).",
      }),
    dateDebut: isoDateString,
    dateFin: isoDateString,
    horaires: z
      .array(heureString)
      .min(1, "Sélectionnez au moins un horaire."),
  })
  .refine((data) => Date.parse(data.dateFin) >= Date.parse(data.dateDebut), {
    message: "La date de fin doit être postérieure ou égale à la date de début.",
    path: ["dateFin"],
  })
  .refine(
    (data) => {
      const debut = new Date(data.dateDebut);
      const fin = new Date(data.dateFin);
      const joursCount = countMatchingDays(debut, fin, data.joursDeSemaine);
      const total = joursCount * data.horaires.length;
      return total <= MAX_CRENEAUX;
    },
    {
      message: `Cette sélection créerait trop de créneaux (plus de ${MAX_CRENEAUX}). Réduisez la plage de dates, le nombre de jours ou d'horaires.`,
      path: ["dateFin"],
    }
  );

export type CreneauBulkInput = z.infer<typeof creneauBulkSchema>;
