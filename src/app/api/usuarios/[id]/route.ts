import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "OPERADOR", "VENDEDOR"]).optional(),
  activo: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  if (params.id === session.userId) {
    return NextResponse.json({ error: "No podés editarte a vos mismo" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (parsed.data.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ error: "Email ya en uso" }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: parsed.data,
    select: { id: true, email: true, nombre: true, role: true, activo: true, createdAt: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  if (params.id === session.userId) {
    return NextResponse.json({ error: "No podés desactivarte a vos mismo" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { activo: false },
  });
  return NextResponse.json({ ok: true });
}
