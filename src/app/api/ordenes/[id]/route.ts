import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orden = await prisma.orden.findUnique({ where: { id: params.id } });
  if (!orden) return NextResponse.json({ error: "Orden no existe" }, { status: 404 });

  // Devolver stock si estaba confirmada/en preparación
  if (orden.estado === "CONFIRMADA" || orden.estado === "EN_PREPARACION") {
    const items: { productoId: string; cantidad: number }[] = JSON.parse(orden.items || "[]");
    for (const it of items) {
      await prisma.producto.update({
        where: { id: it.productoId },
        data: { stock: { increment: it.cantidad } },
      });
      await prisma.movimientoStock.create({
        data: {
          productoId: it.productoId,
          tipo: "DEVOLUCION_ELIMINACION",
          cantidad: it.cantidad,
          referencia: `orden-${orden.numero}`,
        },
      });
    }
  }

  await prisma.orden.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
