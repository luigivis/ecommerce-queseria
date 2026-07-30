import Link from "next/link";
import { prisma } from "@/lib/db";
import { getConfiguracion } from "@/lib/site";
import { ProductCard } from "@/components/storefront/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cfg = await getConfiguracion();
  const [destacados, categorias] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true, destacado: true },
      include: { categoria: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.categoria.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="container-page py-16 sm:py-24 grid gap-8 md:grid-cols-2 items-center">
          <div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.95]">
              {cfg.textoHero}
            </h1>
            <p className="mt-6 text-lg text-foreground/80 max-w-prose">
              {cfg.subtituloHero}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/productos" className="btn-primary">
                Ver productos
              </Link>
              <Link href="/productos?ofertas=1" className="btn-secondary">
                Ver ofertas
              </Link>
            </div>
          </div>
          {cfg.logoUrl ? (
            <div className="relative aspect-square max-w-md mx-auto w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cfg.logoUrl}
                alt={cfg.nombreSitio}
                className="h-full w-full rounded-3xl object-cover shadow-2xl"
              />
            </div>
          ) : (
            <div className="hidden md:flex aspect-square max-w-md mx-auto w-full items-center justify-center rounded-3xl bg-muted">
              <span className="text-9xl font-display text-primary/30">Q</span>
            </div>
          )}
        </div>
      </section>

      {categorias.length > 0 && (
        <section className="container-page py-10">
          <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
            Categorías
          </h2>
          <div className="flex flex-wrap gap-2">
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/productos?categoria=${c.slug}`}
                className="badge hover:bg-primary hover:text-on-primary transition-colors"
              >
                {c.nombre}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-page py-10">
        <h2 className="text-3xl sm:text-4xl font-bold font-display mb-6">
          {cfg.textoDestacados}
        </h2>
        {destacados.length === 0 ? (
          <p className="text-foreground/60">
            Aún no hay productos destacados. Configúralos desde el backoffice.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {destacados.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </div>
        )}
      </section>

      <section className="container-page py-10">
        <div className="card p-6 sm:p-10 bg-gradient-to-br from-primary to-secondary text-on-primary">
          <h2 className="text-4xl sm:text-5xl font-bold font-display">
            ¿Te interesa algo que no ves?
          </h2>
          <p className="mt-3 max-w-prose opacity-90">
            Cotiza sin compromiso. Te contactaremos por WhatsApp para confirmar disponibilidad y precio.
          </p>
          <Link
            href="/productos"
            className="mt-6 inline-flex bg-background text-foreground btn hover:opacity-90"
          >
            Explorar catálogo
          </Link>
        </div>
      </section>
    </>
  );
}
