import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Generic image upload endpoint shared by every admin form that needs to
// store a picture (Visite banner, SiteSettings header/background, ...).
// Kept deliberately generic (folder + file in, { url } out) so unrelated
// admin screens built in parallel can reuse it without changes here.

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // ~5MB
const ALLOWED_FOLDERS = new Set(["visites", "site"]);

function extensionForMimeType(mimeType: string): string | null {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    case "image/avif":
      return "avif";
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête multipart/form-data invalide." }, { status: 400 });
  }

  const file = formData.get("file");
  const folderRaw = formData.get("folder");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Champ 'file' manquant." }, { status: 400 });
  }
  if (typeof folderRaw !== "string" || !ALLOWED_FOLDERS.has(folderRaw)) {
    return NextResponse.json(
      { error: "Champ 'folder' invalide (attendu : 'visites' ou 'site')." },
      { status: 400 }
    );
  }
  const folder = folderRaw;

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Le fichier doit être une image." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "L'image dépasse la taille maximale de 5 Mo." }, { status: 400 });
  }

  const extension = extensionForMimeType(file.type);
  if (!extension) {
    return NextResponse.json({ error: "Type d'image non supporté." }, { status: 400 });
  }

  const filename = `${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${folder}/${filename}` });
}
