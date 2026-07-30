import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/format";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const nombre = (body.nombre || "").trim();
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  let slug = slugify(nombre);
  const exists = await prisma.categoria.findUnique({ where: { slug } });
  if (exists && exists.id !== body.id) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  if (body.id) {
    const c = await prisma.categoria.update({ where: { id: body.id }, data: { nombre, slug } });
    return NextResponse.json(c);
  }
  const c = await prisma.categoria.create({ data: { nombre, slug } });
  return NextResponse.json(c);
}
