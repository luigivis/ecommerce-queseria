import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const [productos, categorias] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, select: { slug: true, updatedAt: true } }),
    prisma.categoria.findMany({ select: { slug: true } }),
  ]);
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/productos`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...categorias.map((c) => ({
      url: `${base}/productos?categoria=${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...productos.map((p) => ({
      url: `${base}/productos/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
