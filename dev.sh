#!/bin/bash

# Este script levanta el entorno de desarrollo ideal para el proyecto:
# - DB y Backend en Docker (con volúmenes para persistencia y auto-reload).
# - Frontend localmente (para que el Hot Reload sea instantáneo en Mac).
cd "$(dirname "$0")"

echo "� Deteniendo contenedores previos..."
docker compose down --remove-orphans

echo "�🐳 Iniciando Base de Datos y Backend en Docker..."
docker compose -f docker-compose.dev.yml up -d fedeshub-db backend

echo "⌛ Esperando a que el backend esté listo..."
sleep 5

echo "🗄️ Ejecutando migraciones de base de datos..."
docker exec fedes-hub_backend_dev npm run migrate

echo "✨ Iniciando Frontend localmente en el puerto 3000..."
cd frontend && npm run dev -- --port 3000
