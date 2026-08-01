# Deploy a Railway — Diseño

**Fecha:** 2026-08-01
**Estado:** Aprobado por el usuario, pendiente de implementación.

## Resumen

Volver la app Quesería desplegable en Railway con un click, usando Postgres como base de datos. Mantener la app como monolito Next.js 14 (sin redis, sin queue, sin servicios externos). Sumar un endpoint para que el admin pueda actualizar su perfil tras el primer login.

## Objetivos

1. Deploy reproducible en Railway con un Dockerfile ya existente.
2. Migrar la DB de SQLite a Postgres (proveído por el plugin oficial de Railway).
3. Auto-seed en el primer arranque de una DB vacía. Idempotente: no toca DBs ya pobladas.
4. El operador no necesita configurar variables de entorno excepto `SESSION_PASSWORD`.
5. El admin puede cambiar su nombre, email y password desde el backoffice.
6. Healthcheck funcional para que Railway sepa cuándo el servicio está listo.

## No-objetivos

- Volumen persistente para `/public/uploads`. Documentado como limitación; los uploads se pierden en cada redeploy.
- Migración a S3/Cloudflare R2.
- CDN para assets.
- HTTPS custom (Railway lo provee automáticamente con el subdominio `*.railway.app`).
- Email transaccional (recuperación de password, etc.). El cambio de password es self-service desde el perfil.
- Tests E2E. Solo tests unitarios/local del schema, Dockerfile, y endpoint de perfil.

## Arquitectura

Dos servicios en Railway:

- **`web`** — App Next.js 14 standalone, construida desde el Dockerfile existente. Puerto 3000. Lee `DATABASE_URL`, `SESSION_PASSWORD`, `NEXT_PUBLIC_SITE_URL` del entorno.
- **`db`** — Postgres 16 vía plugin oficial de Railway. Railway inyecta `DATABASE_URL` al servicio `web` cuando se linkean en el dashboard.

El código no contiene lógica condicional para el provider de DB. Prisma se adapta al `provider` definido en `schema.prisma`.

## Cambios concretos

### 1. `prisma/schema.prisma`

- `provider = "sqlite"` → `provider = "postgresql"`.
- En los modelos `Producto`, `PuntoOrigen`, `RangoDelivery`, `Orden`, los campos monetarios y de distancia (`Float`) → `Decimal`:
  - `Producto.precio`, `Producto.descuentoPct`.
  - `PuntoOrigen.lat`, `PuntoOrigen.lng`.
  - `RangoDelivery.desdeKm`, `RangoDelivery.hastaKm`, `RangoDelivery.costo`.
  - `Orden.subtotal`, `Orden.costoDelivery`, `Orden.distanciaKm`, `Orden.total`.
- Decimal en Postgres mapea a `numeric`. SQLite no tiene `Decimal` pero en producción va a Postgres.
- `String` para JSON serializado (`items`, `imagenes`, `colores`, `camposCliente`) se queda igual. Funciona en ambos providers.

### 2. `prisma/seed.ts`

Sin cambios estructurales. Las llamadas a bcrypt y a Prisma siguen funcionando. Prisma maneja la conversión de tipos al provider nuevo.

### 3. `Dockerfile`

- Quitar línea `ENV DATABASE_URL="file:/app/prisma/data/queseria.db"` (Railway lo inyecta).
- Quitar `mkdir -p /app/prisma/data && chown -R nextjs:nodejs /app/prisma/data` (ya no aplica).
- Mantener `mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads`. Uploads siguen siendo locales y efímeros.
- Cambiar línea 43 a `npm install --omit=dev --no-audit --no-fund --ignore-scripts prisma@5.22.0 tsx@4.19.2`. `tsx` es necesario para correr el seed en runtime.
- Copiar `start.sh` con permiso ejecutable: `COPY --from=builder --chmod=755 /app/start.sh ./start.sh`.
- Cambiar el CMD a `["sh", "start.sh"]`.

