import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getConfiguracion } from "@/lib/site";
import { ProductDetail } from "@/components/storefront/ProductDetail";
import type { Metadata } from "next";
import { toNumber } from "@/lib/decimal";
import { toAbsoluteUrl, resolveOgImage } from "@/lib/url";

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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const ogImage = resolveOgImage(p.imagenes, cfg.logoUrl, baseUrl);
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
      images: [{ url: ogImage, alt: p.nombre }],
    },
    alternates: {
      canonical: `/productos/${p.slug}`,
    },
  };
}

export default async function ProductoPage({ params }: PageProps) {
  const productoRaw = await getProducto(params.slug);
  if (!productoRaw) notFound();
  const cfg = await getConfiguracion();
  const imgs: string[] = JSON.parse(productoRaw.imagenes || "[]");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const precioFinal =
    productoRaw.enPromocion && productoRaw.descuentoPct
      ? toNumber(productoRaw.precio) * (1 - toNumber(productoRaw.descuentoPct) / 100)
      : toNumber(productoRaw.precio);

  const producto = {
    ...productoRaw,
    precio: toNumber(productoRaw.precio),
    descuentoPct: productoRaw.descuentoPct === null ? null : toNumber(productoRaw.descuentoPct),
  };

  const fallbackImages = [
    toAbsoluteUrl(cfg.logoUrl, baseUrl) || `${baseUrl.replace(/\/$/, "")}/og-default.png`,
  ];
  const jsonLdImages = imgs.length > 0
    ? imgs.map((i) => toAbsoluteUrl(i, baseUrl)).filter(Boolean) as string[]
    : fallbackImages;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    description: producto.descripcion,
    image: jsonLdImages,
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
      url: `${baseUrl.replace(/\/$/, "")}/productos/${producto.slug}`,
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
