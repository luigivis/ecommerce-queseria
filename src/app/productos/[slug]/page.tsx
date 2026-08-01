import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getConfiguracion } from "@/lib/site";
import { ProductDetail } from "@/components/storefront/ProductDetail";
import type { Metadata } from "next";
import { toNumber } from "@/lib/decimal";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

async function getProducto(slug: string) {
  return prisma.producto.findUnique({
    where: { slug, activo: true },
    include: { categoria: true },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = await getProducto(params.slug);
  if (!p) return { title: "Producto no encontrado" };
  const cfg = await getConfiguracion();
  const imgs: string[] = JSON.parse(p.imagenes || "[]");
  const ogImage = imgs[0] || cfg.logoUrl || undefined;
const precioFinal =
    p.enPromocion && p.descuentoPct
      ? toNumber(p.precio) * (1 - toNumber(p.descuentoPct) / 100)
      : toNumber(p.precio);
  return {
    title: p.nombre,
    description: p.descripcion.slice(0, 160),
    openGraph: {
      title: p.nombre,
      description: p.descripcion.slice(0, 160),
      type: "website",
      images: ogImage ? [{ url: ogImage, alt: p.nombre }] : [],
    },
    alternates: {
      canonical: `/productos/${p.slug}`,
    },
  };
}

export default async function ProductoPage({ params }: PageProps) {
  const producto = await getProducto(params.slug);
  if (!producto) notFound();
  const cfg = await getConfiguracion();
  const imgs: string[] = JSON.parse(producto.imagenes || "[]");
  const precioFinal =
    producto.enPromocion && producto.descuentoPct
      ? toNumber(producto.precio) * (1 - toNumber(producto.descuentoPct) / 100)
      : toNumber(producto.precio);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    description: producto.descripcion,
    image: imgs,
    category: producto.categoria.nombre,
    brand: { "@type": "Brand", name: cfg.nombreSitio },
    offers: {
      "@type": "Offer",
      price: toNumber(precioFinal).toFixed(2),
      priceCurrency: "NIO",
      availability:
        producto.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/productos/${producto.slug}`,
      seller: { "@type": "Organization", name: cfg.nombreSitio },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container-page py-8">
        <ProductDetail producto={producto} imagenes={imgs} moneda={cfg.moneda} />
      </div>
    </>
  );
}
