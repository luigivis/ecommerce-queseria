# Gestión de Usuarios + SEO og:image — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sumar CRUD de usuarios (admin, operador, vendedor) en el backoffice y arreglar el og:image de la ficha de producto para que use URL absoluta con fallback al logo.

**Architecture:** Server Component para `/backoffice/usuarios` con Client Component para la tabla y modales. API routes para CRUD. Helper `toAbsoluteUrl` en `app/productos/[slug]/page.tsx` para og:image y JSON-LD. Test E2E con Vitest verificando el og:image.

**Tech Stack:** Next.js 14, Prisma 5 + Postgres, bcryptjs, zod, Vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-08-01-usuarios-y-seo-design.md`

---

## File Structure

**Crear:**
- `src/app/api/usuarios/route.ts` — GET (lista) + POST (crea).
- `src/app/api/usuarios/[id]/route.ts` — PUT (edita) + DELETE (soft-delete).
- `src/app/api/usuarios/[id]/password/route.ts` — PUT (reset password).
- `src/app/backoffice/(protected)/usuarios/page.tsx` — Server Component.
- `src/components/backoffice/UsuariosClient.tsx` — Client Component (tabla + modales).
- `tests/api/usuarios.test.ts` — Tests del CRUD.
- `tests/seo/og-image.test.ts` — Test del og:image.
- `public/og-default.png` — Placeholder 1200x630.

**Modificar:**
- `prisma/schema.prisma` — `User.activo Boolean @default(true)`.
- `prisma/seed.ts` — agregar `activo: true` en el admin.
- `src/app/backoffice/(protected)/layout.tsx` — link "Usuarios" en nav.
- `src/app/productos/[slug]/page.tsx` — helper `toAbsoluteUrl`, aplicar en og:image y JSON-LD.
- `README.md` — documentar roles y verificar OG.

---

## Task 1: Schema — `User.activo`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `activo` field to User model**

In `prisma/schema.prisma`, replace the `User` model with:

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         String   @default("ADMIN")
  nombre       String
  activo       Boolean  @default(true)
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 2: Validate schema**

```bash
DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid 🚀`.

- [ ] **Step 3: Regenerate Prisma Client**

```bash
npx prisma generate
```

Expected: success.

- [ ] **Step 4: Update seed.ts**

In `prisma/seed.ts`, find the Admin creation (around line 11-22):

```ts
const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
if (!existingUser) {
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: hash,
      nombre: "Administrador",
      role: "ADMIN",
    },
  });
