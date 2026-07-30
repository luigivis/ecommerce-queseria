import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

const MIME_BY_EXT: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  if (!params.path || params.path.length === 0) {
    return NextResponse.json({ error: "Sin archivo" }, { status: 400 });
  }
  const filename = params.path.join("/");
  if (filename.includes("..") || filename.startsWith("/")) {
    return NextResponse.json({ error: "Inválido" }, { status: 400 });
  }
  const filepath = path.join(UPLOADS_DIR, filename);
  try {
    const s = await stat(filepath);
    if (!s.isFile()) return NextResponse.json({ error: "No existe" }, { status: 404 });
    const buf = await readFile(filepath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "application/octet-stream";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(s.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }
}