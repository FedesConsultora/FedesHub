#!/usr/bin/env bash
# 05-seed.sh
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose exec -T fedes-hub npx sequelize-cli db:seed:all
