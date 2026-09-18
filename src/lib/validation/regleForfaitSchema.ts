import { z } from "zod";

// Validates a RegleForfait (prisma/schema.prisma). The model stores both
// NIVEAU_1 (seuilAdultes/seuilEnfants) and NIVEAU_2 (seuilGlobal) fields as
// nullable columns, but the two levels are mutually exclusive at the
// business level — §4.2-§4.4 of the cahier des charges. A discriminated
// union on `niveau`, with each branch `.strict()`, enforces that invariant
// here instead of leaving it as "optional and unchecked".

const niveau1Schema = z.strictObject({
  niveau: z.literal("NIVEAU_1"),
  seuilAdultes: z
    .number()
    .int("Le seuil adultes doit être un entier.")
    .positive("Le seuil adultes doit être positif."),
  seuilEnfants: z
    .number()
    .int("Le seuil enfants doit être un entier.")
    .positive("Le seuil enfants doit être positif."),
  montant: z.number().positive("Le montant doit être positif."),
  actif: z.boolean(),
});

const niveau2Schema = z.strictObject({
  niveau: z.literal("NIVEAU_2"),
  seuilGlobal: z
    .number()
    .int("Le seuil global doit être un entier.")
    .positive("Le seuil global doit être positif."),
  montant: z.number().positive("Le montant doit être positif."),
  actif: z.boolean(),
});

export const regleForfaitSchema = z.discriminatedUnion("niveau", [
  niveau1Schema,
  niveau2Schema,
]);

export type RegleForfaitInput = z.infer<typeof regleForfaitSchema>;
