# Deploy a Railway — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer la app Quesería desplegable en Railway con un click, migrando SQLite a Postgres, sumando auto-seed idempotente y endpoint para actualizar perfil del admin.

**Architecture:** Monolito Next.js 14 existente, construido vía Dockerfile multi-stage ya armado. Dos servicios en Railway: `web` (Next.js) y `db` (Postgres plugin oficial). Script `start.sh` deriva `NEXT_PUBLIC_SITE_URL` desde `RAILWAY_PUBLIC_DOMAIN`, aplica `prisma db push`, hace check-and-seed idempotente, y arranca `node server.js`. Suma `PUT /api/auth/me` y página `/backoffice/perfil` para que el admin cambie su password quemada.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma 5.22, Postgres 16, Vitest, bcryptjs, iron-session, zod.

**Spec:** `docs/superpowers/specs/2026-08-01-railway-deploy-design.md`

---

## File Structure

**Crear:**
- `START.sh` — script de arranque (uppercase solo referencial, nombre real `start.sh`).
- `scripts/check-and-seed.js` — check de DB vacía + disparo de seed.
- `railway.toml` — config de deploy para Railway.
- `src/app/api/health/route.ts` — endpoint de healthcheck.
- `src/app/backoffice/perfil/page.tsx` — página de perfil con Client Component.
- `src/components/backoffice/PerfilForm.tsx` — form de edición.
- `src/lib/decimal.ts` — helper `toNumber(value)` para campos Decimal de Prisma.
- `tests/api/auth-me-put.test.ts` — tests del handler PUT.
- `tests/lib/decimal.test.ts` — tests del helper.
- `vitest.config.ts` — config del runner.
- `tests/setup.ts` — mocks compartidos.

**Modificar:**
- `prisma/schema.prisma` — provider + Float → Decimal.
- `Dockerfile` — quitar SQLite refs, sumar tsx, usar start.sh.
- `src/app/api/auth/me/route.ts` — sumar PUT.
- `src/lib/format.ts` — `formatPrice` acepta `Decimal | number`.
- `src/lib/delivery.ts` — lectura de Decimal.
- `src/components/storefront/ProductCard.tsx` — usar `toNumber`.
- `src/components/storefront/ProductDetail.tsx` — usar `toNumber`.
- `src/components/storefront/CheckoutClient.tsx` — usar `toNumber`.
- `src/components/storefront/CartDrawer.tsx` — sin cambios (recibe `number` desde el cart).
- `src/components/backoffice/ProductosClient.tsx` — usar `toNumber`.
- `src/components/backoffice/PuntosOrigenClient.tsx` — usar `toNumber`.
- `src/components/backoffice/DeliveryClient.tsx` — usar `toNumber`.
- `src/components/backoffice/OrdenesClient.tsx` — usar `toNumber`.
- `src/app/backoffice/(protected)/page.tsx` — usar `toNumber`.
- `src/app/productos/[slug]/page.tsx` — usar `toNumber`.
- `src/app/api/ordenes/route.ts` — usar `toNumber` en el armado de WhatsApp.
- `package.json` — sumar `vitest`, `@vitest/coverage-v8`, `tsx`.
- `src/app/backoffice/(protected)/layout.tsx` (o similar) — link "Mi perfil".
- `README.md` — instrucciones de Railway.

---

## Task 1: Helper de conversión Decimal → number

**Files:**
- Create: `src/lib/decimal.ts`
- Create: `tests/lib/decimal.test.ts`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json` (sumar vitest)

- [ ] **Step 1: Instalar Vitest**

```bash
npm install --save-dev vitest @vitest/coverage-v8 @vitest/environment-jsdom
```

- [ ] **Step 2: Crear `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Crear `tests/setup.ts`**

```ts
// Setup vacío. Reservado para mocks globales (Prisma, next/headers).
export {};
```

- [ ] **Step 4: Agregar scripts a `package.json`**

