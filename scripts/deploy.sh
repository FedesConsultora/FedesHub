#!/usr/bin/env bash
set -euo pipefail

echo "====================================="
echo "  FedesHub - Deploy to Production"
echo "====================================="
echo ""

# Move up to the project root (assumes the script is in /scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Pull latest changes
echo "📥 Pulling latest changes from Git..."
git pull origin main

# Check if .env files exist where expected
if [ ! -f "backend/.env" ]; then
    echo "❌ Error: backend/.env not found. Please create it first."
    exit 1
fi

# Rebuild and restart containers
echo ""
echo "🔨 Rebuilding and restarting containers..."
# Usamos --build con up -d para recrear solo lo necesario sin tirar la red
docker compose up -d --build --remove-orphans

# Reload del proxy global para refrescar IPs de los contenedores
echo ""
echo "🔄 Refreshing global proxy (fedes-proxy)..."
if docker ps --format '{{.Names}}' | grep -q "^fedes-proxy$"; then
    docker exec fedes-proxy nginx -s reload
    echo "✅ Proxy reloaded."
else
    echo "⚠️  fedes-proxy not found, skipping reload."
fi

# Check status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Container status:"
docker compose ps

echo ""
echo "📝 Ultimas lineas del backend:"
docker compose logs backend --tail 20

echo ""
echo "📝 To view all logs, run:"
docker compose logs -f