```

Replace the `data` block with:

```ts
      data: {
        email: adminEmail,
        passwordHash: hash,
        nombre: "Administrador",
        role: "ADMIN",
        activo: true,
      },
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts
git commit -m "feat(users): campo activo + actualizar seed"
```

---

## Task 2: API Listar y Crear Usuarios

**Files:**
- Create: `src/app/api/usuarios/route.ts`
- Create: `tests/api/usuarios.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/api/usuarios.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockUserFindMany = vi.fn();
const mockUserCreate = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed:${pw}`),
  },
}));

import { GET, POST } from "@/app/api/usuarios/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/usuarios", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const adminSession = {
  userId: "admin1",
  email: "admin@x.com",
  role: "ADMIN" as const,
};

describe("GET /api/usuarios", () => {
  beforeEach(() => vi.clearAllMocks());

  it("responde 401 si no hay sesión", async () => {
    mockGetSession.mockResolvedValue({ userId: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("responde 403 si no es ADMIN", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", role: "OPERADOR" });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("lista usuarios sin passwordHash", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    mockUserFindMany.mockResolvedValue([
      { id: "u1", email: "a@b.c", nombre: "A", role: "ADMIN", activo: true, createdAt: new Date() },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].passwordHash).toBeUndefined();
  });
});

describe("POST /api/usuarios", () => {
  beforeEach(() => vi.clearAllMocks());

  it("responde 401 si no es ADMIN", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", role: "VENDEDOR" });
    const res = await POST(makeRequest({ email: "x", nombre: "X", role: "ADMIN", password: "12345678" }) as never);
    expect(res.status).toBe(403);
  });

  it("responde 400 si email duplicado", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    mockUserFindUnique.mockResolvedValue({ id: "otro", email: "x@y.c" });
    const res = await POST(makeRequest({ email: "x@y.c", nombre: "X", role: "ADMIN", password: "12345678" }) as never);
    expect(res.status).toBe(400);
  });

  it("responde 400 si role inválido", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const res = await POST(makeRequest({ email: "x@y.c", nombre: "X", role: "SUPER", password: "12345678" }) as never);
    expect(res.status).toBe(400);
  });

  it("responde 400 si password corto", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const res = await POST(makeRequest({ email: "x@y.c", nombre: "X", role: "ADMIN", password: "123" }) as never);
    expect(res.status).toBe(400);
  });

  it("crea usuario si todo es válido", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      id: "u-new",
      email: "x@y.c",
      nombre: "X",
      role: "ADMIN",
      activo: true,
      createdAt: new Date(),
    });
    const res = await POST(makeRequest({ email: "x@y.c", nombre: "X", role: "ADMIN", password: "12345678" }) as never);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.passwordHash).toBeUndefined();
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: "hashed:12345678", role: "ADMIN" }),
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/api/usuarios.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the API route**

Create `src/app/api/usuarios/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1),
  role: z.enum(["ADMIN", "OPERADOR", "VENDEDOR"]),
  password: z.string().min(8),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  const usuarios = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, nombre: true, role: true, activo: true, createdAt: true },
  });
  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });
  }

  const hash = await bcrypt.hash(parsed.data.password, 10);
  const created = await prisma.user.create({
    data: {
      email: parsed.data.email,
      nombre: parsed.data.nombre,
      role: parsed.data.role,
      passwordHash: hash,
      activo: true,
    },
    select: { id: true, email: true, nombre: true, role: true, activo: true, createdAt: true },
  });
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/api/usuarios.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/usuarios/route.ts tests/api/usuarios.test.ts
git commit -m "feat(users): GET y POST /api/usuarios"
```

---

## Task 3: API Editar y Soft-Delete Usuario

**Files:**
- Create: `src/app/api/usuarios/[id]/route.ts`
- Modify: `tests/api/usuarios.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/api/usuarios.test.ts`:

```ts
import { PUT, DELETE } from "@/app/api/usuarios/[id]/route";

const mockUserUpdate = vi.fn();
const mockUserUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
      findUnique: (...args: unknown[]) => {
        const arg = (args[0] as { where?: { email?: string; id?: string } })?.where;
        if (arg?.email !== undefined) return mockUserFindUnique(...args);
        if (arg?.id !== undefined) return mockUserUnique(...args);
        return mockUserFindUnique(...args);
      },
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

