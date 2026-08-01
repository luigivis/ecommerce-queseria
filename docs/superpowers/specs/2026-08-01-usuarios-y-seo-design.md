# Gestión de usuarios + SEO de imagen — Diseño

**Fecha:** 2026-08-01
**Estado:** Aprobado por el usuario, pendiente de implementación.

## Resumen

Dos cambios en un PR:

1. **Gestión de usuarios** — agregar CRUD de usuarios en el backoffice. Roles: `ADMIN`, `OPERADOR`, `VENDEDOR`. Soft-delete con campo `activo`.
2. **SEO de imagen** — el `og:image` de la ficha de producto debe apuntar a una URL absoluta. Si el producto no tiene imagen, fallback al logo del sitio. Si tampoco hay logo, fallback a un placeholder estático.

## Objetivos

1. Admin puede crear, editar, reset password y desactivar usuarios desde el backoffice.
2. Solo ADMIN puede gestionar usuarios. OPERADOR y VENDEDOR ven el backoffice pero no `/backoffice/usuarios`.
3. Al compartir una ficha de producto en Facebook/WhatsApp/Twitter, la imagen preview es la primera imagen del producto, o el logo del sitio, o un placeholder.
4. Test E2E verifica que el HTML contiene un `og:image` con URL absoluta.

## No-objetivos

- Sistema de invitación por email.
- Recuperación de password por email.
- Auditoría de quién creó/editó usuarios.
- Roles personalizados con permisos granulares.
- Cambio de password en el primer login (ya descartado por el usuario).
- Validación de email (link de confirmación).
- POS de venta rápida y export CSV (sub-proyectos 2 y 3).

## Sub-proyecto 1: Gestión de usuarios

### Schema (`prisma/schema.prisma`)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         String   @default("ADMIN")  // ADMIN | OPERADOR | VENDEDOR
  nombre       String
  activo       Boolean  @default(true)
  createdAt    DateTime @default(now())
}
```

`role` queda como `String` (mismo patrón que `Orden.estado`) — sin enums de Postgres para mantener simplicidad en migraciones. La capa de aplicación valida que el valor sea uno de los tres.

### API routes

| Ruta | Método | Auth | Descripción |
|------|--------|------|-------------|
| `/api/usuarios` | GET | ADMIN | Lista todos (incluye inactivos). |
| `/api/usuarios` | POST | ADMIN | Crea uno. Body: `{ email, nombre, role, password }`. |
| `/api/usuarios/[id]` | PUT | ADMIN | Edita `{ nombre, email, role, activo }`. |
| `/api/usuarios/[id]` | DELETE | ADMIN | Soft-delete: `activo = false`. |
| `/api/usuarios/[id]/password` | PUT | ADMIN | Reset password. Body: `{ password }`. |

Reglas:
- No se puede editar ni desactivar a sí mismo (status 409).
- Email único validado por la DB y duplicate-check en POST/PUT.
- Role debe ser uno de `ADMIN | OPERADOR | VENDEDOR` (zod enum).
- Password mínimo 8 chars.
- Listado oculta `passwordHash` en la respuesta.

### UI: `/backoffice/usuarios`

**Files:**
- `src/app/backoffice/(protected)/usuarios/page.tsx` — Server Component.
- `src/app/backoffice/(protected)/usuarios/UsuariosClient.tsx` — Client Component.

**ServerComponent** carga la lista de usuarios desde `prisma.user.findMany()`, lo pasa al Client.

**ClientComponent** muestra:
- Header: título "Usuarios" + botón "Nuevo usuario".
- Filtro: input "Buscar" filtra por email/nombre.
- Tabla: email, nombre, rol (badge con color por rol), estado (badge activo/inactivo), fecha creación, acciones (editar, reset password, activar/desactivar).
- Modal/drawer para crear/editar con campos: email, nombre, rol (select), activo (solo en edit).
- Modal de confirmación para soft-delete.
- Modal de reset password (pedir nueva password).

**Sidebar**: agregar link "Usuarios" con icono `Users` en `src/app/backoffice/(protected)/layout.tsx`. Solo visible para ADMIN.

## Sub-proyecto 2: SEO de imagen

### Problema actual

`generateMetadata` y `JSON-LD` en `app/productos/[slug]/page.tsx` usan `imgs[0]` y `cfg.logoUrl` que son URLs relativas tipo `/uploads/xxx.webp`. El `metadataBase` del layout las convierte en absolutas, pero:
- En Railway, `NEXT_PUBLIC_SITE_URL` puede ser `http://localhost:3000` si `RAILWAY_PUBLIC_DOMAIN` no se setea en runtime.
- En Facebook Sharing Debugger, una URL relativa o localhost no resuelve.

### Fix

**Files:**
- `src/app/productos/[slug]/page.tsx` — agregar helper `toAbsoluteUrl`.
- `public/og-default.png` — placeholder nuevo 1200x630.

**Helper** (en `src/app/productos/[slug]/page.tsx`):

```ts
function toAbsoluteUrl(path: string | undefined, baseUrl: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
```

**Aplicación** en `generateMetadata` y `JSON-LD`:

