#!/usr/bin/env bash
# Resetea la contraseña del admin en el container corriendo.
# Uso: ./reset-admin-password.sh <email> <nueva_password>
set -euo pipefail

EMAIL="${1:?Falta el email}"
PASS="${2:?Falta la nueva contraseña (mín 8 chars)}"
[[ ${#PASS} -lt 8 ]] && { echo "Error: la contraseña debe tener al menos 8 caracteres"; exit 1; }

CONTAINER="${CONTAINER_NAME:-queseria-app}"

HASH=$(docker exec "$CONTAINER" node -e "
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('$PASS', 10));
")

docker exec "$CONTAINER" node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.user.update({
    where: { email: '$EMAIL' },
    data: { passwordHash: '$HASH' },
  });
  console.log('✓ Contraseña actualizada para:', r.email);
  await p.\$disconnect();
})();
"
