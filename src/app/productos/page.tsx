import { prisma } from "@/lib/db";
import { CatalogoClient } from "@/components/storefront/CatalogoClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Productos",
  description: "Catálogo completo de quesos frescos, maduros y especiales. Compra online con entrega a domicilio en Nicaragua.",
};

interface PageProps {
  searchParams: {
    categoria?: string;
    ofertas?: string;
  };
}

export default async function ProductosPage({ searchParams }: PageProps) {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    include: { categoria: { select: { nombre: true, slug: true } } },
    orderBy: { nombre: "asc" },
  });

  const data = productos.map((p) => ({
    id: p.id,
    slug: p.slug,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: p.precio,
    unidad: p.unidad,
    imagenes: p.imagenes,
    enPromocion: p.enPromocion,
    descuentoPct: p.descuentoPct,
    destacado: p.destacado,
    categoriaId: p.categoriaId,
    categoriaNombre: p.categoria?.nombre ?? "",
    categoriaSlug: p.categoria?.slug ?? "",
  }));

  return (
    <CatalogoClient
      productos={data}
      categoriaInicial={searchParams.categoria ?? null}
      soloOfertasInicial={searchParams.ofertas === "1"}
    />
  );
}
