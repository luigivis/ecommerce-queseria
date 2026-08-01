import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { calcularContraPuntos } from "@/lib/delivery";
import { toNumber } from "@/lib/decimal";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
    }
    const [puntos, rangos] = await Promise.all([
      prisma.puntoOrigen.findMany(),
      prisma.rangoDelivery.findMany(),
    ]);
    const calc = calcularContraPuntos(
      { lat: parsed.data.lat, lng: parsed.data.lng },
      puntos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        lat: toNumber(p.lat),
        lng: toNumber(p.lng),
        activo: p.activo,
      })),
      rangos.map((r) => ({
        id: r.id,
        desdeKm: toNumber(r.desdeKm),
        hastaKm: toNumber(r.hastaKm),
        costo: toNumber(r.costo),
        orden: r.orden,
      })),
    );
    return NextResponse.json(calc);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
