# Quesería — Ecommerce + Backoffice

Monolito Next.js 14 (App Router) + TypeScript + Tailwind + Prisma + SQLite para una quesería con catálogo, carrito por sesión, checkout con mapa, cálculo de delivery por km, backoffice completo y envío a WhatsApp.

## Stack

- **Next.js 14** (App Router, Server Components, Route Handlers)
- **TypeScript** estricto
- **Prisma** + **SQLite** (archivo embebido, ideal para ~100 productos)
- **Tailwind CSS** + variables CSS editables desde el backoffice
- **Leaflet** + OpenStreetMap para la ubicación del cliente (sin API keys)
- **iron-session** para autenticación con cookie httpOnly
- **Zustand** persistido en `sessionStorage` para el carrito por sesión
- **sharp** para optimización de imágenes subidas

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno (ya hay un .env por defecto)
# Editar .env si querés cambiar la contraseña del admin

# 3. Crear la base de datos
npx prisma db push

# 4. Sembrar datos demo (admin + categorías + productos)
npm run db:seed

# 5. Levantar el servidor
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) para la tienda.
El backoffice está en [http://localhost:3000/backoffice](http://localhost:3000/backoffice).

**Credenciales iniciales del admin:**
- Email: `admin@queseria.test`
- Password: `admin1234`

## Estructura

```
src/
├── app/
│   ├── (storefront)/
│   │   ├── page.tsx              # Home (hero + destacados + categorías)
│   │   ├── productos/            # Catálogo con búsqueda + ficha con JSON-LD
│   │   ├── carrito/              # Vista del carrito (también como drawer)
│   │   ├── checkout/             # Mapa + datos + calcular envío + 2 botones
│   │   └── confirmacion/[id]/    # Post-checkout
│   ├── backoffice/
│   │   ├── login/                # Login email+password
│   │   ├── page.tsx              # Dashboard
│   │   ├── productos/            # CRUD + upload múltiple
│   │   ├── categorias/           # CRUD
│   │   ├── puntos-origen/        # CRUD múltiples sucursales
│   │   ├── delivery/             # CRUD rangos por km
│   │   ├── configuracion/        # Logo, colores, textos, plantillas WhatsApp
│   │   └── ordenes/              # Confirmar/Cancelar/Eliminar con manejo de stock
│   ├── api/
│   │   ├── auth/                 # login, logout, me
│   │   ├── productos/            # GET público, POST admin
│   │   ├── categorias/
│   │   ├── puntos-origen/
│   │   ├── rangos-delivery/
│   │   ├── configuracion/
│   │   ├── upload/               # multipart → WebP optimizado
│   │   ├── ordenes/              # POST público (checkout), cambiar estado, DELETE
│   │   └── delivery/calcular/    # POST {lat,lng} → {costo,distancia,puntoOrigen}
│   ├── sitemap.ts                # Autogenerado
│   └── robots.ts
├── components/
│   ├── storefront/               # Header, Footer, ProductCard, CartDrawer, MapPicker...
│   └── backoffice/               # ProductosClient, OrdenesClient, ConfiguracionClient...
├── lib/
│   ├── db.ts                     # Prisma client
│   ├── session.ts                # iron-session options
│   ├── auth.ts                   # Helpers de sesión
│   ├── delivery.ts               # Haversine + cálculo contra puntos
│   ├── whatsapp.ts               # renderPlantilla + buildWhatsappUrl
│   ├── config.ts                 # Colores CSS vars, campos de cliente
│   ├── format.ts                 # slugify, formatPrice
│   └── site.ts                   # getConfiguracion() singleton
├── store/
│   └── cart.ts                   # Zustand persistido en sessionStorage
└── middleware.ts                 # Protege /backoffice/*
```

## Funcionalidades

### Tienda (público, optimizado SEO)

- Home con hero editable, productos destacados y categorías.
- Catálogo `/productos` con:
  - Búsqueda full-text por nombre/descripción
  - Filtro por categoría
  - Filtro "solo ofertas"
  - Orden alfabético
- Ficha `/productos/[slug]` con:
  - SSG/SSR dinámico
  - Meta title/description dinámicas
  - OpenGraph + Twitter cards
  - JSON-LD `Product` con precio, disponibilidad, imágenes, marca
  - URL canónica
  - Galería de imágenes
- Carrito drawer persistente en `sessionStorage` (se cierra al cerrar la pestaña).
- Checkout con:
  - Campos editables desde backoffice (nombre, teléfono, email, notas)
  - Mapa clickeable (OpenStreetMap + Leaflet)
  - Textarea de dirección escrita + referencias (ambos métodos)
  - Cálculo de envío contra el punto de origen más cercano (Haversine)
  - Botón **Comprar** y botón **Cotizar**
- Confirmación de pedido con número de orden y siguientes pasos.
- `sitemap.xml` y `robots.txt` autogenerados.

### Backoffice (autenticado)

- Login email + password (cookie httpOnly, firmada).
- Dashboard con métricas del día.
- **Productos**: CRUD con imágenes múltiples, drag-to-reorder, promoción, destacado, stock.
- **Categorías**: CRUD.
- **Puntos de origen**: múltiples sucursales (el envío se calcula contra la más cercana al cliente).
- **Rangos de delivery**: tabla CRUD (ej: 0-5km = C$30, 5-15km = C$80, etc.).
- **Órdenes**: lista expandible con datos del cliente, productos, ubicación en mapa, manejo de stock al confirmar/cancelar/eliminar.
- **Configuración**: nombre del sitio, logo, moneda, texto del hero, **colores editables con preview en vivo**, **plantillas de WhatsApp con placeholders clickeables** (`{{nombre}}`, `{{productos}}`, `{{total}}`, etc.), campos del formulario de contacto editables.

### Flujo de checkout → WhatsApp

1. Cliente llena datos, marca ubicación en el mapa, escribe dirección.
2. Cliente hace click en "Calcular envío" → API devuelve distancia y costo desde el punto más cercano.
3. Cliente hace click en **Comprar** o **Cotizar**.
4. API crea la orden con estado `PENDIENTE`, devuelve `whatsappUrl` armado con la plantilla configurable.
5. El frontend abre WhatsApp en nueva pestaña y redirige a la pantalla de confirmación.
6. El equipo ve la orden en el backoffice, confirma (descuenta stock), cancela (devuelve stock) o la elimina.

## SEO

- Cada ficha de producto tiene JSON-LD con `@type: Product`, `offers.price`, `offers.priceCurrency: NIO`, `availability` y `image[]`.
- `sitemap.xml` dinámico con todas las fichas activas y categorías.
- `robots.txt` bloquea `/backoffice`, `/checkout`, `/confirmacion`, `/api`.
- OpenGraph + Twitter Card en cada página.
- Idioma declarado como `es-NI`.

### Open Graph (preview al compartir)

Cada ficha de producto expone `og:image` con URL absoluta. La cadena de fallback:

1. Primera imagen del producto (`Producto.imagenes[0]`).
2. Logo del sitio (`Configuracion.logoUrl`).
3. Placeholder estático en `/og-default.png`.

`NEXT_PUBLIC_SITE_URL` debe estar seteado en producción con la URL completa (ej: `https://ecommerce-queseria-production.up.railway.app`). Si no, las URLs del fallback apuntan a `http://localhost:3000` y los previews de Facebook/WhatsApp no resuelven.

Para verificar: compartir una ficha en [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) o [Twitter Card Validator](https://cards-dev.twitter.com/validator).

## Roles de usuario

- **ADMIN** — Acceso completo. Único que puede gestionar usuarios desde `/backoffice/usuarios`.
- **OPERADOR** — Gestiona productos, categorías, órdenes, etc. No ve `/backoffice/usuarios`.
- **VENDEDOR** — Igual que OPERADOR por ahora. Reservado para un futuro POS de venta rápida.

El admin inicial viene del seed:
- Email: `admin@queseria.test`
- Password: `admin1234`

**Cambialas en `/backoffice/perfil`** apenas puedas. Para crear más usuarios, ingresá como ADMIN y andá a `/backoffice/usuarios`.

## Cálculo de delivery

- Haversine contra todos los puntos de origen activos.
- Se toma el de menor distancia.
- Se busca el rango `[desdeKm, hastaKm]` correspondiente en la tabla CRUD.
- Si no hay rango que cubra → se indica "fuera de cobertura" pero el cliente puede cotizar.

## Manejo de stock

- `PENDIENTE` → `CONFIRMADA`: descuenta stock (valida disponibilidad primero).
- `CONFIRMADA` → `CANCELADA` o `PENDIENTE`: devuelve stock.
- Eliminar orden: devuelve stock si estaba confirmada o en preparación.
- Cada movimiento queda registrado en la tabla `MovimientoStock`.

## Idioma

Todo el copy de la tienda y del backoffice está en **español de Nicaragua**.

## Variables de entorno

```
SESSION_PASSWORD=  # 32+ caracteres, firma de la cookie
DATABASE_URL=      # file:./dev.db
ADMIN_EMAIL=       # Email del admin inicial
ADMIN_PASSWORD=    # Password del admin inicial
NEXT_PUBLIC_SITE_URL=  # URL pública para sitemap y JSON-LD
NODE_ENV=          # development | production
```

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

## Scripts

- `npm run dev` — Dev server
- `npm run build` — Build de producción
- `npm run start` — Servidor de producción
- `npm run lint` — ESLint
- `npm run db:push` — Sincronizar schema con DB
- `npm run db:seed` — Sembrar datos demo
- `npm run db:studio` — Prisma Studio (GUI de DB)
