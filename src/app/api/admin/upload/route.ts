import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Generic upload endpoint shared by every admin form that needs to store a
// file (Visite banner, SiteSettings header/background, carrousel photos,
// ambient sound, ...). Stored on Vercel Blob (public access) since the
// serverless filesystem is read-only in production.
// Kept deliberately generic (folder + file in, { url } out) so unrelated
// admin screens built in parallel can reuse it without changes here.

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // ~5MB
const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024; // ~15MB

const IMAGE_FOLDERS = new Set(["visites", "site", "carrousel"]);
const AUDIO_FOLDERS = new Set(["audio"]);

function extensionForImageMimeType(mimeType: string): string | null {
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

function extensionForAudioMimeType(mimeType: string): string | null {
  switch (mimeType) {
    case "audio/mpeg":
      return "mp3";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
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
  if (
    typeof folderRaw !== "string" ||
    (!IMAGE_FOLDERS.has(folderRaw) && !AUDIO_FOLDERS.has(folderRaw))
  ) {
    return NextResponse.json(
      { error: "Champ 'folder' invalide (attendu : 'visites', 'site', 'carrousel' ou 'audio')." },
      { status: 400 }
    );
  }
  const folder = folderRaw;
  const isAudioFolder = AUDIO_FOLDERS.has(folder);

  let extension: string | null;
  if (isAudioFolder) {
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json({ error: "Le fichier doit être un fichier audio." }, { status: 400 });
    }
    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json({ error: "Le fichier audio dépasse la taille maximale de 15 Mo." }, { status: 400 });
    }
    extension = extensionForAudioMimeType(file.type);
    if (!extension) {
      return NextResponse.json({ error: "Type audio non supporté (mp3, ogg ou wav)." }, { status: 400 });
    }
  } else {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit être une image." }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: "L'image dépasse la taille maximale de 5 Mo." }, { status: 400 });
    }
    extension = extensionForImageMimeType(file.type);
    if (!extension) {
      return NextResponse.json({ error: "Type d'image non supporté." }, { status: 400 });
    }
  }

  const filename = `${randomUUID()}.${extension}`;
  const blob = await put(`${folder}/${filename}`, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
