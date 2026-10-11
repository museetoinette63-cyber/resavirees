// Envoi d'une image depuis le back-office (code navigateur uniquement).
//
// L'hébergeur refuse les requêtes de plus de ~4,5 Mo : une photo de
// téléphone passe rarement. On la réduit donc AVANT l'envoi (2400 px max sur
// le grand côté, WebP) — sans jamais la rogner — et on transforme toute
// erreur en message lisible plutôt qu'un échec silencieux.

type DossierImage = "visites" | "site" | "carrousel" | "produits";

const COTE_MAX = 2400;
const COTE_MAX_LOGO = 600;
const SEUIL_SANS_REDUCTION = 1.5 * 1024 * 1024;
const TAILLE_MAX_ENVOI = 4 * 1024 * 1024;
const TYPES_INTACTS = new Set(["image/svg+xml", "image/gif"]);

async function reduire(fichier: File, logo: boolean): Promise<File> {
  if (!fichier.type.startsWith("image/") || TYPES_INTACTS.has(fichier.type)) return fichier;
  const coteMax = logo ? COTE_MAX_LOGO : COTE_MAX;
  const typeSortie = logo ? "image/png" : "image/webp";
  try {
    const bitmap = await createImageBitmap(fichier);
    const echelle = Math.min(1, coteMax / Math.max(bitmap.width, bitmap.height));
    // Un logo doit rester un PNG/JPG (les messageries n'affichent pas le WebP).
    const formatAdapte = !logo || fichier.type === "image/png" || fichier.type === "image/jpeg";
    if (echelle === 1 && fichier.size <= SEUIL_SANS_REDUCTION && formatAdapte) {
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
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, typeSortie, 0.9));
    if (!blob || blob.type !== typeSortie || (!logo && blob.size >= fichier.size)) return fichier;
    return new File([blob], `${fichier.name.replace(/\.[^.]+$/, "")}.${logo ? "png" : "webp"}`, {
      type: typeSortie,
    });
  } catch {
    return fichier;
  }
}

export async function uploadImage(
  fichier: File,
  dossier: DossierImage,
  options: { logo?: boolean } = {}
): Promise<string> {
  const logo = options.logo === true;
  if (logo && fichier.type === "image/svg+xml") {
    throw new Error("Pour un logo d'e-mail, utilisez une image PNG ou JPG (le SVG n'est pas affiché par les messageries).");
  }
  const prepare = await reduire(fichier, logo);
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
