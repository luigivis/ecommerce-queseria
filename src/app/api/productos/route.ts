import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { slugify } from "@/lib/format";

export async function GET() {
  const productos = await prisma.producto.findMany({
    include: { categoria: true },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(productos);
}

const upsertSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(1),
  descripcion: z.string().min(1),
  precio: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  unidad: z.string().default("unidad"),
  categoriaId: z.string().min(1),
  imagenes: z.array(z.string()).default([]),
  activo: z.boolean().default(true),
  destacado: z.boolean().default(false),
  enPromocion: z.boolean().default(false),
  descuentoPct: z.number().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  let slug = slugify(d.nombre);
  const exists = await prisma.producto.findUnique({ where: { slug } });
  if (exists && exists.id !== d.id) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }
  if (d.id) {
    const updated = await prisma.producto.update({
      where: { id: d.id },
      data: {
        nombre: d.nombre,
        slug,
        descripcion: d.descripcion,
        precio: d.precio,
        stock: d.stock,
        unidad: d.unidad,
        categoriaId: d.categoriaId,
        imagenes: JSON.stringify(d.imagenes),
        activo: d.activo,
        destacado: d.destacado,
        enPromocion: d.enPromocion,
        descuentoPct: d.enPromocion ? d.descuentoPct ?? null : null,
      },
    });
    return NextResponse.json(updated);
  }
  const created = await prisma.producto.create({
    data: {
      nombre: d.nombre,
      slug,
      descripcion: d.descripcion,
      precio: d.precio,
      stock: d.stock,
      unidad: d.unidad,
      categoriaId: d.categoriaId,
      imagenes: JSON.stringify(d.imagenes),
      activo: d.activo,
      destacado: d.destacado,
      enPromocion: d.enPromocion,
      descuentoPct: d.enPromocion ? d.descuentoPct ?? null : null,
    },
  });
  return NextResponse.json(created);
}
