import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1),
  role: z.enum(["ADMIN", "OPERADOR", "VENDEDOR"]),
  password: z.string().min(8),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  const usuarios = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, nombre: true, role: true, activo: true, createdAt: true },
  });
  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });
  }

  const hash = await bcrypt.hash(parsed.data.password, 10);
  const created = await prisma.user.create({
    data: {
      email: parsed.data.email,
      nombre: parsed.data.nombre,
      role: parsed.data.role,
      passwordHash: hash,
      activo: true,
    },
    select: { id: true, email: true, nombre: true, role: true, activo: true, createdAt: true },
  });
  return NextResponse.json(created, { status: 201 });
}
