import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  estado: z.enum(["PENDIENTE", "CONFIRMADA", "EN_PREPARACION", "ENTREGADA", "CANCELADA"]),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  const orden = await prisma.orden.findUnique({ where: { id: params.id } });
  if (!orden) return NextResponse.json({ error: "Orden no existe" }, { status: 404 });

  const items: { productoId: string; cantidad: number }[] = JSON.parse(orden.items || "[]");
  const nuevo = parsed.data.estado;
  const anterior = orden.estado;

  // Manejo de stock
  const stockCambios: { productoId: string; cantidad: number; tipo: string }[] = [];

  if (anterior === "PENDIENTE" && nuevo === "CONFIRMADA") {
    // Verificar stock y descontar
    for (const it of items) {
      const p = await prisma.producto.findUnique({ where: { id: it.productoId } });
      if (!p) continue;
      if (p.stock < it.cantidad) {
        return NextResponse.json({
          error: `Stock insuficiente para "${p.nombre}". Disponible: ${p.stock}, pedido: ${it.cantidad}.`,
        }, { status: 400 });
      }
    }
    for (const it of items) {
      await prisma.producto.update({
        where: { id: it.productoId },
        data: { stock: { decrement: it.cantidad } },
      });
      stockCambios.push({ productoId: it.productoId, cantidad: it.cantidad, tipo: "DESCUENTO" });
    }
  }

  if (anterior === "CONFIRMADA" && (nuevo === "CANCELADA" || nuevo === "PENDIENTE")) {
    // Devolver stock
    for (const it of items) {
      await prisma.producto.update({
        where: { id: it.productoId },
        data: { stock: { increment: it.cantidad } },
      });
      stockCambios.push({ productoId: it.productoId, cantidad: it.cantidad, tipo: "DEVOLUCION" });
    }
  }

  await prisma.orden.update({ where: { id: params.id }, data: { estado: nuevo } });

  for (const c of stockCambios) {
    await prisma.movimientoStock.create({
      data: {
        productoId: c.productoId,
        tipo: c.tipo,
        cantidad: c.cantidad,
        referencia: `orden-${orden.numero}`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
