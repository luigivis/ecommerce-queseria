import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    autenticado: !!session.userId,
    email: session.email ?? null,
  });
}

const updateSchema = z
  .object({
    nombre: z.string().min(1).optional(),
    email: z.string().email().optional(),
    passwordActual: z.string().min(1).optional(),
    passwordNuevo: z.string().min(8).optional(),
  })
  .refine(
    (data) => {
      if (data.passwordNuevo && !data.passwordActual) return false;
      return true;
    },
    { message: "passwordActual requerido para cambiar password", path: ["passwordActual"] }
  );

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const updateData: {
    nombre?: string;
    email?: string;
    passwordHash?: string;
  } = {};

  if (data.nombre) updateData.nombre = data.nombre;

  if (data.email && data.email !== session.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== session.userId) {
      return NextResponse.json(
        { error: "Email ya en uso" },
        { status: 400 }
      );
    }
    updateData.email = data.email;
  }

  if (data.passwordNuevo) {
    if (!data.passwordActual) {
      return NextResponse.json(
        { error: "passwordActual requerido" },
        { status: 400 }
      );
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    const ok = await bcrypt.compare(data.passwordActual, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 403 });
    }
    updateData.passwordHash = await bcrypt.hash(data.passwordNuevo, 10);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: updateData,
    select: { id: true, email: true, nombre: true, role: true },
  });

  if (data.email && data.email !== session.email) {
    session.email = data.email;
    await session.save();
  }

  return NextResponse.json(updated);
}