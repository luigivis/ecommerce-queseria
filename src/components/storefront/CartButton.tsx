"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/store/cart";

export function CartButton() {
  const open = useCart((s) => s.open);
  const count = useCart((s) => s.count());

  return (
    <button
      onClick={open}
      className="btn-ghost relative p-2.5"
      aria-label={`Carrito de compras (${count} productos)`}
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary"
          aria-hidden="true"
        >
          {count}
        </span>
      )}
    </button>
  );
}
