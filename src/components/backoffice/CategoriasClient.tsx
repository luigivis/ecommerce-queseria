"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";

interface Categoria { id: string; nombre: string; slug: string; productos: number; }

export function CategoriasClient({ categorias }: { categorias: Categoria[] }) {
  const [items, setItems] = useState(categorias);
  const [editing, setEditing] = useState<{ id?: string; nombre: string } | null>(null);

  async function save() {
    if (!editing || !editing.nombre.trim()) return;
    const r = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!r.ok) { alert("Error"); return; }
    const saved = await r.json();
    setItems((curr) => {
      const idx = curr.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...curr];
        next[idx] = { ...next[idx], nombre: saved.nombre, slug: saved.slug };
        return next;
      }
      return [...curr, { id: saved.id, nombre: saved.nombre, slug: saved.slug, productos: 0 }];
    });
    setEditing(null);
  }

  async function remove(c: Categoria) {
    if (c.productos > 0) { alert(`No se puede eliminar: tiene ${c.productos} productos asociados.`); return; }
    if (!confirm(`¿Eliminar "${c.nombre}"?`)) return;
    const r = await fetch(`/api/categorias/${c.id}`, { method: "DELETE" });
    if (r.ok) setItems((curr) => curr.filter((x) => x.id !== c.id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Categorías</h1>
          <p className="text-sm text-foreground/60">{items.length} en total</p>
        </div>
        <button onClick={() => setEditing({ nombre: "" })} className="btn-primary">
          <Plus className="h-4 w-4" /> Nueva
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-foreground/70">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Productos</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{c.nombre}</td>
                <td className="px-4 py-3 text-foreground/60">{c.slug}</td>
                <td className="px-4 py-3">{c.productos}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditing({ id: c.id, nombre: c.nombre })}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted hover:text-primary transition-colors"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(c)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-destructive hover:bg-destructive hover:text-on-primary transition-colors"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing.id ? "Editar" : "Nueva"} categoría</h2>
              <button onClick={() => setEditing(null)} className="btn-ghost h-9 w-9 p-0"><X className="h-4 w-4" /></button>
            </div>
            <label className="label">Nombre</label>
            <input className="input" value={editing.nombre} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} />
            <button onClick={save} className="btn-primary w-full mt-4">Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
}
