import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({ password: z.string().min(8) });

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password mínimo 8 chars" }, { status: 400 });
  }

  const hash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: params.id },
    data: { passwordHash: hash },
  });
  return NextResponse.json({ ok: true });
}
