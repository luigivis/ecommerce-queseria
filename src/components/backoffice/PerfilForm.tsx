"use client";

import { useState, FormEvent } from "react";

type UserActual = {
  email: string;
  nombre: string;
};

export function PerfilForm({ user }: { user: UserActual }) {
  const [nombre, setNombre] = useState(user.nombre);
  const [email, setEmail] = useState(user.email);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [passwordRepetir, setPasswordRepetir] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (passwordNuevo && passwordNuevo !== passwordRepetir) {
      setMsg({ tipo: "error", texto: "Las contraseñas nuevas no coinciden" });
      return;
    }

    const body: Record<string, string> = {};
    if (nombre !== user.nombre) body.nombre = nombre;
    if (email !== user.email) body.email = email;
    if (passwordNuevo) {
      body.passwordActual = passwordActual;
      body.passwordNuevo = passwordNuevo;
    }

    if (Object.keys(body).length === 0) {
      setMsg({ tipo: "error", texto: "No hay cambios para guardar" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ tipo: "error", texto: data.error ?? "Error al guardar" });
        return;
      }
      setMsg({ tipo: "ok", texto: "Perfil actualizado" });
      setPasswordActual("");
      setPasswordNuevo("");
      setPasswordRepetir("");
      if (passwordNuevo) {
        setTimeout(() => {
          window.location.href = "/backoffice/login";
        }, 1500);
      }
    } catch {
      setMsg({ tipo: "error", texto: "Error de red" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-xl">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Datos</h2>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="nombre">
            Nombre
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border border-border rounded px-3 py-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-border rounded px-3 py-2 w-full"
            required
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
        <p className="text-sm text-foreground/60">
          Dejá los campos vacíos si no querés cambiarla.
        </p>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="actual">
            Contraseña actual
          </label>
          <input
            id="actual"
            type="password"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            className="border border-border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="nueva">
            Contraseña nueva (mínimo 8)
          </label>
          <input
            id="nueva"
            type="password"
            value={passwordNuevo}
            onChange={(e) => setPasswordNuevo(e.target.value)}
            minLength={8}
            className="border border-border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="repetir">
            Repetir contraseña nueva
          </label>
          <input
            id="repetir"
            type="password"
            value={passwordRepetir}
            onChange={(e) => setPasswordRepetir(e.target.value)}
            minLength={8}
            className="border border-border rounded px-3 py-2 w-full"
          />
        </div>
      </section>

      {msg && (
        <p
          className={
            msg.tipo === "ok"
              ? "text-green-700 bg-green-50 px-3 py-2 rounded"
              : "text-red-700 bg-red-50 px-3 py-2 rounded"
          }
        >
          {msg.texto}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-primary text-on-primary px-5 py-2 rounded font-medium disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
