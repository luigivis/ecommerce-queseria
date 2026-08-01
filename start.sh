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
