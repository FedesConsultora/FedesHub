#!/usr/bin/env bash
# 02-up.sh
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose up -d --build
docker compose ps