import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const count = await prisma.producto.count({ where: { categoriaId: params.id } });
  if (count > 0) return NextResponse.json({ error: "Tiene productos asociados" }, { status: 400 });
  await prisma.categoria.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
