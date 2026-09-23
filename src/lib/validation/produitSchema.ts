import { z } from "zod";

// Validates the admin CRUD form for a Produit (prisma/schema.prisma
// `Produit` model) — the billable catalog consumed by DevisLigne/
// FactureLigne. `prixUnitaire` is a plain number here — conversion to
// Prisma `Decimal` happens at the persistence boundary, not in this schema
// (mirrors visiteSchema's tarifAdulte/tarifEnfant).
//
// `description`, `dureeMinutes` and `visiteId` are nullable (not just
// optional) so the admin can explicitly clear a previously-set value from
// the edit form — the API distinguishes "field omitted" (leave unchanged,
// used by PATCH's partial-update support) from "field sent as null" (clear
// it) by checking key presence on the raw request body, not on this parsed
// shape.
export const produitSchema = z.object({
  nom: z.string().min(1, "Le nom est requis."),
  description: z.string().min(1, "La description ne peut pas être vide.").nullable().optional(),
  prixUnitaire: z.number().positive("Le prix unitaire doit être positif."),
  dureeMinutes: z
    .number()
    .int("La durée doit être un nombre entier de minutes.")
    .positive("La durée doit être positive.")
    .nullable()
    .optional(),
  actif: z.boolean(),
  visiteId: z.string().min(1).nullable().optional(),
});

export type ProduitInput = z.infer<typeof produitSchema>;
