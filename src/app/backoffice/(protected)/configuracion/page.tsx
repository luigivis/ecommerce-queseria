import { getConfiguracion } from "@/lib/site";
import { ConfiguracionClient } from "@/components/backoffice/ConfiguracionClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const cfg = await getConfiguracion();
  return (
    <div className="p-6 sm:p-8">
      <ConfiguracionClient
        initial={{
          nombreSitio: cfg.nombreSitio,
          logoUrl: cfg.logoUrl,
          telefonoWhatsapp: cfg.telefonoWhatsapp,
          plantillaComprar: cfg.plantillaComprar,
          plantillaCotizar: cfg.plantillaCotizar,
          textoHero: cfg.textoHero,
          subtituloHero: cfg.subtituloHero,
          textoDestacados: cfg.textoDestacados,
          moneda: cfg.moneda,
          colores: cfg.colores,
          camposCliente: cfg.camposCliente,
        }}
      />
    </div>
  );
}
