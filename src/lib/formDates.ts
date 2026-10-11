// Conversions date/heure pour les formulaires du back-office (navigateur,
// fuseau local de l'admin) : ISO <-> valeurs des <input type="date"|"time">.

const pad = (n: number) => String(n).padStart(2, "0");

export function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoToTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Combine une date (yyyy-mm-dd) et une heure (HH:mm) en ISO, ou null si la date manque/est invalide. */
export function toIsoOrNull(date: string, heure = ""): string | null {
  if (!date) return null;
  const d = new Date(`${date}T${heure || "12:00"}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