Modificar `"scripts"` para que quede:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "db:push": "prisma db push",
  "db:seed": "tsx prisma/seed.ts",
  "db:studio": "prisma studio",
  "test": "vitest run",
  "test:watch": "vitest",
  "postinstall": "prisma generate"
}
```

- [ ] **Step 5: Crear `src/lib/decimal.ts`**

```ts
import { Prisma } from "@prisma/client";

export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return value.toNumber();
}

export function toNumberOrNull(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return value.toNumber();
}
```

- [ ] **Step 6: Crear `tests/lib/decimal.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { toNumber, toNumberOrNull } from "@/lib/decimal";

describe("toNumber", () => {
  it("convierte Decimal a number", () => {
    expect(toNumber(new Prisma.Decimal("180.50"))).toBe(180.5);
  });

  it("retorna number sin cambios", () => {
    expect(toNumber(42)).toBe(42);
  });

  it("retorna 0 para null", () => {
    expect(toNumber(null)).toBe(0);
  });

  it("retorna 0 para undefined", () => {
    expect(toNumber(undefined)).toBe(0);
  });

  it("retorna 0 para Decimal 0", () => {
    expect(toNumber(new Prisma.Decimal(0))).toBe(0);
  });
});

describe("toNumberOrNull", () => {
  it("retorna null para null", () => {
    expect(toNumberOrNull(null)).toBeNull();
  });

  it("retorna null para undefined", () => {
    expect(toNumberOrNull(undefined)).toBeNull();
  });

  it("convierte Decimal a number", () => {
    expect(toNumberOrNull(new Prisma.Decimal("220.00"))).toBe(220);
  });

  it("retorna number sin cambios", () => {
    expect(toNumberOrNull(15.5)).toBe(15.5);
  });
});
```

- [ ] **Step 7: Correr tests**

Run: `npm test`
Expected: PASS en `tests/lib/decimal.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/decimal.ts tests/lib/decimal.test.ts vitest.config.ts tests/setup.ts
git commit -m "feat: helper toNumber para campos Decimal + Vitest"
```

---

## Task 2: Schema Prisma — Postgres + Decimal

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Cambiar provider**

En `prisma/schema.prisma`, línea 3:
- Reemplazar `provider = "sqlite"` por `provider = "postgresql"`.

- [ ] **Step 2: Cambiar Float → Decimal**

Reemplazar todas las apariciones de `Float` en los modelos `Producto`, `PuntoOrigen`, `RangoDelivery`, `Orden` por `Decimal`. Resultado esperado:

```prisma
model Producto {
  id            String     @id @default(cuid())
  slug          String     @unique
  nombre        String
  descripcion   String
  precio        Decimal
  stock         Int        @default(0)
  imagenes      String     @default("[]")
  categoriaId   String
  categoria     Categoria  @relation(fields: [categoriaId], references: [id], onDelete: Restrict)
  activo        Boolean    @default(true)
  destacado     Boolean    @default(false)
  enPromocion   Boolean    @default(false)
  descuentoPct  Decimal?
  unidad        String     @default("unidad")
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  movimientos   MovimientoStock[]

  @@index([categoriaId, activo])
  @@index([activo, destacado])
}

model PuntoOrigen {
  id        String   @id @default(cuid())
  nombre    String
  lat       Decimal
  lng       Decimal
  activo    Boolean  @default(true)
  createdAt DateTime @default(now())
}

model RangoDelivery {
  id      String  @id @default(cuid())
  desdeKm Decimal
  hastaKm Decimal
  costo   Decimal
  orden   Int     @default(0)
}

model Orden {
  id            String       @id @default(cuid())
  numero        Int          @unique
  tipo          String
  estado        String       @default("PENDIENTE")
  items         String
  subtotal      Decimal
  costoDelivery Decimal      @default(0)
  distanciaKm   Decimal      @default(0)
  total         Decimal
  cliente       String
  ubicacion     String
  notas         String?
  puntoOrigenId String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([estado])
  @@index([tipo])
}
```

Los modelos `User`, `Categoria`, `MovimientoStock`, `Configuracion` no cambian.

- [ ] **Step 3: Validar schema**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid 🚀`.

