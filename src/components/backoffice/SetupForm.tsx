"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Check } from "lucide-react";

export function SetupForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordOk = password.length >= 8;
  const matchOk = password === passwordConfirm && password.length > 0;
  const canSubmit = nombre.trim() && email.trim() && passwordOk && matchOk && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Error al crear la cuenta");
        return;
      }
      router.push("/backoffice");
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div>
        <label htmlFor="nombre" className="label">Tu nombre</label>
        <input
          id="nombre"
          type="text"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="input"
          placeholder="María Pérez"
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor="email" className="label">Correo</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="admin@queseria.test"
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">Contraseña (mín. 8 caracteres)</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          autoComplete="new-password"
        />
        {password.length > 0 && !passwordOk && (
          <p className="mt-1 text-xs text-destructive">Faltan {8 - password.length} caracteres</p>
        )}
      </div>
      <div>
        <label htmlFor="passwordConfirm" className="label">Repetir contraseña</label>
        <input
          id="passwordConfirm"
          type="password"
          required
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="input"
          autoComplete="new-password"
        />
        {passwordConfirm.length > 0 && !matchOk && (
          <p className="mt-1 text-xs text-destructive">Las contraseñas no coinciden</p>
        )}
        {matchOk && (
          <p className="mt-1 text-xs text-green-600 inline-flex items-center gap-1">
            <Check className="h-3 w-3" /> Coinciden
          </p>
        )}
      </div>
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Crear cuenta y entrar
      </button>
    </form>
  );
}
