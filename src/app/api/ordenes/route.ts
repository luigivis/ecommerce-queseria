import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getConfiguracion } from "@/lib/site";
import { buildWhatsappUrl, renderPlantilla, type WhatsappVars } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/format";

const itemSchema = z.object({
  productoId: z.string(),
  slug: z.string(),
  nombre: z.string(),
  precio: z.number().nonnegative(),
  cantidad: z.number().int().positive(),
  unidad: z.string().optional(),
});

const ordenSchema = z.object({
  tipo: z.enum(["COMPRAR", "COTIZAR"]),
  items: z.array(itemSchema).min(1),
  subtotal: z.number().nonnegative(),
  costoDelivery: z.number().nonnegative().default(0),
  distanciaKm: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  cliente: z.object({
    nombre: z.string().min(1),
    telefono: z.string().min(1),
    email: z.string().optional().or(z.literal("")),
  }),
  ubicacion: z.object({
    lat: z.number(),
    lng: z.number(),
    direccion: z.string().min(1),
    referencias: z.string().optional(),
  }),
  notas: z.string().optional(),
  puntoOrigenId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ordenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const lastNumero = await prisma.orden.findFirst({
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    const numero = (lastNumero?.numero ?? 0) + 1;

    const orden = await prisma.orden.create({
      data: {
        numero,
        tipo: data.tipo,
        estado: "PENDIENTE",
        items: JSON.stringify(data.items),
        subtotal: data.subtotal,
        costoDelivery: data.costoDelivery,
        distanciaKm: data.distanciaKm,
        total: data.total,
        cliente: JSON.stringify(data.cliente),
        ubicacion: JSON.stringify(data.ubicacion),
        notas: data.notas ?? null,
        puntoOrigenId: data.puntoOrigenId ?? null,
      },
    });

    const cfg = await getConfiguracion();
    const plantilla =
      data.tipo === "COMPRAR" ? cfg.plantillaComprar : cfg.plantillaCotizar;
    const productosTexto = data.items
      .map(
        (it) =>
          `• ${it.cantidad} x ${it.nombre} — ${formatPrice(it.precio * it.cantidad, cfg.moneda)}`,
      )
      .join("\n");
    const vars: WhatsappVars = {
      nombre: data.cliente.nombre,
      telefono: data.cliente.telefono,
      email: data.cliente.email,
      direccion: data.ubicacion.direccion,
      referencias: data.ubicacion.referencias,
      notas: data.notas,
      productos: productosTexto,
      subtotal: formatPrice(data.subtotal, cfg.moneda),
      delivery: formatPrice(data.costoDelivery, cfg.moneda),
      total: formatPrice(data.total, cfg.moneda),
      numero_orden: `#${numero}`,
    };
    const texto = renderPlantilla(plantilla, vars);
    const whatsappUrl = buildWhatsappUrl(cfg.telefonoWhatsapp, texto);

    return NextResponse.json({ ordenId: orden.id, numero, whatsappUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
