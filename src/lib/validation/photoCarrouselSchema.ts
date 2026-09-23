import { z } from "zod";

// Validates the admin CRUD form for a PhotoCarrousel (prisma/schema.prisma
// `PhotoCarrousel` model) — photos shown in the site-wide header slideshow.
// `legende` is nullable (not just optional) so the admin can explicitly
// clear a previously-set caption from the edit form — see blocContenuSchema
// for the full rationale (mirrors produitSchema).
export const photoCarrouselSchema = z.object({
  url: z.string().min(1, "L'image est requise."),
  legende: z.string().min(1, "La légende ne peut pas être vide.").nullable().optional(),
  ordre: z.number().int("L'ordre doit être un nombre entier."),
  actif: z.boolean(),
});

export type PhotoCarrouselInput = z.infer<typeof photoCarrouselSchema>;