- [ ] **Step 4: Regenerar Prisma Client**

```bash
npx prisma generate
```

Expected: éxito, sin errores.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(prisma): migrar a postgresql + Decimal para plata/distancia"
```

---

## Task 3: Ajustar componentes que formatean plata/distancia

**Files:**
- Modify: `src/lib/format.ts`
- Modify: `src/components/storefront/ProductCard.tsx`
- Modify: `src/components/storefront/ProductDetail.tsx`
- Modify: `src/components/storefront/CheckoutClient.tsx`
- Modify: `src/components/backoffice/ProductosClient.tsx`
- Modify: `src/components/backoffice/PuntosOrigenClient.tsx`
- Modify: `src/components/backoffice/DeliveryClient.tsx`
- Modify: `src/components/backoffice/OrdenesClient.tsx`
- Modify: `src/app/backoffice/(protected)/page.tsx`
- Modify: `src/app/productos/[slug]/page.tsx`
- Modify: `src/app/api/ordenes/route.ts`
- Modify: `src/app/api/delivery/calcular/route.ts` (si existe)

- [ ] **Step 1: Actualizar `src/lib/format.ts`**

Reemplazar el contenido:

```ts
import { Prisma } from "@prisma/client";

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatPrice(value: Prisma.Decimal | number | null | undefined, moneda: string = "C$"): string {
  const n = typeof value === "number" ? value : (value?.toNumber() ?? 0);
  return `${moneda} ${n.toFixed(2)}`;
}
```

- [ ] **Step 2: `src/components/storefront/ProductCard.tsx`**

Importar `toNumber`:

```ts
import { toNumber } from "@/lib/decimal";
```

Reemplazar la línea:

```tsx
{formatPrice(precioFinal)}
```

por:

```tsx
{formatPrice(toNumber(precioFinal))}
```

Reemplazar:

```tsx
{formatPrice(producto.precio)}
```

por:

```tsx
{formatPrice(toNumber(producto.precio))}
```

- [ ] **Step 3: `src/components/storefront/ProductDetail.tsx`**

Importar `toNumber`:

```ts
import { toNumber } from "@/lib/decimal";
```

Reemplazar las dos llamadas a `formatPrice` que usen `precioFinal` o `producto.precio` envolviéndolas con `toNumber(...)`.

- [ ] **Step 4: `src/components/storefront/CheckoutClient.tsx`**

Importar `toNumber`:

```ts
import { toNumber } from "@/lib/decimal";
```

Línea 273 (`delivery.distanciaKm?.toFixed(1)`):
- Reemplazar por `{toNumberOrNull(delivery.distanciaKm)?.toFixed(1) ?? "0.0"}`. Si `toNumberOrNull` no está disponible, importar también: `import { toNumber, toNumberOrNull } from "@/lib/decimal";`.

Línea 280 (`formatPrice(delivery.costo ?? 0, ...)`):
- Reemplazar por `formatPrice(toNumber(delivery.costo), moneda)`.

Líneas 304, 306, 313, 317, 322 — envolver cada uso de `it.precio`, `subtotal`, `delivery.costo` con `toNumber(...)` donde corresponda.

- [ ] **Step 5: `src/components/backoffice/ProductosClient.tsx`**

Importar `toNumber`:

```ts
import { toNumber } from "@/lib/decimal";
```

Línea 198 (`p.precio.toFixed(2)`):
- Reemplazar por `{toNumber(p.precio).toFixed(2)}`.

- [ ] **Step 6: `src/components/backoffice/PuntosOrigenClient.tsx`**

Importar `toNumber`:

```ts
import { toNumber } from "@/lib/decimal";
```

Línea 66 (`p.lat.toFixed(5), {p.lng.toFixed(5)}`):
- Reemplazar por `{toNumber(p.lat).toFixed(5)}, {toNumber(p.lng).toFixed(5)}`.

- [ ] **Step 7: `src/components/backoffice/DeliveryClient.tsx`**

Importar `toNumber`:

```ts
import { toNumber } from "@/lib/decimal";
```

Línea 71 (`r.costo.toFixed(2)`):
- Reemplazar por `{toNumber(r.costo).toFixed(2)}`.

- [ ] **Step 8: `src/components/backoffice/OrdenesClient.tsx`**

Importar `toNumber`:

```ts
import { toNumber } from "@/lib/decimal";
```

Línea 143 (`o.ubicacion.lat.toFixed(4), {o.ubicacion.lng.toFixed(4)}`):
- Reemplazar por envolver con `toNumber(...)`.

Línea 146 (`o.distanciaKm.toFixed(1)`):
- Reemplazar por `{toNumber(o.distanciaKm).toFixed(1)}`.

Líneas 156, 161, 162 — envolver `it.precio`, `o.subtotal`, `o.costoDelivery`, `o.total` con `toNumber(...)`.

Línea 105 (`o.total`):
- Reemplazar por `formatPrice(toNumber(o.total), moneda)`.

- [ ] **Step 9: `src/app/backoffice/(protected)/page.tsx`**

Importar `toNumber`:

```ts
import { toNumber } from "@/lib/decimal";
```

Línea 87 (`formatPrice(o.total, cfg.moneda)`):
- Reemplazar por `formatPrice(toNumber(o.total), cfg.moneda)`.

- [ ] **Step 10: `src/app/productos/[slug]/page.tsx`**

Importar `toNumber`:

```ts
import { toNumber } from "@/lib/decimal";
```

Línea 66 (`precioFinal.toFixed(2)`):
- Reemplazar por `{toNumber(precioFinal).toFixed(2)}`.

- [ ] **Step 11: `src/app/api/ordenes/route.ts`**

Importar `toNumber`:

```ts
import { toNumber } from "@/lib/decimal";
```

Líneas 80, 91, 92, 93 — envolver los valores numéricos que vienen de Prisma con `toNumber(...)` antes de `formatPrice` o multiplicación.

- [ ] **Step 12: `src/app/api/delivery/calcular/route.ts`** (si existe)

Si el archivo existe, leer y ajustar cualquier referencia a `Decimal` con `toNumber`.

- [ ] **Step 13: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "refactor: usar toNumber para campos Decimal de Prisma"
```

