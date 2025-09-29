#!/usr/bin/env bash
# 03-down.sh
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose down
