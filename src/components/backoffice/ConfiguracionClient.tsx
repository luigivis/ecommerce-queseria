"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Upload, Eye } from "lucide-react";
import { coloresToCssVars, parseColores, coloresDefault, type ConfigColores } from "@/lib/config";

interface Initial {
  nombreSitio: string;
  logoUrl: string | null;
  telefonoWhatsapp: string;
  plantillaComprar: string;
  plantillaCotizar: string;
  textoHero: string;
  subtituloHero: string;
  textoDestacados: string;
  moneda: string;
  colores: string;
  camposCliente: string;
}

const colorFields: { key: keyof ConfigColores; label: string; defaultHex: string }[] = [
  { key: "primary", label: "Primario", defaultHex: "#ea580c" },
  { key: "secondary", label: "Secundario", defaultHex: "#f97316" },
  { key: "accent", label: "Acento", defaultHex: "#2563eb" },
  { key: "background", label: "Fondo", defaultHex: "#fff7ed" },
  { key: "foreground", label: "Texto", defaultHex: "#0f172a" },
  { key: "muted", label: "Suave", defaultHex: "#fdf4f0" },
  { key: "border", label: "Borde", defaultHex: "#fceae1" },
  { key: "destructive", label: "Error/oferta", defaultHex: "#dc2626" },
  { key: "onPrimary", label: "Texto sobre primario", defaultHex: "#ffffff" },
];

const placeholders = [
  "{{nombre}}", "{{telefono}}", "{{email}}", "{{direccion}}",
  "{{referencias}}", "{{notas}}", "{{productos}}", "{{subtotal}}",
  "{{delivery}}", "{{total}}", "{{numero_orden}}",
];

