"use client";

import { useState } from "react";
import { Prisma } from "@prisma/client";
import { Plus, Pencil, Trash2, X, MapPin } from "lucide-react";
import { toNumber } from "@/lib/decimal";

interface Punto { id: string; nombre: string; lat: Prisma.Decimal | number; lng: Prisma.Decimal | number; activo: boolean; }

export function PuntosOrigenClient({ puntos }: { puntos: Punto[] }) {
  const [items, setItems] = useState(puntos);
  const [editing, setEditing] = useState<Partial<Punto> | null>(null);

  async function save() {
    if (!editing || !editing.nombre?.trim()) return;
    const r = await fetch("/api/puntos-origen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!r.ok) { alert("Error"); return; }
    const saved = await r.json();
    setItems((curr) => {
      const idx = curr.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...curr]; next[idx] = saved; return next;
      }
      return [...curr, saved];
    });
    setEditing(null);
  }

  async function remove(p: Punto) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    const r = await fetch(`/api/puntos-origen/${p.id}`, { method: "DELETE" });
    if (r.ok) setItems((curr) => curr.filter((x) => x.id !== p.id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Puntos de origen</h1>
          <p className="text-sm text-foreground/60">
            {items.length} configurados — el envío se calcula desde el más cercano al cliente.
          </p>
        </div>
        <button
          onClick={() => setEditing({ nombre: "", lat: 12.1364, lng: -86.2704, activo: true })}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" /> Nuevo
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((p) => (
          <div key={p.id} className="card p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-semibold truncate">{p.nombre}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.activo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                {p.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="text-xs text-foreground/60">{toNumber(p.lat).toFixed(5)}, {toNumber(p.lng).toFixed(5)}</p>
            <div className="flex gap-1 mt-auto pt-2">
              <button
                onClick={() => setEditing({ ...p })}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted hover:text-primary transition-colors"
                aria-label="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(p)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-destructive hover:bg-destructive hover:text-on-primary transition-colors"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="card p-10 col-span-full text-center text-sm text-foreground/60">
            Aún no hay puntos. Crea uno para empezar a calcular envíos.
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing.id ? "Editar punto" : "Nuevo punto"}</h2>
              <button onClick={() => setEditing(null)} className="btn-ghost h-9 w-9 p-0"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={editing.nombre || ""} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} placeholder="Sucursal Centro" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Latitud</label>
                  <input type="number" step="any" className="input" value={editing.lat === undefined ? 0 : toNumber(editing.lat)} onChange={(e) => setEditing({ ...editing, lat: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="label">Longitud</label>
                  <input type="number" step="any" className="input" value={editing.lng === undefined ? 0 : toNumber(editing.lng)} onChange={(e) => setEditing({ ...editing, lng: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editing.activo ?? false} onChange={(e) => setEditing({ ...editing, activo: e.target.checked })} />
                <span className="text-sm">Activo</span>
              </label>
              <p className="text-xs text-foreground/60">
                Tip: abrí Google Maps o OpenStreetMap, hacé click derecho sobre el punto y copiá las coordenadas.
              </p>
            </div>
            <button onClick={save} className="btn-primary w-full mt-5">Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
}
