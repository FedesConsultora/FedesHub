#!/usr/bin/env bash
# 04-migrate.sh
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose exec -T fedes-hub npx sequelize-cli db:migrate
