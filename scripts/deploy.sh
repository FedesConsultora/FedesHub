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
echo "🔨 Rebuilding containers..."
docker compose build --no-cache

echo ""
echo "🔄 Restarting services..."
docker compose down
docker compose up -d

# Check status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Container status:"
docker compose ps

echo ""
echo "📝 To view logs, run:"
echo "   docker compose logs -f"
