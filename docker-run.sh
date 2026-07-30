#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Quesería — build + run detached
# Uso: ./docker-run.sh [start|stop|restart|logs|status|rebuild|reset]
# Si se llama sin argumentos, hace start.
# ============================================================================

IMAGE_NAME="${IMAGE_NAME:-queseria}"
CONTAINER_NAME="${CONTAINER_NAME:-queseria-app}"
HOST_PORT="${HOST_PORT:-3000}"
DATA_VOLUME="${DATA_VOLUME:-queseria-data}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-queseria-uploads}"
ENV_FILE="${ENV_FILE:-.env.docker}"

ACTION="${1:-start}"

cmd_start() {
  ensure_image
  ensure_env_file
  ensure_volumes

  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "→ Removiendo container previo ${CONTAINER_NAME}..."
    docker rm -f "${CONTAINER_NAME}" >/dev/null
  fi

  echo "→ Corriendo container detached en puerto ${HOST_PORT}..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    -p "${HOST_PORT}:3000" \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e HOSTNAME=0.0.0.0 \
    -e DATABASE_URL="file:/app/prisma/data/queseria.db" \
    --env-file "${ENV_FILE}" \
    -v "${DATA_VOLUME}:/app/prisma/data" \
    -v "${UPLOADS_VOLUME}:/app/public/uploads" \
    "${IMAGE_NAME}:latest"

  echo "✓ Listo."
  echo "  Tienda:    http://localhost:${HOST_PORT}"
  echo "  Backoffice: http://localhost:${HOST_PORT}/backoffice/login"
  echo "  Logs:      ./docker-run.sh logs"
  echo "  Stop:      ./docker-run.sh stop"
}

cmd_stop() {
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "→ Deteniendo ${CONTAINER_NAME}..."
    docker stop "${CONTAINER_NAME}" >/dev/null
    echo "✓ Detenido."
  else
    echo "Container ${CONTAINER_NAME} no está corriendo."
  fi
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_logs() {
  docker logs -f --tail=200 "${CONTAINER_NAME}"
}

cmd_status() {
  echo "=== Containers ==="
  docker ps -a --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  echo ""
  echo "=== Imágenes ==="
  docker images --filter "reference=${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
  echo ""
  echo "=== Volúmenes ==="
  docker volume ls --format "table {{.Name}}\t{{.Driver}}" | grep -E "NAME|${DATA_VOLUME}|${UPLOADS_VOLUME}" || echo "(sin volúmenes)"
  echo ""
  echo "=== Health ==="
  if curl -sf -o /dev/null --max-time 3 "http://localhost:${HOST_PORT}/" 2>/dev/null; then
    echo "✓ http://localhost:${HOST_PORT}/ responde"
  else
    echo "✗ http://localhost:${HOST_PORT}/ no responde"
  fi
}

cmd_rebuild() {
  echo "→ Rebuilding ${IMAGE_NAME}:latest..."
  docker build -t "${IMAGE_NAME}:latest" .
  echo "✓ Build completado."
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    cmd_restart
  fi
}

cmd_reset() {
  read -rp "¿Borrar container, volúmenes (DB + uploads) e imagen? [y/N] " confirm
  if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
    echo "Cancelado."
    return
  fi
  cmd_stop || true
  docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
  docker volume rm "${DATA_VOLUME}" 2>/dev/null || true
  docker volume rm "${UPLOADS_VOLUME}" 2>/dev/null || true
  docker rmi "${IMAGE_NAME}:latest" 2>/dev/null || true
  echo "✓ Reset completo."
}

ensure_image() {
  if ! docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:latest$"; then
    echo "→ Imagen ${IMAGE_NAME}:latest no existe. Construyendo..."
    docker build -t "${IMAGE_NAME}:latest" .
  fi
}

ensure_env_file() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    echo "→ Creando ${ENV_FILE} con valores por defecto..."
    cat > "${ENV_FILE}" <<EOF
SESSION_PASSWORD=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64)
NEXT_PUBLIC_SITE_URL=http://localhost:${HOST_PORT}
EOF
    echo "  Editá ${ENV_FILE} si querés cambiar el SESSION_PASSWORD o SITE_URL."
  fi
}

ensure_volumes() {
  docker volume create "${DATA_VOLUME}" >/dev/null
  docker volume create "${UPLOADS_VOLUME}" >/dev/null
}

print_help() {
  cat <<'EOF'
Quesería — gestor del container Docker

Uso: ./docker-run.sh [comando] [opciones]

Comandos:
  start       Build (si no existe) + arranca el container en background (alias por defecto).
  stop        Detiene el container sin borrar datos.
  restart     stop + start.
  logs        Sigue los logs del container (Ctrl+C para salir).
  status      Muestra containers, imágenes, volúmenes y health check.
  rebuild     Reconstruye la imagen desde cero y reinicia si estaba corriendo.
  reset       Borra container, volúmenes (DB + uploads) e imagen (pide confirmación).
  -h, --help  Muestra esta ayuda.

Variables de entorno (opcionales):
  IMAGE_NAME       Nombre de la imagen Docker        (default: queseria)
  CONTAINER_NAME   Nombre del container              (default: queseria-app)
  HOST_PORT        Puerto del host a publicar        (default: 3000)
  DATA_VOLUME      Volumen para la base de datos     (default: queseria-data)
  UPLOADS_VOLUME   Volumen para uploads              (default: queseria-uploads)
  ENV_FILE         Archivo con SESSION_PASSWORD etc. (default: .env.docker)

Ejemplos:
  ./docker-run.sh                       # arranca (lo mismo que 'start')
  ./docker-run.sh start                 # arranca
  ./docker-run.sh logs                  # ver logs en vivo
  HOST_PORT=8080 ./docker-run.sh start  # usar otro puerto

Después de 'start' por primera vez:
  Abrí http://localhost:3000/backoffice/login y creá la primera cuenta admin.
EOF
}

case "${ACTION}" in
  -h|--help|help) print_help ;;
  start)    cmd_start ;;
  stop)     cmd_stop ;;
  restart)  cmd_restart ;;
  logs)     cmd_logs ;;
  status)   cmd_status ;;
  rebuild)  cmd_rebuild ;;
  reset)    cmd_reset ;;
  *)
    echo "Comando desconocido: ${ACTION}" >&2
    echo "Ejecutá '$0 --help' para ver los comandos disponibles." >&2
    exit 1
    ;;
esac
