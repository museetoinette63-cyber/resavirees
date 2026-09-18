/**
 * Synchronisation unidirectionnelle back-office -> Google Agenda —
 * cahier des charges §7 (point ouvert résolu : module togglable, car la
 * config OAuth côté client est faite plus tard). No-op tant que
 * `GOOGLE_CALENDAR_ENABLED` n'est pas exactement `"true"`.
 *
 * Auth : OAuth2 "offline" avec refresh token pré-obtenu (compte de service
 * applicatif), pas de flux interactif ici.
 */

import { google, type calendar_v3 } from "googleapis";

export interface CalendarSyncReservation {
  nomOuRaisonSociale: string;
  telephone: string;
  email: string;
  adressePostale: string;
  nbAdultes: number;
  nbEnfants: number;
}

export interface CreateOrUpdateEventParams {
  reservation: CalendarSyncReservation;
  creneau: { dateHeure: Date };
  visite: { nom: string };
  /** Id d'événement Google existant (`Reservation.googleEventId`) : présent => update, absent/null => create. */
  existingEventId?: string | null;
}

/** Durée par défaut d'un événement, en l'absence de champ de durée dédié sur `Visite` (point d'extension). */
const DUREE_EVENEMENT_MS = 2 * 60 * 60 * 1000;

function isEnabled(): boolean {
  return process.env.GOOGLE_CALENDAR_ENABLED === "true";
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const oauth2Client = new google.auth.OAuth2({ clientId, clientSecret });
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

function getCalendarClient(): calendar_v3.Calendar {
  return google.calendar({ version: "v3", auth: getOAuthClient() });
}

function getCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

function buildEventBody(
  params: Omit<CreateOrUpdateEventParams, "existingEventId">
): calendar_v3.Schema$Event {
  const { reservation, creneau, visite } = params;
  const start = creneau.dateHeure;
  const end = new Date(start.getTime() + DUREE_EVENEMENT_MS);

  return {
    summary: `${visite.nom} — ${reservation.nomOuRaisonSociale}`,
    description: [
      `Client : ${reservation.nomOuRaisonSociale}`,
      `Téléphone : ${reservation.telephone}`,
      `E-mail : ${reservation.email}`,
      `Adresse : ${reservation.adressePostale}`,
      `Adultes : ${reservation.nbAdultes}, Enfants : ${reservation.nbEnfants}`,
    ].join("\n"),
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

/**
 * Crée ou met à jour un événement Google Agenda pour une réservation confirmée.
 * Retourne `null` (no-op) si la synchronisation n'est pas activée.
 */
export async function createOrUpdateEvent(params: CreateOrUpdateEventParams): Promise<string | null> {
  if (!isEnabled()) {
    return null;
  }

  const calendar = getCalendarClient();
  const calendarId = getCalendarId();
  const requestBody = buildEventBody(params);

  if (params.existingEventId) {
    const response = await calendar.events.update({
      calendarId,
      eventId: params.existingEventId,
      requestBody,
    });
    return response.data.id ?? params.existingEventId;
  }

  const response = await calendar.events.insert({ calendarId, requestBody });
  return response.data.id ?? null;
}

/** Supprime un événement Google Agenda. No-op si la synchronisation est désactivée ou si l'id est absent. */
export async function deleteEvent(googleEventId: string | null): Promise<void> {
  if (!isEnabled() || !googleEventId) {
    return;
  }

  const calendar = getCalendarClient();
  await calendar.events.delete({ calendarId: getCalendarId(), eventId: googleEventId });
}