### 4. `start.sh` (nuevo)

Script ejecutable en la raíz del proyecto (`chmod +x start.sh`). Corre en cada arranque del container:

```sh
#!/bin/sh
set -e

# Derivar NEXT_PUBLIC_SITE_URL desde RAILWAY_PUBLIC_DOMAIN si no está seteado
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://${RAILWAY_PUBLIC_DOMAIN:-localhost:3000}}"

# Aplica migraciones / sincroniza schema
npx prisma db push --skip-generate

# Auto-seed si la DB está vacía
node scripts/check-and-seed.js

# Arranca Next.js
node server.js
```

### 5. `scripts/check-and-seed.js` (nuevo)

Pequeño script Node que consulta el conteo de `User` con Prisma. Si está vacío, corre el seed:

```js
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      console.log('DB vacía: corriendo seed...');
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
    } else {
      console.log(`DB ya poblada (${count} users). Saltando seed.`);
    }
  } finally {
    await prisma.$disconnect();
  }
})();
```

Idempotente: solo corre el seed la primera vez contra una DB nueva.

### 6. `railway.toml` (nuevo)

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

### 7. `src/app/api/health/route.ts` (nuevo)

Route handler que responde 200 con `{ status: "ok" }`. Lee el timestamp para que devuelva algo dinámico. No toca DB.

### 8. `src/app/api/auth/me/route.ts` (extender)

Hoy solo existe `GET /api/auth/me`. Sumar `PUT /api/auth/me` con body:

```ts
{
  nombre?: string,
  email?: string,
  passwordActual?: string,
  passwordNuevo?: string,
}
```

Reglas:
- Requiere sesión activa (admin logueado).
- Si viene `passwordActual`: obligatoria. Valida con bcrypt contra `passwordHash` actual.
- Si viene `passwordNuevo`: requiere `passwordActual`, mínimo 8 chars.
- Si viene `email`: valida formato (zod email), valida que no choque con otro User.
- Si viene `nombre`: mínimo 1 char.
- Devuelve el User actualizado sin `passwordHash`.
- Status 400 con detalle si validación falla.
- Status 401 si no hay sesión.
- Status 403 si `passwordActual` no coincide.

### 9. `src/app/backoffice/perfil/page.tsx` (nuevo)

Página Server Component protegida por el middleware existente. Client Component embebido para el formulario con tres secciones:

- Datos: nombre, email.
- Contraseña: actual, nueva, repetir nueva.
- Submit único que llama a `PUT /api/auth/me`.

Tras éxito, muestra toast y refresca la sesión (logout + redirect a login si cambió la password).

### 10. Link en el backoffice

Agregar un link "Mi perfil" en el header del backoffice (junto al link de logout o en el nav existente). Si no hay nav común, se coloca en el header del dashboard.

### 11. `README.md`

Actualizar la sección "Producción":

- Badge `[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)` linkeando a Railway.
- Pasos:
  1. Click en el botón.
  2. Conectar este repo.
  3. Agregar el plugin Postgres.
  4. Linkear el plugin al servicio web (Railway inyecta `DATABASE_URL`).
  5. Setear `SESSION_PASSWORD` (generar con `openssl rand -hex 32`).
  6. Deploy.
- Sección **Migraciones**: aclarar que `prisma db push` corre automáticamente en cada arranque.
- Sección **Uploads**: aclarar que `/public/uploads` es efímero y se pierde en redeploys. Migración a S3/R2 queda fuera de scope.
- Sección **Primer login**: link a `/backoffice/perfil` para cambiar la password quemada.

## Variables de entorno en Railway