---

## Task 4: PUT /api/auth/me

**Files:**
- Modify: `src/app/api/auth/me/route.ts`
- Create: `tests/api/auth-me-put.test.ts`

- [ ] **Step 1: Tests del handler PUT**

Crear `tests/api/auth-me-put.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(async (pw: string) => `hashed:${pw}`),
  },
}));

import { PUT } from "@/app/api/auth/me/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/me", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 401 si no hay sesión", async () => {
    mockGetSession.mockResolvedValue({ userId: null });
    const res = await PUT(makeRequest({ nombre: "X" }) as never);
    expect(res.status).toBe(401);
  });

  it("responde 400 con body inválido", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "a@b.c" });
    const res = await PUT(makeRequest({ email: "no-es-email" }) as never);
    expect(res.status).toBe(400);
  });

  it("actualiza nombre cuando todo es válido", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "a@b.c" });
    mockUserUpdate.mockResolvedValue({
      id: "u1",
      email: "a@b.c",
      nombre: "Nuevo",
      role: "ADMIN",
    });
    const res = await PUT(makeRequest({ nombre: "Nuevo" }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nombre).toBe("Nuevo");
    expect(body.passwordHash).toBeUndefined();
  });

  it("responde 403 si passwordActual no coincide", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "a@b.c" });
    mockUserFindUnique.mockResolvedValue({ id: "u1", passwordHash: "hashed:other" });
    const bcrypt = await import("bcryptjs");
    (bcrypt.default.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const res = await PUT(
      makeRequest({ passwordActual: "wrong", passwordNuevo: "newpass1" }) as never
    );
    expect(res.status).toBe(403);
  });

  it("responde 400 si email choca con otro usuario", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "a@b.c" });
    mockUserFindUnique.mockResolvedValue({ id: "u2", email: "other@b.c" });
    const res = await PUT(makeRequest({ email: "other@b.c" }) as never);
    expect(res.status).toBe(400);
  });

  it("actualiza password cuando el actual coincide", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "a@b.c" });
    mockUserFindUnique.mockResolvedValue({ id: "u1", passwordHash: "hashed:old" });
    mockUserUpdate.mockResolvedValue({
      id: "u1",
      email: "a@b.c",
      nombre: "X",
      role: "ADMIN",
    });
    const bcrypt = await import("bcryptjs");
    (bcrypt.default.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await PUT(
      makeRequest({ passwordActual: "old", passwordNuevo: "newpass1" }) as never
    );
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({ passwordHash: "hashed:newpass1" }),
      })
    );
  });
});
```

