import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { toNumber } from "@/lib/decimal";

const schema = z.object({
  id: z.string().optional(),
  desdeKm: z.number().nonnegative(),
  hastaKm: z.number().positive(),
  costo: z.number().nonnegative(),
  orden: z.number().int().nonnegative().default(0),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const d = parsed.data;
  if (d.desdeKm >= d.hastaKm) return NextResponse.json({ error: "Desde debe ser menor que Hasta" }, { status: 400 });
  if (d.id) {
    const r = await prisma.rangoDelivery.update({ where: { id: d.id }, data: { desdeKm: d.desdeKm, hastaKm: d.hastaKm, costo: d.costo, orden: d.orden } });
    return NextResponse.json({
      ...r,
      desdeKm: toNumber(r.desdeKm),
      hastaKm: toNumber(r.hastaKm),
      costo: toNumber(r.costo),
    });
  }
  const r = await prisma.rangoDelivery.create({ data: { desdeKm: d.desdeKm, hastaKm: d.hastaKm, costo: d.costo, orden: d.orden } });
  return NextResponse.json({
    ...r,
    desdeKm: toNumber(r.desdeKm),
    hastaKm: toNumber(r.hastaKm),
    costo: toNumber(r.costo),
  });
}
