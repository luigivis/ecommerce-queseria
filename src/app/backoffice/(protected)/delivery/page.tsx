import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/decimal";
import { DeliveryClient } from "@/components/backoffice/DeliveryClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rangos de delivery" };

export default async function DeliveryPage() {
  const rangos = await prisma.rangoDelivery.findMany({ orderBy: { orden: "asc" } });
  return (
    <div className="p-6 sm:p-8">
      <DeliveryClient rangos={rangos.map(r => ({
        id: r.id,
        desdeKm: toNumber(r.desdeKm),
        hastaKm: toNumber(r.hastaKm),
        costo: toNumber(r.costo),
        orden: r.orden,
      }))} />
    </div>
  );
}
