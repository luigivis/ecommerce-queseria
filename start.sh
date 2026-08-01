#!/bin/sh
set -e

export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://${RAILWAY_PUBLIC_DOMAIN:-localhost:3000}}"
export PORT="${PORT:-3000}"
export HOSTNAME=0.0.0.0

echo "[start] NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL"
echo "[start] PORT=$PORT HOSTNAME=$HOSTNAME"

if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "================================================================"
  echo " ERROR: DATABASE_URL no está seteada."
  echo ""
  echo " El servicio web no está linkeado al plugin Postgres."
  echo " En Railway: click derecho en el servicio Postgres →"
  echo " 'Connect' → 'Connect to [nombre-del-servicio-web]'."
  echo "================================================================"
  exit 1
fi

echo "[start] DATABASE_URL set: yes"
echo "[start] Aplicando schema..."
npx prisma db push --skip-generate

echo "[start] Check-and-seed..."
node scripts/check-and-seed.js

echo "[start] Arrancando Next.js..."
exec node server.js
