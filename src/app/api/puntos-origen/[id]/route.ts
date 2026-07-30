import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await prisma.puntoOrigen.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
