"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  productoId: string;
  slug: string;
  nombre: string;
  precio: number;
  precioOriginal?: number;
  unidad: string;
  imagen?: string;
  cantidad: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  add: (item: Omit<CartItem, "cantidad"> & { cantidad?: number }) => void;
  remove: (productoId: string) => void;
  updateCantidad: (productoId: string, cantidad: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      add: (item) => {
        const items = [...get().items];
        const idx = items.findIndex((i) => i.productoId === item.productoId);
        if (idx >= 0) {
          items[idx] = { ...items[idx], cantidad: items[idx].cantidad + (item.cantidad ?? 1) };
        } else {
          items.push({ ...item, cantidad: item.cantidad ?? 1 });
        }
        set({ items, isOpen: true });
      },
      remove: (productoId) =>
        set((s) => ({ items: s.items.filter((i) => i.productoId !== productoId) })),
      updateCantidad: (productoId, cantidad) => {
        if (cantidad <= 0) {
          set((s) => ({ items: s.items.filter((i) => i.productoId !== productoId) }));
          return;
        }
        set((s) => ({
          items: s.items.map((i) =>
            i.productoId === productoId ? { ...i, cantidad } : i,
          ),
        }));
      },
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((acc, i) => acc + i.cantidad, 0),
      subtotal: () =>
        get().items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
    }),
    {
      name: "queseria-cart",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.sessionStorage : (undefined as unknown as Storage),
      ),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
