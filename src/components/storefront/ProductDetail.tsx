"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingCart, Plus, Minus, ChevronLeft, Tag, Truck } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { toNumber } from "@/lib/decimal";
import type { Producto, Categoria } from "@prisma/client";

export function ProductDetail({
  producto,
  imagenes,
  moneda,
}: {
  producto: Producto & { categoria?: Categoria };
  imagenes: string[];
  moneda: string;
}) {
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const add = useCart((s) => s.add);

  const precioFinal =
    producto.enPromocion && producto.descuentoPct
      ? toNumber(producto.precio) * (1 - toNumber(producto.descuentoPct) / 100)
      : toNumber(producto.precio);

  function handleAdd() {
    add({
      productoId: producto.id,
      slug: producto.slug,
      nombre: producto.nombre,
      precio: precioFinal,
      precioOriginal: producto.enPromocion ? toNumber(producto.precio) : undefined,
      unidad: producto.unidad,
      imagen: imagenes[0],
      cantidad: qty,
    });
  }

  return (
    <div>
      <Link
        href="/productos"
        className="mb-6 inline-flex items-center gap-1 text-sm text-foreground/70 hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a productos
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
            {imagenes[imgIdx] ? (
              <Image
                src={imagenes[imgIdx]}
                alt={producto.nombre}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-foreground/30">
                Sin imagen
              </div>
            )}
            {producto.enPromocion && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1.5 text-sm font-bold text-on-primary">
                <Tag className="h-4 w-4" />
                -{toNumber(producto.descuentoPct)}% oferta
              </span>
            )}
          </div>
          {imagenes.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {imagenes.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-colors ${
                    imgIdx === i ? "border-primary" : "border-border"
                  }`}
                  aria-label={`Imagen ${i + 1}`}
                >
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm uppercase tracking-wider text-foreground/60">
            {producto.categoria?.nombre}
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-bold font-display">
            {producto.nombre}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              {formatPrice(precioFinal, moneda)}
            </span>
            {producto.enPromocion && producto.descuentoPct && (
              <span className="text-lg text-foreground/50 line-through">
                {formatPrice(toNumber(producto.precio), moneda)}
              </span>
            )}
            <span className="text-foreground/60">/ {producto.unidad}</span>
          </div>

          <p className="mt-6 text-base text-foreground/80 leading-relaxed whitespace-pre-line">
            {producto.descripcion}
          </p>

          <div className="mt-6 flex items-center gap-2 text-sm">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                producto.stock > 0 ? "bg-green-500" : "bg-destructive"
              }`}
              aria-hidden="true"
            />
            {producto.stock > 0 ? `${producto.stock} disponibles` : "Sin stock"}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="btn-ghost h-11 w-11 p-0 rounded-full"
                aria-label="Restar"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="btn-ghost h-11 w-11 p-0 rounded-full"
                aria-label="Sumar"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={producto.stock === 0}
              className="btn-primary flex-1"
            >
              <ShoppingCart className="h-5 w-5" />
              Agregar al carrito
            </button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="card p-4">
              <Truck className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-semibold">Entrega a domicilio</p>
              <p className="text-xs text-foreground/60">
                Calculamos el envío según tu ubicación al finalizar la compra.
              </p>
            </div>
            <div className="card p-4">
              <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
              </svg>
              <p className="mt-2 text-sm font-semibold">Paga por WhatsApp</p>
              <p className="text-xs text-foreground/60">
                Compra o cotiza y te contactamos para confirmar el pago.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