```ts
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const imgs: string[] = JSON.parse(p.imagenes || "[]");
const ogImage =
  toAbsoluteUrl(imgs[0], baseUrl) ||
  toAbsoluteUrl(cfg.logoUrl, baseUrl) ||
  `${baseUrl.replace(/\/$/, "")}/og-default.png`;
```

Mismo cambio para el `image: imgs` del JSON-LD — convertir cada uno a absoluto.

### Default placeholder

`public/og-default.png` — 1200x630 PNG con fondo color primario y texto "Quesería" + nombre del sitio. Lo diseño y agrego como asset estático. Si no se puede generar el PNG desde acá, uso un comando `convert` de ImageMagick con la tipografía Cabin/Amatic SC (no disponible localmente), o lo creo programáticamente con `node -e` y `sharp`.

Simplificación: usar un SVG simple y convertirlo a PNG con `sharp`. O agregar el SVG directamente y que el browser lo use. Facebook solo acepta PNG/JPG. Voy a generarlo con `sharp` desde el script.

### Test E2E del OG

**Files:**
- `tests/seo/og-image.test.ts`

Test que:
1. Mockea `prisma.producto.findUnique` para devolver un producto con imagen y sin imagen.
2. Mockea `getConfiguracion` para devolver un logo.
3. Hace `GET` interno a la página `/productos/[slug]`.
4. Verifica que el HTML resultante contiene `og:image` con URL absoluta.

Implementación: usar `next/test` o invocar el handler manualmente. Más simple: importar `src/app/productos/[slug]/page.tsx` y llamar a `generateMetadata({ params: { slug: "test" } })` directamente, mockeando Prisma. Verifica que el resultado tiene `openGraph.images[0].url` con URL absoluta.

Idempotente. No necesita DB.

## Cambios concretos (orden)

### 1. `prisma/schema.prisma`

- `User.activo Boolean @default(true)`.

### 2. `prisma/seed.ts`

- Sumar `activo: true` en la creación del admin (no es necesario, pero alinea con el schema).

### 3. `src/app/api/usuarios/route.ts` (nuevo)

```ts
// GET: lista usuarios
// POST: crea usuario con password hasheado
```

### 4. `src/app/api/usuarios/[id]/route.ts` (nuevo)

```ts
// PUT: edita
// DELETE: soft-delete
```

### 5. `src/app/api/usuarios/[id]/password/route.ts` (nuevo)

```ts
// PUT: resetea password (solo ADMIN)
```

### 6. `src/app/backoffice/(protected)/usuarios/page.tsx` (nuevo)

Server Component que carga lista y pasa a Client.

### 7. `src/components/backoffice/UsuariosClient.tsx` (nuevo)

Client con tabla, modal crear/editar, modal reset password, modal activar/desactivar.

### 8. `src/app/backoffice/(protected)/layout.tsx`

Sumar link "Usuarios" con icono `Users` en el nav para ADMIN.

### 9. `src/app/productos/[slug]/page.tsx`

- Helper `toAbsoluteUrl`.
- Aplicar en `generateMetadata` y `JSON-LD`.

### 10. `public/og-default.png`

Imagen 1200x630 PNG con fondo de color y nombre del sitio.

### 11. `tests/seo/og-image.test.ts`

Test E2E del OG.

### 12. `src/middleware.ts`

No requiere cambios (el middleware ya protege `/backoffice/*`).

### 13. `README.md`

- Documentar roles.
- Documentar cómo verificar OG con Facebook Sharing Debugger.

## Variables de entorno

Ninguna nueva. `NEXT_PUBLIC_SITE_URL` se usa para OG (operador debe setear en dashboard Railway).

## Manejo de errores

- POST usuario con email duplicado → 400.
- PUT/DELETE sobre el propio user → 409.
- Role inválido → 400.
- Password corto → 400.
- DELETE sobre usuario ya inactivo → 204 (idempotente).

## Testing

- `tests/api/usuarios.test.ts` — CRUD endpoints (opcional, sumar si hay tiempo).
- `tests/seo/og-image.test.ts` — verifica URL absoluta del og:image.

Validación manual:
- Login admin → ir a `/backoffice/usuarios` → crear un OPERADOR → logout → login con OPERADOR → no ver "Usuarios" en el sidebar.
- Compartir ficha de producto en Facebook Debugger → verificar preview.

## Riesgos

- **Subtle**: si el operador nunca setea `NEXT_PUBLIC_SITE_URL`, el OG usa `http://localhost:3000`. Documentado.
- **Race condition**: dos admins creando usuario con el mismo email al mismo tiempo. La constraint única de Postgres lo bloquea. Devolvemos 400.
- **Self-edit bloqueado**: si un admin es el único, no puede desactivarse. Documentar.

## Plan de implementación (resumen)

1. Schema (User.activo).
2. API routes de usuarios.
3. UI `/backoffice/usuarios`.
4. Sidebar link.
5. Helper `toAbsoluteUrl` + aplicar en `productos/[slug]`.
6. Generar `public/og-default.png`.
7. Test `og-image`.
8. README.

## Costo estimado

Sin cambios de infra. Postgres ya soporta. Sin variables nuevas.