- [ ] **Step 2: Correr tests para verificar que fallan**

```bash
npm test -- tests/api/auth-me-put.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/auth/me/route'` o `PUT is not a function`.

- [ ] **Step 3: Implementar PUT**

Reemplazar `src/app/api/auth/me/route.ts` con:

```ts
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    autenticado: !!session.userId,
    email: session.email ?? null,
  });
}

const updateSchema = z
  .object({
    nombre: z.string().min(1).optional(),
    email: z.string().email().optional(),
    passwordActual: z.string().min(1).optional(),
    passwordNuevo: z.string().min(8).optional(),
  })
  .refine(
    (data) => {
      if (data.passwordNuevo && !data.passwordActual) return false;
      return true;
    },
    { message: "passwordActual requerido para cambiar password", path: ["passwordActual"] }
  );

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const updateData: {
    nombre?: string;
    email?: string;
    passwordHash?: string;
  } = {};

  if (data.nombre) updateData.nombre = data.nombre;

  if (data.email && data.email !== session.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== session.userId) {
      return NextResponse.json(
        { error: "Email ya en uso" },
        { status: 400 }
      );
    }
    updateData.email = data.email;
  }

  if (data.passwordNuevo) {
    if (!data.passwordActual) {
      return NextResponse.json(
        { error: "passwordActual requerido" },
        { status: 400 }
      );
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    const ok = await bcrypt.compare(data.passwordActual, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 403 });
    }
    updateData.passwordHash = await bcrypt.hash(data.passwordNuevo, 10);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: updateData,
    select: { id: true, email: true, nombre: true, role: true },
  });

  if (data.email && data.email !== session.email) {
    session.email = data.email;
    await session.save();
  }

  return NextResponse.json(updated);
}
```

- [ ] **Step 4: Correr tests**

```bash
npm test -- tests/api/auth-me-put.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/me/route.ts tests/api/auth-me-put.test.ts
git commit -m "feat(auth): PUT /api/auth/me para editar perfil"
```

---

## Task 5: Página de perfil

**Files:**
- Create: `src/components/backoffice/PerfilForm.tsx`
- Create: `src/app/backoffice/perfil/page.tsx`

- [ ] **Step 1: Crear `src/components/backoffice/PerfilForm.tsx`**

```tsx
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
```

- [ ] **Step 2: Crear `src/app/backoffice/perfil/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PerfilForm } from "@/components/backoffice/PerfilForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await requireAdmin();
  if (!session) redirect("/backoffice/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, nombre: true },
  });

  if (!user) redirect("/backoffice/login");

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-foreground/60">
          Cambiá tu nombre, email o contraseña.
        </p>
      </header>
      <PerfilForm user={user} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/backoffice/PerfilForm.tsx src/app/backoffice/perfil/page.tsx
git commit -m "feat(backoffice): página /backoffice/perfil con form de edición"
```

---

## Task 6: Link "Mi perfil" en el backoffice

**Files:**
- Modify: archivo de layout/header del backoffice (buscar el archivo)

- [ ] **Step 1: Encontrar el archivo de nav/header**

```bash
ls src/app/backoffice/
ls src/components/backoffice/
```

Si hay un `Header.tsx`, `Nav.tsx`, o `Sidebar.tsx` en components, o un `layout.tsx` en backoffice, identificar el archivo que contiene los links.

- [ ] **Step 2: Sumar el link**

