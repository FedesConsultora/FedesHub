#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/hub"
BACKUP_DIR="/srv/backups/db"
ENV_FILE="$APP_DIR/.env"
CONTAINER_DB="fedes-hub_db"

# Cargar variables del .env
set -a
source "$ENV_FILE"
set +a

TS=$(date +"%Y%m%d_%H%M")
mkdir -p "$BACKUP_DIR"

echo "==> Backup DB $DB_NAME ($TS)"

docker exec "$CONTAINER_DB" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" \
  > "$BACKUP_DIR/fedeshub_${TS}.sql"

echo "==> Backup generado en $BACKUP_DIR"
