import { z } from "zod";

// Validates the public booking form (POST /api/reservations). Mirrors the
// coordonnées captured on the Reservation model, independent of any Client
// account.
export const reservationSchema = z
  .object({
    nomOuRaisonSociale: z.string().min(1, "Le nom ou la raison sociale est requis."),
    telephone: z.string().min(6, "Le numéro de téléphone est trop court."),
    email: z.string().email("Adresse e-mail invalide."),
    adressePostale: z.string().min(1, "L'adresse postale est requise."),
    nbAdultes: z
      .number()
      .int("Le nombre d'adultes doit être un entier.")
      .min(0, "Le nombre d'adultes ne peut pas être négatif."),
    nbEnfants: z
      .number()
      .int("Le nombre d'enfants doit être un entier.")
      .min(0, "Le nombre d'enfants ne peut pas être négatif."),
  })
  .refine((data) => data.nbAdultes + data.nbEnfants >= 1, {
    message: "Au moins une personne (adulte ou enfant) est requise.",
    path: ["nbAdultes"],
  });

export type ReservationInput = z.infer<typeof reservationSchema>;
