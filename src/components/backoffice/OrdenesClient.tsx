"use client";

import { useState, useMemo } from "react";
import { formatPrice } from "@/lib/format";
import { Check, X, Trash2, ChevronDown, ChevronRight, MessageCircle, Phone, MapPin } from "lucide-react";

interface Orden {
  id: string;
  numero: number;
  tipo: string;
  estado: string;
  subtotal: number;
  costoDelivery: number;
  distanciaKm: number;
  total: number;
  items: { productoId: string; nombre: string; cantidad: number; precio: number }[];
  cliente: { nombre?: string; telefono?: string; email?: string };
  ubicacion: { lat?: number; lng?: number; direccion?: string; referencias?: string };
  notas: string | null;
  createdAt: string;
}

const estados = ["TODOS", "PENDIENTE", "CONFIRMADA", "EN_PREPARACION", "ENTREGADA", "CANCELADA"];

export function OrdenesClient({ ordenes, moneda }: { ordenes: Orden[]; moneda: string }) {
  const [items, setItems] = useState(ordenes);
  const [filter, setFilter] = useState("TODOS");
  const [tipo, setTipo] = useState("TODOS");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => items.filter((o) => {
    if (filter !== "TODOS" && o.estado !== filter) return false;
    if (tipo !== "TODOS" && o.tipo !== tipo) return false;
    return true;
  }), [items, filter, tipo]);

  async function cambiarEstado(id: string, estado: string) {
    setBusy(id);
    try {
      const r = await fetch(`/api/ordenes/${id}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (r.ok) {
        setItems((curr) => curr.map((o) => o.id === id ? { ...o, estado } : o));
      } else {
        const d = await r.json();
        alert(d.error || "Error");
      }
    } finally {
      setBusy(null);
    }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta orden definitivamente? El stock será devuelto si la orden estaba confirmada.")) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/ordenes/${id}`, { method: "DELETE" });
      if (r.ok) {
        setItems((curr) => curr.filter((o) => o.id !== id));
        if (expanded === id) setExpanded(null);
      } else {
        const d = await r.json();
        alert(d.error || "Error");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-display">Órdenes</h1>
        <p className="text-sm text-foreground/60">{items.length} en total — {items.filter(o => o.estado === "PENDIENTE").length} pendientes</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-auto">
          {estados.map((e) => <option key={e} value={e}>{e === "TODOS" ? "Todos los estados" : e.replace("_", " ")}</option>)}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input w-auto">
          <option value="TODOS">Todos los tipos</option>
          <option value="COMPRAR">Compra</option>
          <option value="COTIZAR">Cotización</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((o) => {
          const isOpen = expanded === o.id;
          return (
            <div key={o.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : o.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
              >
                {isOpen ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                <span className="font-bold">#{o.numero}</span>
                <span className="badge">{o.tipo}</span>
                <span className={`badge ${estadoColor(o.estado)}`}>{o.estado.replace("_", " ")}</span>
                <span className="ml-auto font-semibold">{formatPrice(o.total, moneda)}</span>
                <span className="text-xs text-foreground/60 hidden sm:inline">
                  {new Date(o.createdAt).toLocaleString("es-NI", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-border p-4 sm:p-5 bg-muted/30">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <h3 className="font-semibold mb-2">Cliente</h3>
                      <p className="text-sm">{o.cliente.nombre || "—"}</p>
                      {o.cliente.telefono && (
                        <p className="text-sm mt-1 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          <a href={`https://wa.me/${o.cliente.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {o.cliente.telefono}
                          </a>
                        </p>
                      )}
                      {o.cliente.email && <p className="text-sm text-foreground/60">{o.cliente.email}</p>}
                      {o.notas && (
                        <div className="mt-3 rounded-lg bg-background p-3 text-sm">
                          <strong className="block text-xs uppercase text-foreground/60 mb-1">Notas</strong>
                          {o.notas}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-1.5"><MapPin className="h-4 w-4" />Ubicación</h3>
                      <p className="text-sm">{o.ubicacion.direccion || "—"}</p>
                      {o.ubicacion.referencias && <p className="text-xs text-foreground/60">{o.ubicacion.referencias}</p>}
                      {o.ubicacion.lat && o.ubicacion.lng && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${o.ubicacion.lat}&mlon=${o.ubicacion.lng}#map=16/${o.ubicacion.lat}/${o.ubicacion.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-1 inline-block"
                        >
                          Ver en mapa ({o.ubicacion.lat.toFixed(4)}, {o.ubicacion.lng.toFixed(4)})
                        </a>
                      )}
                      <p className="text-xs text-foreground/60 mt-1">{o.distanciaKm.toFixed(1)} km</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Productos</h3>
                    <ul className="text-sm space-y-1">
                      {o.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span>{it.cantidad} × {it.nombre}</span>
                          <span className="font-medium">{formatPrice(it.cantidad * it.precio, moneda)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 pt-2 border-t border-border text-sm space-y-1">
                      <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(o.subtotal, moneda)}</span></div>
                      <div className="flex justify-between"><span>Envío</span><span>{formatPrice(o.costoDelivery, moneda)}</span></div>
                      <div className="flex justify-between font-bold pt-1 border-t border-border"><span>Total</span><span>{formatPrice(o.total, moneda)}</span></div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {o.estado === "PENDIENTE" && (
                      <>
                        <button onClick={() => cambiarEstado(o.id, "CONFIRMADA")} disabled={busy === o.id} className="btn-primary text-sm">
                          <Check className="h-4 w-4" /> Confirmar
                        </button>
                        <button onClick={() => cambiarEstado(o.id, "CANCELADA")} disabled={busy === o.id} className="btn-secondary text-sm">
                          <X className="h-4 w-4" /> Cancelar
                        </button>
                      </>
                    )}
                    {o.estado === "CONFIRMADA" && (
                      <button onClick={() => cambiarEstado(o.id, "EN_PREPARACION")} disabled={busy === o.id} className="btn-primary text-sm">
                        En preparación
                      </button>
                    )}
                    {o.estado === "EN_PREPARACION" && (
                      <button onClick={() => cambiarEstado(o.id, "ENTREGADA")} disabled={busy === o.id} className="btn-primary text-sm">
                        Marcar entregada
                      </button>
                    )}
                    {(o.estado === "CANCELADA" || o.estado === "ENTREGADA") && (
                      <button onClick={() => cambiarEstado(o.id, "PENDIENTE")} disabled={busy === o.id} className="btn-secondary text-sm">
                        Reabrir como pendiente
                      </button>
                    )}
                    {o.cliente.telefono && (
                      <a
                        href={`https://wa.me/${o.cliente.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${o.cliente.nombre || ""}, te contactamos por tu orden #${o.numero}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm"
                      >
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    )}
                    <button onClick={() => eliminar(o.id)} disabled={busy === o.id} className="btn-ghost text-destructive text-sm ml-auto">
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="card p-10 text-center text-foreground/60 text-sm">Sin órdenes con esos filtros.</div>
        )}
      </div>
    </div>
  );
}

function estadoColor(estado: string): string {
  const map: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-800",
    CONFIRMADA: "bg-blue-100 text-blue-800",
    EN_PREPARACION: "bg-purple-100 text-purple-800",
    ENTREGADA: "bg-green-100 text-green-800",
    CANCELADA: "bg-gray-200 text-gray-700",
  };
  return map[estado] || "";
}
