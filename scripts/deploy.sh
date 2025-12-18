#!/usr/bin/env bash
set -euo pipefail

echo "====================================="
echo "  FedesHub - Deploy to Production"
echo "====================================="
echo ""

# Pull latest changes
echo "📥 Pulling latest changes from Git..."
git pull origin main

# Rebuild and restart containers
echo ""
echo "🔨 Rebuilding and restarting containers..."
# Usamos --build con up -d para recrear solo lo necesario sin tirar la red
docker compose up -d --build

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
echo "📝 To view logs, run:"
echo "   docker compose logs -f"