En el archivo identificado, agregar un link `<a href="/backoffice/perfil">Mi perfil</a>` (o `Link` de next/link) en un lugar visible. Si no hay nav estructurada, agregar arriba del dashboard principal:

```tsx
<nav className="flex gap-4 text-sm">
  <Link href="/backoffice">Dashboard</Link>
  <Link href="/backoffice/perfil">Mi perfil</Link>
</nav>
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add <archivo-modificado>
git commit -m "feat(backoffice): link 'Mi perfil' en nav"
```

---

## Task 7: Endpoint de healthcheck

**Files:**
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Crear el endpoint**

```ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/health/route.ts
git commit -m "feat: endpoint /api/health para healthcheck de Railway"
```

---

## Task 8: railway.toml

**Files:**
- Create: `railway.toml`

- [ ] **Step 1: Crear el archivo**

```toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "sh start.sh"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

- [ ] **Step 2: Commit**

```bash
git add railway.toml
git commit -m "feat: railway.toml para deploy declarativo"
```

---

## Task 9: start.sh + check-and-seed

**Files:**
- Create: `start.sh`
- Create: `scripts/check-and-seed.js`

- [ ] **Step 1: Crear `scripts/check-and-seed.js`**

```js
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      console.log('[check-and-seed] DB vacía: corriendo seed...');
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
    } else {
      console.log(`[check-and-seed] DB ya poblada (${count} users). Saltando seed.`);
    }
  } catch (err) {
    console.error('[check-and-seed] Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
```

- [ ] **Step 2: Crear `start.sh`**

```sh
#!/bin/sh
set -e

export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://${RAILWAY_PUBLIC_DOMAIN:-localhost:3000}}"

echo "[start] NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL"
echo "[start] Aplicando schema..."
npx prisma db push --skip-generate

echo "[start] Check-and-seed..."
node scripts/check-and-seed.js

echo "[start] Arrancando Next.js..."
exec node server.js
```

- [ ] **Step 3: Hacer ejecutable**

```bash
chmod +x start.sh
```

- [ ] **Step 4: Validar sintaxis**

```bash
bash -n start.sh
node -c scripts/check-and-seed.js
```

Expected: ambos sin errores.

- [ ] **Step 5: Commit**

```bash
git add start.sh scripts/check-and-seed.js
git commit -m "feat: start.sh + check-and-seed.js para arranque en Railway"
```

---

## Task 10: Ajustar Dockerfile

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Quitar refs a SQLite**

Línea 40: quitar `ENV DATABASE_URL="file:/app/prisma/data/queseria.db"`.

Línea 57: quitar `mkdir -p /app/prisma/data && chown -R nextjs:nodejs /app/prisma/data`.

- [ ] **Step 2: Sumar tsx al runtime install**

Línea 43: cambiar el `npm install ...` para incluir `tsx`:

```dockerfile
RUN npm install --omit=dev --no-audit --no-fund --ignore-scripts prisma@5.22.0 tsx@4.19.2 && npm cache clean --force
```

- [ ] **Step 3: Copiar start.sh y hacerlo ejecutable**

Después de la última `COPY`, antes del `USER nextjs`, agregar:

```dockerfile
COPY --from=builder --chmod=755 /app/start.sh ./start.sh
COPY --from=builder /app/scripts ./scripts
```

- [ ] **Step 4: Cambiar CMD**

Última línea: cambiar:

```dockerfile
CMD ["sh", "start.sh"]
```

- [ ] **Step 5: Validar (si hay Docker local)**

```bash
docker build -t queseria-test .
```

Si no hay Docker, skipear este paso y validar manualmente que el archivo quede bien formado.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile
git commit -m "feat(docker): usar start.sh, sumar tsx, quitar refs a SQLite"
```

---

## Task 11: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Reemplazar la sección "Producción"**

Reemplazar la sección "Producción" actual con:

```markdown
## Deploy en Railway

Click en el botón para deployar con un click:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

### Pasos

1. Click en el botón de arriba.
2. Conectar este repo.
3. Agregar el plugin **Postgres** desde el dashboard de Railway.
4. Linkear el plugin Postgres al servicio web (Railway inyecta `DATABASE_URL` automáticamente).
5. En las variables de entorno del servicio web, setear `SESSION_PASSWORD` con un valor de 32+ caracteres. Generar uno con:
   ```bash
   openssl rand -hex 32
   ```
6. Deploy.

### Variables de entorno

| Variable | Origen | Descripción |
|----------|--------|-------------|
| `DATABASE_URL` | Auto (link Postgres) | Conexión a Postgres. |
| `SESSION_PASSWORD` | Manual | 32+ chars. Firma la cookie de sesión. |
| `NEXT_PUBLIC_SITE_URL` | Auto | Derivado de `RAILWAY_PUBLIC_DOMAIN` en `start.sh`. |
| `NODE_ENV` | Auto | `production`. |

Para dominio custom, setear `NEXT_PUBLIC_SITE_URL` manualmente en el dashboard.

### Migraciones

`prisma db push` corre automáticamente en cada arranque del container. No se necesitan migraciones manuales.

### Seed

Si la DB está vacía, el seed corre automáticamente la primera vez (admin + categorías + productos demo + puntos de origen + rangos de delivery). En redeploys subsecuentes se detecta que la DB ya está poblada y se saltea.

### Primer login

Tras el primer deploy, el admin se crea con las credenciales:
- Email: `admin@queseria.test`
- Password: `admin1234`

**Cambialas inmediatamente** desde `/backoffice/perfil`.

### Uploads

Las imágenes subidas van a `/public/uploads/`, que es **efímero** en Railway. En cada redeploy se pierden. Para producción real, migrar a S3/Cloudflare R2 (fuera de scope de este deploy).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: instrucciones de deploy en Railway"
```

---

## Task 12: Validaciones finales

**Files:**
- (sin cambios)

- [ ] **Step 1: Correr todos los tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: 0 errores (warnings OK).

- [ ] **Step 4: Validar schema**

```bash
npx prisma validate
```

Expected: OK.

- [ ] **Step 5: Validar scripts**

```bash
bash -n start.sh
node -c scripts/check-and-seed.js
```

Expected: ambos sin errores.

- [ ] **Step 6: Build local (opcional)**

```bash
npm run build
```

Expected: build exitoso.

---

## Task 13: Push a la rama

- [ ] **Step 1: Verificar status**

```bash
git status
```

Expected: working tree limpio.

- [ ] **Step 2: Push**

```bash
git push
```

Expected: push exitoso.

---

## Resumen de commits esperados

1. `docs: spec for Railway deploy with Postgres`
2. `feat: helper toNumber para campos Decimal + Vitest`
3. `feat(prisma): migrar a postgresql + Decimal para plata/distancia`
4. `refactor: usar toNumber para campos Decimal de Prisma`
5. `feat(auth): PUT /api/auth/me para editar perfil`
6. `feat(backoffice): página /backoffice/perfil con form de edición`
7. `feat(backoffice): link 'Mi perfil' en nav`
8. `feat: endpoint /api/health para healthcheck de Railway`
9. `feat: railway.toml para deploy declarativo`
10. `feat: start.sh + check-and-seed.js para arranque en Railway`
11. `feat(docker): usar start.sh, sumar tsx, quitar refs a SQLite`
12. `docs: instrucciones de deploy en Railway`

---

## Notas para el ejecutor

- **Orden importante**: Task 1 (helper) → Task 2 (schema) → Task 3 (usar helper) deben ir en secuencia. Sin la Task 1, los componentes no compilan.
- **Tests de Vitest**: el `--include` ya está configurado. Cada test individual puede correrse con `npm test -- <ruta>`.
- **Mocks en los tests**: el patron `vi.mock(...)` se aplica antes del import. Si ves errores de hoisting, revisar el orden.
- **Sin Docker local**: skipear validación de build. Igual Railway lo va a construir.
- **Sin acceso a Railway**: las tareas de validacion final (Task 12) son opcionales. El deploy real queda para el operador.
