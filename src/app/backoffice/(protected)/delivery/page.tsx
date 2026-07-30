import { prisma } from "@/lib/db";
import { DeliveryClient } from "@/components/backoffice/DeliveryClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rangos de delivery" };

export default async function DeliveryPage() {
  const rangos = await prisma.rangoDelivery.findMany({ orderBy: { orden: "asc" } });
  return (
    <div className="p-6 sm:p-8">
      <DeliveryClient rangos={rangos.map(r => ({ id: r.id, desdeKm: r.desdeKm, hastaKm: r.hastaKm, costo: r.costo, orden: r.orden }))} />
    </div>
  );
}
