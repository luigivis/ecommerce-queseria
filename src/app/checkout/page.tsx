import { getConfiguracion } from "@/lib/site";
import { prisma } from "@/lib/db";
import { CheckoutClient } from "@/components/storefront/CheckoutClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const cfg = await getConfiguracion();
  const puntosActivos = await prisma.puntoOrigen.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, lat: true, lng: true },
  });
  const puntoPrincipal =
    puntosActivos[0] ?? { id: "default", nombre: "Quesería", lat: 12.1364, lng: -86.2704 };

  return (
    <CheckoutClient
      camposCliente={cfg.camposCliente}
      moneda={cfg.moneda}
      puntoInicial={{ lat: puntoPrincipal.lat, lng: puntoPrincipal.lng }}
    />
  );
}
