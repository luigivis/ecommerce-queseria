"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

interface Rango { id: string; desdeKm: number; hastaKm: number; costo: number; orden: number; }

export function DeliveryClient({ rangos }: { rangos: Rango[] }) {
  const [items, setItems] = useState(rangos);
  const [editing, setEditing] = useState<Partial<Rango> | null>(null);

  async function save() {
    if (!editing) return;
    const r = await fetch("/api/rangos-delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, orden: editing.orden ?? items.length + 1 }),
    });
    if (!r.ok) { alert("Error"); return; }
    const saved = await r.json();
    setItems((curr) => {
      const idx = curr.findIndex((x) => x.id === saved.id);
      if (idx >= 0) {
        const next = [...curr]; next[idx] = saved; return next;
      }
      return [...curr, saved];
    });
    setEditing(null);
  }

  async function remove(rango: Rango) {
    if (!confirm("¿Eliminar este rango?")) return;
    const r = await fetch(`/api/rangos-delivery/${rango.id}`, { method: "DELETE" });
    if (r.ok) setItems((curr) => curr.filter((x) => x.id !== rango.id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Rangos de delivery</h1>
          <p className="text-sm text-foreground/60">
            Define tramos por km. Si el cliente está fuera del último rango, se le ofrece cotizar.
          </p>
        </div>
        <button
          onClick={() => setEditing({
            desdeKm: 0, hastaKm: 5, costo: 30, orden: items.length + 1,
          })}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" /> Nuevo rango
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-foreground/70">
            <tr>
              <th className="px-4 py-3">Desde</th>
              <th className="px-4 py-3">Hasta</th>
              <th className="px-4 py-3">Costo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">{r.desdeKm} km</td>
                <td className="px-4 py-3">{r.hastaKm} km</td>
                <td className="px-4 py-3 font-semibold">C$ {r.costo.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditing({ ...r })}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted hover:text-primary transition-colors"
                    aria-label="Editar"
                  >
                    <PencilSimple />
                  </button>
                  <button
                    onClick={() => remove(r)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-destructive hover:bg-destructive hover:text-on-primary transition-colors"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-foreground/60">Sin rangos configurados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing.id ? "Editar rango" : "Nuevo rango"}</h2>
              <button onClick={() => setEditing(null)} className="btn-ghost h-9 w-9 p-0"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Desde (km)</label>
                <input type="number" step="0.1" className="input" value={editing.desdeKm ?? 0} onChange={(e) => setEditing({ ...editing, desdeKm: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">Hasta (km)</label>
                <input type="number" step="0.1" className="input" value={editing.hastaKm ?? 0} onChange={(e) => setEditing({ ...editing, hastaKm: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <label className="label">Costo (C$)</label>
                <input type="number" step="0.01" className="input" value={editing.costo ?? 0} onChange={(e) => setEditing({ ...editing, costo: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <button onClick={save} className="btn-primary w-full mt-5">Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PencilSimple() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    </svg>
  );
}
