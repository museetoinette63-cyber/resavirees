const TIME_ZONE = "Europe/Paris";

/**
 * Formate une date/heure en français, dans le fuseau Europe/Paris, pour
 * affichage visiteur — ex. "samedi 14 mars 2026 à 14h00".
 */
export function formatDateTimeParis(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  const datePart = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);

  const timePart = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

  return `${datePart} à ${timePart.replace(":", "h")}`;
}
