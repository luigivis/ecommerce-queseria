"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, MessageCircle, ShoppingBag, Loader2 } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { parseCamposCliente, type CamposCliente } from "@/lib/config";
import { buildWhatsappUrl, renderPlantilla, type WhatsappVars } from "@/lib/whatsapp";

const MapPicker = dynamic(() => import("@/components/storefront/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-2xl bg-muted">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ),
});

interface Props {
  camposCliente: string;
  moneda: string;
  puntoInicial: { lat: number; lng: number };
}

interface DeliveryInfo {
  disponible: boolean;
  costo?: number;
  distanciaKm?: number;
  puntoOrigenNombre?: string;
  mensaje?: string;
}

export function CheckoutClient({ camposCliente, moneda, puntoInicial }: Props) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);

  const campos: CamposCliente = parseCamposCliente(camposCliente);
  const [datos, setDatos] = useState<Record<string, string>>({});
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [delivery, setDelivery] = useState<DeliveryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<null | "COMPRAR" | "COTIZAR">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) router.push("/productos");
  }, [items, router]);

  async function calcularDelivery() {
    if (!coords) {
      setError("Marca tu ubicación en el mapa primero.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/delivery/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
      });
      const data = await r.json();
      setDelivery(data);
    } catch {
      setError("Error al calcular el envío.");
    } finally {
      setLoading(false);
    }
  }

  function validar(): string | null {
    for (const [key, def] of Object.entries(campos)) {
      if (def.requerido && !(datos[key] || "").trim()) {
        return `Completa: ${def.label}`;
      }
    }
    if (!coords) return "Selecciona tu ubicación en el mapa.";
    if (datos.direccion && !datos.direccion.trim()) return "Escribe tu dirección.";
    return null;
  }

  async function submit(tipo: "COMPRAR" | "COTIZAR") {
    const err = validar();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(tipo);
    setError(null);
    const payload = {
      tipo,
      items: items.map((i) => ({
        productoId: i.productoId,
        slug: i.slug,
        nombre: i.nombre,
        precio: i.precio,
        cantidad: i.cantidad,
        unidad: i.unidad,
      })),
      subtotal,
      costoDelivery: delivery?.disponible ? delivery.costo ?? 0 : 0,
      distanciaKm: delivery?.distanciaKm ?? 0,
      total: subtotal + (delivery?.disponible ? delivery.costo ?? 0 : 0),
      cliente: {
        nombre: datos.nombre || "",
        telefono: datos.telefono || "",
        email: datos.email || "",
      },
      ubicacion: {
        lat: coords!.lat,
        lng: coords!.lng,
        direccion: datos.direccion || "",
        referencias: datos.referencias || "",
      },
      notas: datos.notas || "",
      puntoOrigenId: (delivery as any)?.puntoOrigenId,
    };

    try {
      const r = await fetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Error al crear la orden");
        return;
      }
      window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      clear();
      router.push(`/confirmacion/${data.ordenId}`);
    } catch {
      setError("Error de red");
    } finally {
      setSubmitting(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="container-page py-8">
      <Link
        href="/productos"
        className="mb-6 inline-flex items-center gap-1 text-sm text-foreground/70 hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Seguir comprando
      </Link>

      <h1 className="text-4xl sm:text-5xl font-bold font-display mb-6">
        Finalizar compra
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">Tus datos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(campos)
                .filter(([k]) => k !== "direccion" && k !== "referencias")
                .map(([key, def]) => {
                  const isTextarea = key === "notas";
                  return (
                    <div
                      key={key}
                      className={isTextarea ? "sm:col-span-2" : ""}
                    >
                      <label htmlFor={key} className="label">
                        {def.label}
                        {def.requerido && <span className="text-destructive"> *</span>}
                      </label>
                      {isTextarea ? (
                        <textarea
                          id={key}
                          rows={3}
                          value={datos[key] || ""}
                          onChange={(e) => setDatos({ ...datos, [key]: e.target.value })}
                          className="input resize-y"
                        />
                      ) : (
                        <input
                          id={key}
                          type={key === "email" ? "email" : key === "telefono" ? "tel" : "text"}
                          value={datos[key] || ""}
                          onChange={(e) => setDatos({ ...datos, [key]: e.target.value })}
                          className="input"
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Tu ubicación
            </h2>
            <p className="text-sm text-foreground/60 mb-4">
              Haz click en el mapa para marcar tu ubicación o escribe tu dirección abajo.
            </p>

            <MapPicker
              point={coords}
              initialCenter={puntoInicial}
              onSelect={setCoords}
            />

            {coords && (
              <p className="mt-2 text-xs text-foreground/60">
                Marcado: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="direccion" className="label">
                  Dirección escrita
                  <span className="text-destructive"> *</span>
                </label>
                <input
                  id="direccion"
                  type="text"
                  value={datos.direccion || ""}
                  onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
                  className="input"
                  placeholder="Calle, número, barrio..."
                />
              </div>
              <div>
                <label htmlFor="referencias" className="label">
                  Referencias (opcional)
                </label>
                <input
                  id="referencias"
                  type="text"
                  value={datos.referencias || ""}
                  onChange={(e) => setDatos({ ...datos, referencias: e.target.value })}
                  className="input"
                  placeholder="Casa color amarillo, portón negro..."
                />
              </div>
            </div>

            <button
              onClick={calcularDelivery}
              disabled={!coords || loading}
              className="btn-secondary mt-4"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Calcular envío
            </button>

            {delivery && (
              <div className="mt-4 rounded-xl border border-border bg-muted p-4">
                {delivery.disponible ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm">
                        Distancia: <strong>{delivery.distanciaKm?.toFixed(1)} km</strong>
                      </p>
                      <p className="text-xs text-foreground/60">
                        Desde: {delivery.puntoOrigenNombre}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(delivery.costo ?? 0, moneda)}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/70">{delivery.mensaje}</p>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
          <div className="card p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">Resumen</h2>
            <ul className="space-y-3 mb-4">
              {items.map((it) => (
                <li key={it.productoId} className="flex gap-3 text-sm">
                  {it.imagen && (
                    <div className="relative h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      <Image src={it.imagen} alt="" fill sizes="48px" className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1 font-medium">{it.nombre}</p>
                    <p className="text-foreground/60 text-xs">{it.cantidad} x {formatPrice(it.precio, moneda)}</p>
                  </div>
                  <span className="font-semibold">{formatPrice(it.precio * it.cantidad, moneda)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-border pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal, moneda)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span>{delivery?.disponible ? formatPrice(delivery.costo ?? 0, moneda) : "—"}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-primary">
                  {formatPrice(subtotal + (delivery?.disponible ? delivery.costo ?? 0 : 0), moneda)}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <button
              onClick={() => submit("COMPRAR")}
              disabled={submitting !== null}
              className="btn-primary"
            >
              {submitting === "COMPRAR" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
              Comprar
            </button>
            <button
              onClick={() => submit("COTIZAR")}
              disabled={submitting !== null}
              className="btn-secondary"
            >
              {submitting === "COTIZAR" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              Cotizar
            </button>
          </div>
          <p className="text-xs text-foreground/60 text-center">
            Al continuar se abrirá WhatsApp con el detalle y crearemos tu orden en nuestro sistema.
          </p>
        </aside>
      </div>
    </div>
  );
}
