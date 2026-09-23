import { z } from "zod";

// Validates the admin CRUD form for a BlocContenu (prisma/schema.prisma
// `BlocContenu` model) — free-form content blocks ("encarts", annonces...)
// the admin places on the public site without a developer. `titre` and
// `imageUrl` are nullable (not just optional) so the admin can explicitly
// clear a previously-set value from the edit form — mirrors produitSchema's
// approach: the API distinguishes "field omitted" (leave unchanged, used by
// PATCH's partial-update support) from "field sent as null" (clear it) by
// checking key presence on the raw request body, not on this parsed shape.
export const blocContenuSchema = z.object({
  type: z.enum(["TEXTE", "TEXTE_IMAGE", "ENCART"], {
    message: "Type de bloc invalide.",
  }),
  emplacement: z.enum(["ACCUEIL", "SITE_ENTIER"], {
    message: "Emplacement invalide.",
  }),
  titre: z.string().min(1, "Le titre ne peut pas être vide.").nullable().optional(),
  contenu: z.string().min(1, "Le contenu est requis."),
  imageUrl: z.string().min(1).nullable().optional(),
  ordre: z.number().int("L'ordre doit être un nombre entier."),
  actif: z.boolean(),
});

export type BlocContenuInput = z.infer<typeof blocContenuSchema>;
