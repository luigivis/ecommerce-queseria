import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  nombreSitio: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
  telefonoWhatsapp: z.string().min(1),
  plantillaComprar: z.string(),
  plantillaCotizar: z.string(),
  textoHero: z.string(),
  subtituloHero: z.string(),
  textoDestacados: z.string(),
  moneda: z.string().min(1),
  colores: z.string(),
  camposCliente: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  await prisma.configuracion.update({ where: { id: 1 }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const cfg = await prisma.configuracion.findUnique({ where: { id: 1 } });
  return NextResponse.json(cfg);
}
