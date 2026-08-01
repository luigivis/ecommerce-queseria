"use client";

import { useState, useMemo, FormEvent } from "react";
import { Plus, Pencil, KeyRound, Loader2, Search } from "lucide-react";

type Usuario = {
  id: string;
  email: string;
  nombre: string;
  role: "ADMIN" | "OPERADOR" | "VENDEDOR";
  activo: boolean;
  createdAt: string;
};

type FormMode =
  | { kind: "create" }
  | { kind: "edit"; usuario: Usuario }
  | { kind: "password"; usuario: Usuario }
  | null;

export function UsuariosClient({
  usuarios: initial,
  currentUserId,
}: {
  usuarios: Usuario[];
  currentUserId: string;
}) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState<FormMode>(null);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return items;
    return items.filter(
      (u) => u.email.toLowerCase().includes(q) || u.nombre.toLowerCase().includes(q)
    );
  }, [items, filter]);

  async function refresh() {
    const r = await fetch("/api/usuarios");
    if (r.ok) setItems(await r.json());
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-display">Usuarios</h1>
          <p className="text-sm text-foreground/60">{items.length} en total</p>
        </div>
        <button onClick={() => setMode({ kind: "create" })} className="btn-primary">
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Creado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-foreground/60">
                  {filter ? "Sin resultados" : "Aún no hay usuarios."}
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3">{u.nombre}</td>
                  <td className="px-4 py-3">
                    <RolBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.activo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground/60 text-xs">
                    {new Date(u.createdAt).toLocaleDateString("es-NI")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => setMode({ kind: "edit", usuario: u })}
                        className="btn-icon"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setMode({ kind: "password", usuario: u })}
                        className="btn-icon"
                        title="Reset password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      {u.id !== currentUserId && (
                        <ToggleActivo usuario={u} onUpdate={refresh} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mode?.kind === "create" && (
        <UsuarioForm
          onClose={() => setMode(null)}
          onSaved={async (u) => {
            setItems((curr) => [u, ...curr]);
            setMode(null);
          }}
        />
      )}
      {mode?.kind === "edit" && (
        <UsuarioForm
          usuario={mode.usuario}
          onClose={() => setMode(null)}
          onSaved={async (u) => {
            setItems((curr) => curr.map((x) => (x.id === u.id ? u : x)));
            setMode(null);
          }}
        />
      )}
      {mode?.kind === "password" && (
        <PasswordForm
          usuario={mode.usuario}
          onClose={() => setMode(null)}
        />
      )}
    </div>
  );
}

function RolBadge({ role }: { role: Usuario["role"] }) {
  const styles: Record<Usuario["role"], string> = {
    ADMIN: "bg-primary/10 text-primary",
    OPERADOR: "bg-blue-100 text-blue-700",
    VENDEDOR: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[role]}`}>
      {role}
    </span>
  );
}

function ToggleActivo({ usuario, onUpdate }: { usuario: Usuario; onUpdate: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => {
        if (!confirm(`¿${usuario.activo ? "Desactivar" : "Activar"} a ${usuario.email}?`)) return;
        setLoading(true);
        try {
          const r = await fetch(`/api/usuarios/${usuario.id}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ activo: !usuario.activo }),
          });
          if (r.ok) await onUpdate();
        } finally {
          setLoading(false);
        }
      }}
      disabled={loading}
      className="btn-icon"
      title={usuario.activo ? "Desactivar" : "Activar"}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : usuario.activo ? "⏸" : "▶"}
    </button>
  );
}

function UsuarioForm({
  usuario,
  onClose,
  onSaved,
}: {
  usuario?: Usuario;
  onClose: () => void;
  onSaved: (u: Usuario) => void | Promise<void>;
}) {
  const isEdit = !!usuario;
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [role, setRole] = useState<Usuario["role"]>(usuario?.role ?? "OPERADOR");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isEdit) {
        const body: Record<string, string | boolean> = {};
        if (nombre !== usuario!.nombre) body.nombre = nombre;
        if (email !== usuario!.email) body.email = email;
        if (role !== usuario!.role) body.role = role;
        if (Object.keys(body).length === 0) {
          onClose();
          return;
        }
        const r = await fetch(`/api/usuarios/${usuario!.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const data = await r.json();
          setError(data.error ?? "Error al guardar");
          return;
        }
        onSaved(await r.json());
      } else {
        const r = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, nombre, role, password }),
        });
        if (!r.ok) {
          const data = await r.json();
          setError(data.error ?? "Error al crear");
          return;
        }
        onSaved(await r.json());
      }
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar usuario" : "Nuevo usuario"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="input w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Usuario["role"])}
            className="input w-full"
          >
            <option value="ADMIN">ADMIN</option>
            <option value="OPERADOR">OPERADOR</option>
            <option value="VENDEDOR">VENDEDOR</option>
          </select>
        </div>
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium mb-1">Password (mínimo 8)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              className="input w-full"
              required
            />
          </div>
        )}
        {error && (
          <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</p>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordForm({
  usuario,
  onClose,
}: {
  usuario: Usuario;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/usuarios/${usuario.id}/password`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        const data = await r.json();
        setError(data.error ?? "Error");
        return;
      }
      setOk(true);
      setTimeout(onClose, 1200);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={`Reset password — ${usuario.email}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nueva password (mínimo 8)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="input w-full"
            required
          />
        </div>
        {error && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{error}</p>}
        {ok && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded">Password actualizado</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading || ok} className="btn-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resetear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