function makePutRequest(body: unknown): Request {
  return new Request("http://localhost/api/usuarios/u1", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/usuarios/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("responde 409 si intenta editarse a sí mismo", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", role: "ADMIN" });
    const res = await PUT(makePutRequest({ nombre: "X" }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(409);
  });

  it("actualiza activo a false en soft-delete", async () => {
    mockGetSession.mockResolvedValue({ userId: "admin", role: "ADMIN" });
    mockUserUpdate.mockResolvedValue({ id: "u1", email: "x", nombre: "X", role: "OPERADOR", activo: false, createdAt: new Date() });
    const res = await PUT(makePutRequest({ activo: false }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ activo: false }) })
    );
  });

  it("responde 400 si email choca con otro", async () => {
    mockGetSession.mockResolvedValue({ userId: "admin", role: "ADMIN" });
    mockUserUnique.mockResolvedValue({ id: "other", email: "y@z.c" });
    const res = await PUT(makePutRequest({ email: "y@z.c" }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/usuarios/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("responde 409 si intenta desactivarse a sí mismo", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", role: "ADMIN" });
    const res = await DELETE({} as never, { params: { id: "u1" } });
    expect(res.status).toBe(409);
  });

  it("soft-delete (activo=false) si es distinto", async () => {
    mockGetSession.mockResolvedValue({ userId: "admin", role: "ADMIN" });
    mockUserUpdate.mockResolvedValue({ id: "u1", activo: false });
    const res = await DELETE({} as never, { params: { id: "u1" } });
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { activo: false } })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/api/usuarios.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/usuarios/[id]/route'`.

- [ ] **Step 3: Implement PUT and DELETE**

Create `src/app/api/usuarios/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "OPERADOR", "VENDEDOR"]).optional(),
  activo: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  if (params.id === session.userId) {
    return NextResponse.json({ error: "No podés editarte a vos mismo" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (parsed.data.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ error: "Email ya en uso" }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: parsed.data,
    select: { id: true, email: true, nombre: true, role: true, activo: true, createdAt: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  if (params.id === session.userId) {
    return NextResponse.json({ error: "No podés desactivarte a vos mismo" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { activo: false },
  });
  return NextResponse.json({ ok: true });
}
```

Note: the existing test file has duplicate `vi.mock("@/lib/db", ...)` declarations from a previous mock that we need to keep. The new mock is added in the same file. To avoid conflict, replace the existing `vi.mock("@/lib/db", ...)` block at the top of the test file with the consolidated one below.

- [ ] **Step 4: Consolidate vi.mock block**

Replace the `vi.mock("@/lib/db", ...)` block at the top of `tests/api/usuarios.test.ts` (the one declared right after the `mockGetSession`/`mockUserFindMany` etc. mock declarations) with:

```ts
const mockUserUpdate = vi.fn();
const mockUserUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
      findUnique: (...args: unknown[]) => {
        const arg = (args[0] as { where?: { email?: string; id?: string } })?.where;
        if (arg?.email !== undefined) return mockUserFindUnique(...args);
        if (arg?.id !== undefined) return mockUserUnique(...args);
        return mockUserFindUnique(...args);
      },
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));
```

Remove the duplicated `const mockUserUpdate = vi.fn();` and `const mockUserUnique = vi.fn();` lines that were added in Step 1 (they're now in the consolidated block).

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- tests/api/usuarios.test.ts
```

Expected: PASS (now 11 tests).

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/usuarios/[id]/route.ts tests/api/usuarios.test.ts
git commit -m "feat(users): PUT y DELETE /api/usuarios/[id]"
```

---

## Task 4: API Reset Password

**Files:**
- Create: `src/app/api/usuarios/[id]/password/route.ts`
- Modify: `tests/api/usuarios.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/api/usuarios.test.ts`:

```ts
import { PUT as PUTPassword } from "@/app/api/usuarios/[id]/password/route";

function makePasswordPut(body: unknown): Request {
  return new Request("http://localhost/api/usuarios/u1/password", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/usuarios/[id]/password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("responde 403 si no es ADMIN", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", role: "OPERADOR" });
    const res = await PUTPassword(makePasswordPut({ password: "nuevaclave1" }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(403);
  });

  it("responde 400 si password corto", async () => {
    mockGetSession.mockResolvedValue({ userId: "admin", role: "ADMIN" });
    const res = await PUTPassword(makePasswordPut({ password: "123" }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(400);
  });

  it("actualiza password cuando es válido", async () => {
    mockGetSession.mockResolvedValue({ userId: "admin", role: "ADMIN" });
    mockUserUpdate.mockResolvedValue({ id: "u1" });
    const res = await PUTPassword(makePasswordPut({ password: "nuevaclave1" }) as never, { params: { id: "u1" } });
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: { passwordHash: "hashed:nuevaclave1" },
      })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/api/usuarios.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement PUT password**

Create `src/app/api/usuarios/[id]/password/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({ password: z.string().min(8) });

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password mínimo 8 chars" }, { status: 400 });
  }

  const hash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: params.id },
    data: { passwordHash: hash },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/api/usuarios.test.ts
```

Expected: PASS (14 tests).

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/usuarios/[id]/password/route.ts tests/api/usuarios.test.ts
git commit -m "feat(users): reset password endpoint"
```

---

## Task 5: Página `/backoffice/usuarios` (Server Component)

**Files:**
- Create: `src/app/backoffice/(protected)/usuarios/page.tsx`

- [ ] **Step 1: Create the server component**

```tsx
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsuariosClient } from "@/components/backoffice/UsuariosClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const session = await requireAdmin();
  if (!session) redirect("/backoffice/login");

  if (session.role !== "ADMIN") {
    redirect("/backoffice");
  }

  const usuarios = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      nombre: true,
      role: true,
      activo: true,
      createdAt: true,
    },
  });

  const data = usuarios.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 sm:p-8">
      <UsuariosClient usuarios={data} currentUserId={session.userId} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors (TS should complain about missing `UsuariosClient` until Task 6, but that's fine — it's a known forward reference).

- [ ] **Step 3: Commit**

```bash
git add src/app/backoffice/(protected)/usuarios/page.tsx
git commit -m "feat(backoffice): página /backoffice/usuarios (server component)"
```

---

## Task 6: Client Component `UsuariosClient`

**Files:**
- Create: `src/components/backoffice/UsuariosClient.tsx`

- [ ] **Step 1: Create the client component**

```tsx
"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, KeyRound, Loader2, Search, Users } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function submit(e: React.FormEvent) {
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

  async function submit(e: React.FormEvent) {
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
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: 0 new errors (existing warnings OK).

- [ ] **Step 4: Commit**

```bash
git add src/components/backoffice/UsuariosClient.tsx
git commit -m "feat(backoffice): UsuariosClient con tabla + modales"
```

---

## Task 7: Sidebar link "Usuarios"

**Files:**
- Modify: `src/app/backoffice/(protected)/layout.tsx`

- [ ] **Step 1: Find and read the layout**

```bash
cat src/app/backoffice/\(protected\)/layout.tsx
```

- [ ] **Step 2: Add link to nav array**

In the layout file, find the `nav` array (around lines 23-31). Add a new entry at the end:

```ts
{ href: "/backoffice/usuarios", icon: Users, label: "Usuarios" },
```

- [ ] **Step 3: Add `Users` to lucide-react imports**

Find the lucide-react import block and add `Users` to it:

```ts
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingBag,
  Settings,
  MapPin,
  Truck,
  User,
  Users,
} from "lucide-react";
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/backoffice/(protected)/layout.tsx
git commit -m "feat(backoffice): link 'Usuarios' en sidebar"
```

---

## Task 8: SEO — Helper `toAbsoluteUrl` y aplicar

**Files:**
- Modify: `src/app/productos/[slug]/page.tsx`

- [ ] **Step 1: Add helper function**

At the top of `src/app/productos/[slug]/page.tsx`, after the imports and before `getProducto`, add:

```ts
function toAbsoluteUrl(path: string | undefined, baseUrl: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
```

- [ ] **Step 2: Replace `generateMetadata` block**

Find the existing `generateMetadata` function (around lines 21-44). Replace it with:

```ts
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = await getProducto(params.slug);
  if (!p) return { title: "Producto no encontrado" };
  const cfg = await getConfiguracion();
  const imgs: string[] = JSON.parse(p.imagenes || "[]");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const ogImage =
    toAbsoluteUrl(imgs[0], baseUrl) ||
    toAbsoluteUrl(cfg.logoUrl, baseUrl) ||
    `${baseUrl.replace(/\/$/, "")}/og-default.png`;
  const precioFinal =
    p.enPromocion && p.descuentoPct
      ? toNumber(p.precio) * (1 - toNumber(p.descuentoPct) / 100)
      : toNumber(p.precio);
  return {
    title: p.nombre,
    description: p.descripcion.slice(0, 160),
    openGraph: {
      title: p.nombre,
      description: p.descripcion.slice(0, 160),
      type: "website",
      images: [{ url: ogImage, alt: p.nombre }],
    },
    alternates: {
      canonical: `/productos/${p.slug}`,
    },
  };
}
```

- [ ] **Step 3: Patch JSON-LD image array**

In the same file, find the `jsonLd` object inside the page component. Replace the `image: imgs,` line with:

```ts
    image: imgs.length > 0 ? imgs.map((i) => toAbsoluteUrl(i, baseUrl)) : [toAbsoluteUrl(cfg.logoUrl, baseUrl) || `${baseUrl.replace(/\/$/, "")}/og-default.png`],
```

Also, before the `jsonLd` declaration, add:

```ts
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
```

(Place it right after the `cfg` line.)

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/productos/[slug]/page.tsx
git commit -m "feat(seo): og:image y JSON-LD con URL absoluta + fallback al logo"
```

---

## Task 9: Placeholder `public/og-default.png`

**Files:**
- Create: `public/og-default.png`

- [ ] **Step 1: Generate the placeholder PNG**

Use `sharp` to create a 1200x630 PNG with brand colors. Run:

```bash
node -e "
const sharp = require('sharp');
const svg = \`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630' viewBox='0 0 1200 630'>
  <rect width='1200' height='630' fill='#ea580c'/>
  <text x='600' y='315' font-family='Arial' font-size='120' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'>Quesería</text>
  <text x='600' y='450' font-family='Arial' font-size='36' fill='white' text-anchor='middle' opacity='0.9'>Productos artesanales</text>
</svg>\`;
sharp(Buffer.from(svg)).png().toFile('public/og-default.png').then(() => console.log('OK'));
"
```

Expected: `OK` printed, file created at `public/og-default.png` (~10KB).

- [ ] **Step 2: Verify file**

```bash
ls -la public/og-default.png
```

Expected: file exists, size > 1KB.

- [ ] **Step 3: Commit**

```bash
git add public/og-default.png
git commit -m "feat(seo): placeholder og-default.png (1200x630)"
```

---

## Task 10: Test E2E del og:image

**Files:**
- Create: `tests/seo/og-image.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockProductFindUnique = vi.fn();
const mockGetConfiguracion = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    producto: {
      findUnique: (...args: unknown[]) => mockProductFindUnique(...args),
    },
  },
}));

vi.mock("@/lib/site", () => ({
  getConfiguracion: () => mockGetConfiguracion(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

import { generateMetadata } from "@/app/productos/[slug]/page";

describe("og:image en ficha de producto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://queseria.example.com";
  });

  it("usa la primera imagen del producto cuando existe", async () => {
    mockProductFindUnique.mockResolvedValue({
      slug: "queso-fresco",
      nombre: "Queso Fresco",
      descripcion: "Queso fresco artesanal",
      precio: { toNumber: () => 180 },
      descuentoPct: null,
      enPromocion: false,
      imagenes: JSON.stringify(["/uploads/queso-fresco.webp"]),
    });
    mockGetConfiguracion.mockResolvedValue({ logoUrl: "/uploads/logo.png" });

    const meta = await generateMetadata({ params: { slug: "queso-fresco" } });
    const ogImage = meta.openGraph?.images?.[0]?.url;
    expect(ogImage).toBe("https://queseria.example.com/uploads/queso-fresco.webp");
  });

  it("usa el logo cuando el producto no tiene imagen", async () => {
    mockProductFindUnique.mockResolvedValue({
      slug: "queso-fresco",
      nombre: "Queso Fresco",
      descripcion: "Sin imgs",
      precio: { toNumber: () => 180 },
      descuentoPct: null,
      enPromocion: false,
      imagenes: JSON.stringify([]),
    });
    mockGetConfiguracion.mockResolvedValue({ logoUrl: "/uploads/logo.png" });

    const meta = await generateMetadata({ params: { slug: "queso-fresco" } });
    const ogImage = meta.openGraph?.images?.[0]?.url;
    expect(ogImage).toBe("https://queseria.example.com/uploads/logo.png");
  });

  it("usa el placeholder cuando no hay ni imagen ni logo", async () => {
    mockProductFindUnique.mockResolvedValue({
      slug: "queso-fresco",
      nombre: "Queso Fresco",
      descripcion: "Sin nada",
      precio: { toNumber: () => 180 },
      descuentoPct: null,
      enPromocion: false,
      imagenes: JSON.stringify([]),
    });
    mockGetConfiguracion.mockResolvedValue({ logoUrl: null });

    const meta = await generateMetadata({ params: { slug: "queso-fresco" } });
    const ogImage = meta.openGraph?.images?.[0]?.url;
    expect(ogImage).toBe("https://queseria.example.com/og-default.png");
  });

  it("preserva URLs absolutas si ya lo son", async () => {
    mockProductFindUnique.mockResolvedValue({
      slug: "test",
      nombre: "Test",
      descripcion: "Test",
      precio: { toNumber: () => 100 },
      descuentoPct: null,
      enPromocion: false,
      imagenes: JSON.stringify(["https://cdn.example.com/img.webp"]),
    });
    mockGetConfiguracion.mockResolvedValue({ logoUrl: null });

    const meta = await generateMetadata({ params: { slug: "test" } });
    const ogImage = meta.openGraph?.images?.[0]?.url;
    expect(ogImage).toBe("https://cdn.example.com/img.webp");
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test -- tests/seo/og-image.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add tests/seo/og-image.test.ts
git commit -m "test(seo): og:image con URL absoluta + fallback chain"
```

---

## Task 11: README — Roles y OG

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add section about roles**

Find the "## Stack" section in `README.md`. After the stack bullets, add a new section:

```markdown
## Roles de usuario

- **ADMIN** — Acceso completo al backoffice. Único que puede gestionar usuarios.
- **OPERADOR** — Gestiona productos, categorías, órdenes, etc. No ve `/backoffice/usuarios`.
- **VENDEDOR** — Igual que OPERADOR por ahora. Diseñado para un futuro POS de venta rápida.

Los usuarios se crean desde `/backoffice/usuarios` (solo ADMIN). El admin inicial viene del seed:
- Email: `admin@queseria.test`
- Password: `admin1234`

## Open Graph y SEO

Cada ficha de producto expone `og:image` con URL absoluta. La cadena de fallback:

1. Primera imagen del producto (`Producto.imagenes[0]`).
2. Logo del sitio (`Configuracion.logoUrl`).
3. Placeholder estático en `/og-default.png`.

Para producción, configurar `NEXT_PUBLIC_SITE_URL` en el dashboard de Railway (ej: `https://ecommerce-queseria-production.up.railway.app`). Verificar el preview compartiendo en Facebook Debugger o Twitter Card Validator.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: roles de usuario y Open Graph"
```

---

## Task 12: Validaciones finales

- [ ] **Step 1: Correr todos los tests**

```bash
npm test
```

Expected: PASS (todos los tests, incluyendo nuevos).

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: 0 new errors.

- [ ] **Step 4: Prisma validate**

```bash
DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma validate
```

Expected: OK.

- [ ] **Step 5: Docker build**

```bash
docker build -t queseria-test . 2>&1 | tail -3
```

Expected: build successful.

- [ ] **Step 6: Cleanup**

```bash
docker rmi queseria-test
```

---

## Task 13: Push

- [ ] **Step 1: Verificar status**

```bash
git status
```

Expected: working tree clean.

- [ ] **Step 2: Push**

```bash
git push
```

Expected: push successful.

---

## Resumen de commits esperados

1. `feat(users): campo activo + actualizar seed`
2. `feat(users): GET y POST /api/usuarios`
3. `feat(users): PUT y DELETE /api/usuarios/[id]`
4. `feat(users): reset password endpoint`
5. `feat(backoffice): página /backoffice/usuarios (server component)`
6. `feat(backoffice): UsuariosClient con tabla + modales`
7. `feat(backoffice): link 'Usuarios' en sidebar`
8. `feat(seo): og:image y JSON-LD con URL absoluta + fallback al logo`
9. `feat(seo): placeholder og-default.png (1200x630)`
10. `test(seo): og:image con URL absoluta + fallback chain`
11. `docs: roles de usuario y Open Graph`

---

## Notas para el ejecutor

- **Schema**: el cambio `User.activo` requiere `prisma db push` en Railway. El Dockerfile ya corre eso en cada arranque, así que no hay paso extra.
- **Backwards-compat**: usuarios existentes quedan con `activo: true` (default).
- **Tests de usuarios**: cubren 401, 403, 400 y casos felices. No testean el flujo de UI.
- **OG en desarrollo**: con `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, las URLs del og:image serán `http://localhost:3000/...`. Para probar, generar el HTML completo y verificar las meta tags.
- **Sin self-edit**: `PUT /api/usuarios/[id]`, `DELETE /api/usuarios/[id]` y `PUT /api/usuarios/[id]/password` no pueden aplicarse al propio user. Tests lo verifican.