| Variable | Origen | Descripción |
|----------|--------|-------------|
| `DATABASE_URL` | Auto (link Postgres) | Cadena de conexión provista por el plugin. |
| `SESSION_PASSWORD` | Manual (operador) | 32+ chars. Generar con `openssl rand -hex 32`. |
| `NODE_ENV` | Auto (`production`) | Lo setea Railway. |
| `PORT` | Auto (`3000`) | Lo setea Railway. |
| `RAILWAY_PUBLIC_DOMAIN` | Auto | Dominio asignado. Usado por `start.sh` para derivar `NEXT_PUBLIC_SITE_URL`. |
| `NEXT_PUBLIC_SITE_URL` | Derivado | `start.sh` lo setea a `https://$RAILWAY_PUBLIC_DOMAIN` si no está. |

El operador solo configura `SESSION_PASSWORD`. El resto es automático.

Si el operador quiere un dominio custom, debe setear `NEXT_PUBLIC_SITE_URL` en el dashboard y `start.sh` respetará ese valor (no lo sobrescribirá).

## Manejo de errores

- `prisma db push` falla en runtime → el container no arranca → Railway reintenta según `restartPolicyMaxRetries=3`. Logs visibles en el dashboard.
- Seed falla → `start.sh` sale con código 1 → container no arranca. Operador debe ver logs.
- `NEXT_PUBLIC_SITE_URL` vacío → fallback a `http://localhost:3000`. Inútil en prod pero no rompe.
- Uploads perdidos → no es un error manejado, es una limitación documentada.

## Testing

Validable localmente:

- `npx prisma validate` debe pasar con `provider = "postgresql"`.
- `npx prisma format` para asegurar formato limpio.
- `docker build .` debe completarse (requiere Docker local).
- `bash -n start.sh` para validar sintaxis.
- `node -c scripts/check-and-seed.js` para validar sintaxis.
- Test manual del flujo `PUT /api/auth/me` con un mock de sesión y DB de tests.

No validable localmente:

- Conexión real a Postgres de Railway.
- Inyección automática de `DATABASE_URL`.
- Healthcheck de Railway.

El operador valida el deploy real y reporta cualquier issue.

## Riesgos

- **Uploads efímeros**: ya documentado. No es bloqueante para demo/staging.
- **Build con Sharp**: el Dockerfile actual ya maneja las deps nativas de sharp. No esperado regresión.
- **Decimal vs Float en JS**: Prisma devuelve `Decimal` como objeto. Si el código hace `precio.toFixed(2)` directamente, podría fallar. Hay que revisar todos los lugares que formatean plata. Plan: convertir con `Number(precio)` o usar `.toNumber()` del objeto Decimal.
- **Decimal en distancia**: similar. `Math.haversine` devuelve `number`, al asignar a un campo Decimal no hay pérdida pero la lectura devuelve `Decimal`. Revisar `lib/delivery.ts`.

## Plan de implementación (resumen)

1. Modificar `prisma/schema.prisma` (provider + Decimal).
2. Crear `scripts/check-and-seed.js`.
3. Crear `start.sh`.
4. Modificar `Dockerfile`.
5. Crear `railway.toml`.
6. Crear `src/app/api/health/route.ts`.
7. Modificar `src/app/api/auth/me/route.ts` (sumar PUT).
8. Crear `src/app/backoffice/perfil/page.tsx` con Client Component.
9. Sumar link "Mi perfil" en el header del backoffice.
10. Revisar lugares que formatean plata/distancia y ajustar por `Decimal`.
11. Actualizar `README.md`.
12. Validaciones locales: `prisma validate`, `docker build`, `bash -n start.sh`, `node -c scripts/check-and-seed.js`.
13. `git add . && git commit` y luego `git push` a la rama actual.

## Costo estimado (Railway)

- Plan Hobby: $5/mes de crédito incluido.
- Servicio `web` (1 vCPU, 512MB RAM): ~$3-5/mes con tráfico bajo.
- Servicio `db` (Postgres 256MB RAM, 1GB storage): $0 dentro del crédito del Hobby.
- Total esperado: $0-5/mes mientras el uso entre en el crédito incluido.
