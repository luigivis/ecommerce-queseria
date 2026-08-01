import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toNumber } from "@/lib/decimal";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await prisma.producto.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const p = await prisma.producto.findUnique({ where: { id: params.id } });
  if (!p) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({
    ...p,
    precio: toNumber(p.precio),
    descuentoPct: p.descuentoPct === null ? null : toNumber(p.descuentoPct),
  });
}