export function ConfiguracionClient({ initial }: { initial: Initial }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const colores = parseColores(form.colores);

  useEffect(() => {
    const style = document.documentElement.style;
    const vars = coloresToCssVars(colores);
    for (const [k, v] of Object.entries(vars)) {
      style.setProperty(k, v);
    }
  }, [colores]);

  function updateColor(key: keyof ConfigColores, hex: string) {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    setForm({
      ...form,
      colores: JSON.stringify({ ...colores, [key]: rgb }),
    });
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const r = await fetch("/api/configuracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) setSaved(true);
      else alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setLogoError(null);
    const fd = new FormData();
    fd.append("files", file);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (data.urls?.[0]) setForm({ ...form, logoUrl: data.urls[0] });
      if (data.errors?.length) setLogoError(data.errors.join("\n"));
      else if (!data.urls?.[0]) setLogoError("No se pudo subir el logo.");
    } catch {
      setLogoError("Error de red al subir.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-display">Configuración</h1>
        <div className="flex gap-2">
          <a href="/" target="_blank" className="btn-secondary"><Eye className="h-4 w-4" /> Ver tienda</a>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </div>
      {saved && <div className="mb-4 rounded-xl bg-green-100 text-green-800 p-3 text-sm">Guardado.</div>}

      <Section title="Identidad del sitio">
        <Field label="Nombre del sitio">
          <input className="input" value={form.nombreSitio} onChange={(e) => setForm({ ...form, nombreSitio: e.target.value })} />
        </Field>
        <Field label="Logo">
          {logoError && (
            <div className="mb-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive whitespace-pre-line">
              {logoError}
            </div>
          )}
          <div className="flex items-center gap-4">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl} alt="Logo" className="h-16 w-16 rounded-full object-cover border border-border" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-foreground/40">—</div>
            )}
            <label className="btn-secondary cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Subir imagen
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </label>
            {form.logoUrl && (
              <button onClick={() => setForm({ ...form, logoUrl: null })} className="btn-ghost text-destructive">Quitar</button>
            )}
          </div>
        </Field>
        <Field label="Moneda">
          <input className="input w-32" value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} />
        </Field>
      </Section>

      <Section title="WhatsApp">
        <Field label="Número (formato internacional, sin +)">
          <input className="input" value={form.telefonoWhatsapp} onChange={(e) => setForm({ ...form, telefonoWhatsapp: e.target.value })} placeholder="50588888888" />
          <p className="mt-1 text-xs text-foreground/60">Ej: Nicaragua 505 + número sin espacios.</p>
        </Field>
        <Field label="Plantilla mensaje: Comprar">
          <textarea
            className="input min-h-[140px] resize-y font-mono text-xs"
            value={form.plantillaComprar}
            onChange={(e) => setForm({ ...form, plantillaComprar: e.target.value })}
          />
        </Field>
        <Field label="Plantilla mensaje: Cotizar">
          <textarea
            className="input min-h-[140px] resize-y font-mono text-xs"
            value={form.plantillaCotizar}
            onChange={(e) => setForm({ ...form, plantillaCotizar: e.target.value })}
          />
        </Field>
        <div>
          <p className="text-xs font-medium mb-2 text-foreground/70">Placeholders disponibles (hacé click para copiar):</p>
          <div className="flex flex-wrap gap-1.5">
            {placeholders.map((p) => (
              <code
                key={p}
                onClick={() => navigator.clipboard.writeText(p)}
                className="cursor-pointer rounded bg-muted px-2 py-1 text-xs hover:bg-primary hover:text-on-primary"
              >
                {p}
              </code>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Textos de la portada">
        <Field label="Título hero">
          <input className="input" value={form.textoHero} onChange={(e) => setForm({ ...form, textoHero: e.target.value })} />
        </Field>
        <Field label="Subtítulo hero">
          <textarea className="input min-h-[80px]" value={form.subtituloHero} onChange={(e) => setForm({ ...form, subtituloHero: e.target.value })} />
        </Field>
        <Field label="Título de la sección destacados">
          <input className="input" value={form.textoDestacados} onChange={(e) => setForm({ ...form, textoDestacados: e.target.value })} />
        </Field>
      </Section>

      <Section title="Colores">
        <div className="grid sm:grid-cols-2 gap-3">
          {colorFields.map((c) => (
            <div key={c.key} className="flex items-center gap-3 rounded-xl border border-border p-2">
              <input
                type="color"
                value={rgbToHex(colores[c.key])}
                onChange={(e) => updateColor(c.key, e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-foreground/60 font-mono">{rgbToHex(colores[c.key])}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setForm({ ...form, colores: JSON.stringify(coloresDefault) })}
          className="btn-ghost text-sm mt-3"
        >
          Restaurar colores por defecto
        </button>
      </Section>

      <Section title="Campos del formulario de contacto">
        <p className="text-sm text-foreground/60 mb-3">
          Editá qué datos se piden al cliente al finalizar la compra.
        </p>
        <CamposClienteEditor
          json={form.camposCliente}
          onChange={(s) => setForm({ ...form, camposCliente: s })}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6 mb-5">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function CamposClienteEditor({ json, onChange }: { json: string; onChange: (s: string) => void }) {
  const [items, setItems] = useState<{ key: string; label: string; requerido: boolean }[]>(() => {
    try {
      const obj = JSON.parse(json);
      return Object.entries(obj).map(([k, v]: any) => ({ key: k, label: v.label, requerido: !!v.requerido }));
    } catch {
      return [];
    }
  });

  function sync(next: typeof items) {
    setItems(next);
    const obj: Record<string, { label: string; requerido: boolean }> = {};
    for (const it of next) obj[it.key] = { label: it.label, requerido: it.requerido };
    onChange(JSON.stringify(obj));
  }

  function update(i: number, patch: Partial<typeof items[number]>) {
    const next = [...items]; next[i] = { ...next[i], ...patch }; sync(next);
  }

  function add() {
    sync([...items, { key: `campo_${items.length + 1}`, label: "Nuevo campo", requerido: false }]);
  }

  function remove(i: number) {
    sync(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
          <input
            className="input flex-1 min-w-[180px]"
            placeholder="Etiqueta visible"
            value={it.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <input
            className="input w-32"
            placeholder="key"
            value={it.key}
            onChange={(e) => update(i, { key: e.target.value.replace(/\s/g, "_").toLowerCase() })}
          />
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={it.requerido}
              onChange={(e) => update(i, { requerido: e.target.checked })}
            />
            Requerido
          </label>
          <button onClick={() => remove(i)} className="btn-ghost h-9 w-9 p-0 text-destructive">×</button>
        </div>
      ))}
      <button onClick={add} className="btn-secondary text-sm">+ Agregar campo</button>
      <p className="text-xs text-foreground/60">
        Si necesitás un textarea (ej. notas), usá la clave <code>notas</code>.
      </p>
    </div>
  );
}

function hexToRgb(hex: string): string | null {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return `${r} ${g} ${b}`;
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `${r} ${g} ${b}`;
  }
  return null;
}

function rgbToHex(rgb: string): string {
  const parts = rgb.split(/\s+/).map((n) => parseInt(n.trim(), 10));
  if (parts.length !== 3 || parts.some(isNaN)) return "#ea580c";
  return "#" + parts.map((n) => n.toString(16).padStart(2, "0")).join("");
}
