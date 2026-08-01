import Image from "next/image";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Tag } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { toNumber } from "@/lib/decimal";

export interface ProductCardData {
  slug: string;
  nombre: string;
  precio: Prisma.Decimal | number;
  imagenes: string;
  enPromocion: boolean;
  descuentoPct: Prisma.Decimal | number | null;
  unidad: string;
}

export function ProductCard({ producto }: { producto: ProductCardData }) {
  let imgs: string[] = [];
  try {
    imgs = JSON.parse(producto.imagenes);
  } catch {
    imgs = [];
  }
  const img = imgs[0];

  const precioFinal =
    producto.enPromocion && producto.descuentoPct
      ? toNumber(producto.precio) * (1 - toNumber(producto.descuentoPct) / 100)
      : toNumber(producto.precio);

  return (
    <Link
      href={`/productos/${producto.slug}`}
      className="group card overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {img ? (
          <Image
            src={img}
            alt={producto.nombre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground/30">
            <span className="text-sm">Sin imagen</span>
          </div>
        )}
        {producto.enPromocion && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-on-primary">
            <Tag className="h-3 w-3" />
            -{toNumber(producto.descuentoPct)}%
          </span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {producto.nombre}
        </h3>
        <p className="text-xs text-foreground/60 mt-0.5">{producto.unidad}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">
            {formatPrice(precioFinal)}
          </span>
          {producto.enPromocion && producto.descuentoPct && (
            <span className="text-sm text-foreground/50 line-through">
              {formatPrice(toNumber(producto.precio))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
