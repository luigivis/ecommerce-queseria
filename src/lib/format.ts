import { Prisma } from "@prisma/client";

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatPrice(value: Prisma.Decimal | number | null | undefined, moneda: string = "C$"): string {
  const n = typeof value === "number" ? value : (value?.toNumber() ?? 0);
  return `${moneda} ${n.toFixed(2)}`;
}