import { prisma } from "@/lib/db";
import { OrdenesClient } from "@/components/backoffice/OrdenesClient";
import { getConfiguracion } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Órdenes" };

export default async function OrdenesPage() {
  const [ordenes, cfg] = await Promise.all([
    prisma.orden.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    getConfiguracion(),
  ]);

  const ordenesNorm = ordenes.map((o) => ({
    id: o.id,
    numero: o.numero,
    tipo: o.tipo,
    estado: o.estado,
    subtotal: o.subtotal,
    costoDelivery: o.costoDelivery,
    distanciaKm: o.distanciaKm,
    total: o.total,
    items: JSON.parse(o.items || "[]") as Array<{ productoId: string; nombre: string; cantidad: number; precio: number }>,
    cliente: JSON.parse(o.cliente || "{}"),
    ubicacion: JSON.parse(o.ubicacion || "{}"),
    notas: o.notas,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 sm:p-8">
      <OrdenesClient ordenes={ordenesNorm} moneda={cfg.moneda} />
    </div>
  );
}
