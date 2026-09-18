import { z } from "zod";

// Validates the admin CRUD form for a Visite (prisma/schema.prisma `Visite`
// model). Monetary/percentage fields are plain numbers here — conversion to
// Prisma `Decimal` happens at the persistence boundary, not in this schema.
export const visiteSchema = z.object({
  nom: z.string().min(1, "Le nom est requis."),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Le slug doit être en kebab-case (lettres minuscules, chiffres et tirets)."
    ),
  description: z.string().min(1, "La description est requise."),
  imageBanniereUrl: z
    .string()
    .url("URL d'image invalide.")
    .optional(),
  visible: z.boolean(),
  tarifAdulte: z.number().positive("Le tarif adulte doit être positif."),
  tarifEnfant: z.number().positive("Le tarif enfant doit être positif."),
  majorationTardiveMontant: z
    .number()
    .min(0, "La majoration tardive ne peut pas être négative."),
  majorationTardiveDelaiHeures: z
    .number()
    .int("Le délai de majoration tardive doit être un entier.")
    .min(0, "Le délai de majoration tardive ne peut pas être négatif."),
  acomptePourcentage: z
    .number()
    .min(0, "Le pourcentage d'acompte doit être compris entre 0 et 100.")
    .max(100, "Le pourcentage d'acompte doit être compris entre 0 et 100."),
  acompteDelaiJours: z
    .number()
    .int("Le délai d'acompte doit être un entier.")
    .min(0, "Le délai d'acompte ne peut pas être négatif."),
});

export type VisiteInput = z.infer<typeof visiteSchema>;
