import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/decimal";
import { PuntosOrigenClient } from "@/components/backoffice/PuntosOrigenClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Puntos de origen" };

export default async function PuntosOrigenPage() {
  const puntos = await prisma.puntoOrigen.findMany({ orderBy: { nombre: "asc" } });
  return (
    <div className="p-6 sm:p-8">
      <PuntosOrigenClient puntos={puntos.map(p => ({
        id: p.id,
        nombre: p.nombre,
        lat: toNumber(p.lat),
        lng: toNumber(p.lng),
        activo: p.activo,
      }))} />
    </div>
  );
}
