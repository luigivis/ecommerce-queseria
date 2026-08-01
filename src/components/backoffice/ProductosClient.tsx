"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Prisma } from "@prisma/client";
import { Plus, Pencil, Trash2, X, Upload, Star, Tag, Loader2, GripVertical } from "lucide-react";
import { toNumber } from "@/lib/decimal";

interface Categoria { id: string; nombre: string; slug: string; }
interface Producto {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  precio: Prisma.Decimal | number;
  stock: number;
  unidad: string;
  categoriaId: string;
  imagenes: string[];
  activo: boolean;
  destacado: boolean;
  enPromocion: boolean;
  descuentoPct: Prisma.Decimal | number | null;
}

type FormState = Omit<Producto, "id" | "slug"> & { id?: string };

const emptyForm: FormState = {
  nombre: "",
  descripcion: "",
  precio: 0,
  stock: 0,
  unidad: "unidad",
  categoriaId: "",
  imagenes: [],
  activo: true,
  destacado: false,
  enPromocion: false,
  descuentoPct: null,
};

export function ProductosClient({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: Categoria[];
}) {
  const [items, setItems] = useState<Producto[]>(productos);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [filter, setFilter] = useState("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const filtered = items.filter((p) => {
    if (catFilter && p.categoriaId !== catFilter) return false;
    if (filter && !`${p.nombre} ${p.descripcion}`.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  async function save() {
    if (!editing) return;
    const r = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!r.ok) {
      alert("Error al guardar");
      return;
    }
    const saved = await r.json();
    const norm: Producto = { ...saved, imagenes: JSON.parse(saved.imagenes || "[]") };
    setItems((curr) => {
      const idx = curr.findIndex((p) => p.id === norm.id);
      if (idx >= 0) {
        const next = [...curr];
        next[idx] = norm;
        return next;
      }
      return [...curr, norm];
    });
    setEditing(null);
  }

  async function remove(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    const r = await fetch(`/api/productos/${p.id}`, { method: "DELETE" });
    if (r.ok) setItems((curr) => curr.filter((x) => x.id !== p.id));
  }

  async function uploadFiles(files: FileList) {
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("files", f);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (data.urls?.length && editing) {
        setEditing({ ...editing, imagenes: [...editing.imagenes, ...data.urls] });
      }
      if (data.errors?.length) {
        setUploadError(data.errors.join("\n"));
      } else if (!data.urls?.length) {
        setUploadError("No se subió ninguna imagen.");
      }
    } catch {
      setUploadError("Error de red al subir.");
    } finally {
      setUploading(false);
    }
  }

  function moveImage(idx: number, dir: -1 | 1) {
    if (!editing) return;
    const next = [...editing.imagenes];
    const ni = idx + dir;
    if (ni < 0 || ni >= next.length) return;
    [next[idx], next[ni]] = [next[ni], next[idx]];
    setEditing({ ...editing, imagenes: next });
  }

  function removeImage(idx: number) {
    if (!editing) return;
    setEditing({ ...editing, imagenes: editing.imagenes.filter((_, i) => i !== idx) });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-display">Productos</h1>
          <p className="text-sm text-foreground/60">{items.length} en total</p>
        </div>
        <button
          onClick={() => setEditing({ ...emptyForm, categoriaId: categorias[0]?.id ?? "" })}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por nombre o descripción..."
          className="input flex-1 min-w-[200px]"
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-foreground/70">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.imagenes[0] ? (
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <Image src={p.imagenes[0]} alt="" fill sizes="40px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.nombre}</div>
                        <div className="flex gap-1 mt-0.5">
                          {p.destacado && <span className="badge text-[10px] py-0.5"><Star className="h-3 w-3" />Destacado</span>}
                          {p.enPromocion && <span className="badge text-[10px] py-0.5 bg-destructive/10 text-destructive"><Tag className="h-3 w-3" />-{toNumber(p.descuentoPct)}%</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.categoriaId && categorias.find(c => c.id === p.categoriaId)?.nombre}</td>
                  <td className="px-4 py-3 font-semibold">C$ {toNumber(p.precio).toFixed(2)}</td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${p.activo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                      {p.activo ? "Activo" : "Oculto"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-foreground/60">No hay productos con esos filtros.</div>
          )}
        </div>
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Editar producto" : "Nuevo producto"}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={editing.nombre} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea className="input min-h-[100px] resize-y" value={editing.descripcion} onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label">Precio</label>
                <input type="number" step="0.01" className="input" value={toNumber(editing.precio)} onChange={(e) => setEditing({ ...editing, precio: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">Stock</label>
                <input type="number" className="input" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <label className="label">Unidad</label>
                <input className="input" value={editing.unidad} onChange={(e) => setEditing({ ...editing, unidad: e.target.value })} placeholder="libra, pote, etc." />
              </div>
            </div>
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={editing.categoriaId} onChange={(e) => setEditing({ ...editing, categoriaId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Imágenes</label>
              {uploadError && (
                <div className="mb-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive whitespace-pre-line">
                  {uploadError}
                </div>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                {editing.imagenes.map((src, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                    <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                    <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button onClick={() => moveImage(i, -1)} disabled={i === 0} className="text-on-primary text-xs p-1 disabled:opacity-40">←</button>
                      <button onClick={() => removeImage(i)} className="text-on-primary p-1"><X className="h-4 w-4" /></button>
                      <button onClick={() => moveImage(i, 1)} disabled={i === editing.imagenes.length - 1} className="text-on-primary text-xs p-1 disabled:opacity-40">→</button>
                    </div>
                    {i === 0 && <span className="absolute top-1 left-1 badge bg-primary text-on-primary text-[10px] py-0.5">Portada</span>}
                  </div>
                ))}
                <label className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted">
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                    <>
                      <Upload className="h-5 w-5 mb-1" />
                      <span className="text-xs">Subir</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                  />
                </label>
              </div>
              <p className="text-xs text-foreground/60">Máx 10 MB por imagen. La primera es la portada.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Toggle label="Activo" checked={editing.activo} onChange={(v) => setEditing({ ...editing, activo: v })} />
              <Toggle label="Destacado" checked={editing.destacado} onChange={(v) => setEditing({ ...editing, destacado: v })} />
              <Toggle label="En promoción" checked={editing.enPromocion} onChange={(v) => setEditing({ ...editing, enPromocion: v, descuentoPct: v ? editing.descuentoPct : null })} />
            </div>
            {editing.enPromocion && (
              <div>
                <label className="label">Descuento %</label>
                <input type="number" min="1" max="99" className="input" value={editing.descuentoPct === null ? "" : toNumber(editing.descuentoPct)} onChange={(e) => setEditing({ ...editing, descuentoPct: parseFloat(e.target.value) || null })} />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={save} className="btn-primary flex-1">Guardar</button>
              <button onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium ${checked ? "border-primary bg-primary/5 text-primary" : "border-border"}`}
    >
      <span>{label}</span>
      <span className={`flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-foreground/20"}`}>
        <span className={`h-4 w-4 rounded-full bg-background transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost h-9 w-9 p-0" aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
