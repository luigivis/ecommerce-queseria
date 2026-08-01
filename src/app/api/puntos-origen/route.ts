import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { toNumber } from "@/lib/decimal";

const schema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  activo: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const d = parsed.data;
  if (d.id) {
    const p = await prisma.puntoOrigen.update({ where: { id: d.id }, data: { nombre: d.nombre, lat: d.lat, lng: d.lng, activo: d.activo } });
    return NextResponse.json({ ...p, lat: toNumber(p.lat), lng: toNumber(p.lng) });
  }
  const p = await prisma.puntoOrigen.create({ data: { nombre: d.nombre, lat: d.lat, lng: d.lng, activo: d.activo } });
  return NextResponse.json({ ...p, lat: toNumber(p.lat), lng: toNumber(p.lng) });
}
