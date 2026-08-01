"use client";

import { useMemo, useState } from "react";
import { Prisma } from "@prisma/client";
import { Search, X, Tag } from "lucide-react";
import { ProductCard } from "./ProductCard";

export interface CatalogoProducto {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  precio: Prisma.Decimal | number;
  unidad: string;
  imagenes: string;
  enPromocion: boolean;
  descuentoPct: Prisma.Decimal | number | null;
  destacado: boolean;
  categoriaId: string;
  categoriaNombre: string;
  categoriaSlug: string;
}

interface Props {
  productos: CatalogoProducto[];
  categoriaInicial: string | null;
  soloOfertasInicial: boolean;
}

export function CatalogoClient({ productos, categoriaInicial, soloOfertasInicial }: Props) {
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<string | null>(categoriaInicial);
  const [soloOfertas, setSoloOfertas] = useState(soloOfertasInicial);

  const categorias = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of productos) {
      if (!map.has(p.categoriaId)) map.set(p.categoriaId, p.categoriaNombre);
    }
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return productos.filter((p) => {
      if (categoria && p.categoriaId !== categoria) return false;
      if (soloOfertas && !p.enPromocion) return false;
      if (q) {
        const haystack = `${p.nombre} ${p.descripcion} ${p.categoriaNombre}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [productos, query, categoria, soloOfertas]);

  const titulo = soloOfertas
    ? "Ofertas"
    : categoria
      ? categorias.find((c) => c.id === categoria)?.nombre ?? "Productos"
      : "Todos los productos";

  const hayFiltros = query.length > 0 || categoria !== null || soloOfertas;

  function limpiarFiltros() {
    setQuery("");
    setCategoria(null);
    setSoloOfertas(false);
  }

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-4xl sm:text-5xl font-bold font-display">{titulo}</h1>
        <p className="mt-2 text-foreground/70">
          {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
          {hayFiltros && productos.length !== filtered.length && (
            <span className="text-foreground/50"> de {productos.length}</span>
          )}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6">
          <div className="relative">
            <label htmlFor="search" className="sr-only">Buscar productos</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
            <input
              id="search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar queso, cuajada..."
              className="input"
              style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-foreground/10"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4 text-foreground/60" />
              </button>
            )}
          </div>

          <nav aria-label="Categorías" className="space-y-1">
            <button
              type="button"
              onClick={() => setCategoria(null)}
              className={`w-full text-left rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                !categoria && !soloOfertas ? "bg-primary text-on-primary" : "hover:bg-muted"
              }`}
            >
              Todas
            </button>
            {categorias.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoria(c.id)}
                className={`w-full text-left rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  categoria === c.id ? "bg-primary text-on-primary" : "hover:bg-muted"
                }`}
              >
                {c.nombre}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSoloOfertas(!soloOfertas)}
              className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                soloOfertas ? "bg-destructive text-on-primary" : "hover:bg-muted"
              }`}
            >
              <Tag className="h-4 w-4" />
              Solo ofertas
            </button>
          </nav>

          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-sm text-foreground/60 hover:text-primary underline"
            >
              Limpiar filtros
            </button>
          )}
        </aside>

        <div>
          {filtered.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-foreground/60">No encontramos productos con esos filtros.</p>
              <button onClick={limpiarFiltros} className="btn-secondary mt-4">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filtered.map((p) => (
                <ProductCard key={p.id} producto={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
