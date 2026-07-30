import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getSession } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "Sin archivos" }, { status: 400 });

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const urls: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!file.type || !ALLOWED_TYPES.includes(file.type)) {
      errors.push(`${file.name || "archivo"}: tipo no permitido (${file.type || "desconocido"}). Usa JPG, PNG o WebP.`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      errors.push(`${file.name || "archivo"}: pesa ${mb} MB, máximo 10 MB.`);
      continue;
    }
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      const filepath = path.join(uploadsDir, name);
      await sharp(buf)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(filepath);
      urls.push(`/api/uploads/${name}`);
    } catch (e) {
      console.error("upload error", e);
      errors.push(`${file.name || "archivo"}: error al procesar la imagen.`);
    }
  }

  return NextResponse.json({ urls, errors });
}