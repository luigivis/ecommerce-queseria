import { prisma } from "@/lib/db";
import { CategoriasClient } from "@/components/backoffice/CategoriasClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categorías" };

export default async function CategoriasPage() {
  const categorias = await prisma.categoria.findMany({
    include: { _count: { select: { productos: true } } },
    orderBy: { nombre: "asc" },
  });
  return (
    <div className="p-6 sm:p-8">
      <CategoriasClient categorias={categorias.map(c => ({ id: c.id, nombre: c.nombre, slug: c.slug, productos: c._count.productos }))} />
    </div>
  );
}
