"use client";

import { X, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";

export function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const updateCantidad = useCart((s) => s.updateCantidad);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-foreground/50 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-2xl font-bold font-display">Tu carrito</h2>
          <button
            onClick={close}
            className="btn-ghost p-2"
            aria-label="Cerrar carrito"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-foreground/60">Tu carrito está vacío.</p>
            <Link
              href="/productos"
              onClick={close}
              className="btn-primary"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.map((item) => (
                <li key={item.productoId} className="flex gap-3 border-b border-border pb-4">
                  {item.imagen ? (
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                      <Image
                        src={item.imagen}
                        alt={item.nombre}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 flex-shrink-0 rounded-xl bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/productos/${item.slug}`}
                      onClick={close}
                      className="font-semibold hover:text-primary line-clamp-2"
                    >
                      {item.nombre}
                    </Link>
                    <p className="text-xs text-foreground/60">{item.unidad}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateCantidad(item.productoId, item.cantidad - 1)}
                          className="btn-ghost h-8 w-8 p-0"
                          aria-label="Restar cantidad"
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center font-medium">{item.cantidad}</span>
                        <button
                          onClick={() => updateCantidad(item.productoId, item.cantidad + 1)}
                          className="btn-ghost h-8 w-8 p-0"
                          aria-label="Sumar cantidad"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-bold text-primary">
                        {formatPrice(item.precio * item.cantidad)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(item.productoId)}
                    className="btn-ghost h-8 w-8 p-0 self-start"
                    aria-label={`Eliminar ${item.nombre}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-border px-5 py-4 space-y-3">
              <div className="flex justify-between text-base">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold text-lg">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-xs text-foreground/60">
                El envío se calcula en el siguiente paso.
              </p>
              <Link
                href="/checkout"
                onClick={close}
                className="btn-primary w-full"
              >
                Finalizar compra
              </Link>
              <div className="flex gap-2">
                <button onClick={clear} className="btn-ghost flex-1 text-sm">
                  Vaciar carrito
                </button>
                <button onClick={close} className="btn-secondary flex-1 text-sm">
                  Seguir comprando
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
