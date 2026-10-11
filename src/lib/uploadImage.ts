// Envoi d'une image depuis le back-office (code navigateur uniquement).
//
// L'hébergeur refuse les requêtes de plus de ~4,5 Mo : une photo de
// téléphone passe rarement. On la réduit donc AVANT l'envoi (2400 px max sur
// le grand côté, WebP) — sans jamais la rogner — et on transforme toute
// erreur en message lisible plutôt qu'un échec silencieux.

type DossierImage = "visites" | "site" | "carrousel" | "produits";

const COTE_MAX = 2400;
const SEUIL_SANS_REDUCTION = 1.5 * 1024 * 1024;
const TAILLE_MAX_ENVOI = 4 * 1024 * 1024;
const TYPES_INTACTS = new Set(["image/svg+xml", "image/gif"]);

async function reduire(fichier: File): Promise<File> {
  if (!fichier.type.startsWith("image/") || TYPES_INTACTS.has(fichier.type)) return fichier;
  try {
    const bitmap = await createImageBitmap(fichier);
    const echelle = Math.min(1, COTE_MAX / Math.max(bitmap.width, bitmap.height));
    if (echelle === 1 && fichier.size <= SEUIL_SANS_REDUCTION) {
      bitmap.close();
      return fichier;
    }
    const largeur = Math.round(bitmap.width * echelle);
    const hauteur = Math.round(bitmap.height * echelle);
    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;
    const contexte = canvas.getContext("2d");
    if (!contexte) {
      bitmap.close();
      return fichier;
    }
    contexte.drawImage(bitmap, 0, 0, largeur, hauteur);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob || blob.type !== "image/webp" || blob.size >= fichier.size) return fichier;
    return new File([blob], `${fichier.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } catch {
    return fichier;
  }
}

export async function uploadImage(fichier: File, dossier: DossierImage): Promise<string> {
  const prepare = await reduire(fichier);
  if (prepare.size > TAILLE_MAX_ENVOI) {
    throw new Error("Cette image est trop lourde (4 Mo maximum). Essayez avec une image plus petite.");
  }

  const formData = new FormData();
  formData.append("file", prepare);
  formData.append("folder", dossier);

  let res: Response;
  try {
    res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  } catch {
    throw new Error("Impossible d'envoyer l'image : vérifiez votre connexion.");
  }

  let body: { url?: string; error?: string } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok || !body?.url) {
    if (typeof body?.error === "string") throw new Error(body.error);
    if (res.status === 413) throw new Error("Cette image est trop lourde pour être envoyée.");
    if (res.status === 401) throw new Error("Session expirée : reconnectez-vous puis réessayez.");
    throw new Error("Échec de l'envoi de l'image.");
  }
  return body.url;
}
