import { prisma } from "@/lib/db";
import { ProductosClient } from "@/components/backoffice/ProductosClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Productos" };

export default async function ProductosPage() {
  const [productos, categorias] = await Promise.all([
    prisma.producto.findMany({
      include: { categoria: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.categoria.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  return (
    <div className="p-6 sm:p-8">
      <ProductosClient
        productos={productos.map((p) => ({
          ...p,
          imagenes: JSON.parse(p.imagenes || "[]"),
        }))}
        categorias={categorias}
      />
    </div>
  );
}
