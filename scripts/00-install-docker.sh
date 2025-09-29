#!/usr/bin/env bash
# 00-install-docker.sh  (AlmaLinux/RHEL/CentOS-friendly)
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  # limpiar restos viejos (no falla si no existen)
  dnf -y remove docker docker-client docker-client-latest docker-common \
    docker-latest docker-latest-logrotate docker-logrotate docker-engine || true

  # repo oficial de Docker (usa el de CentOS para RHEL/AlmaLinux)
  dnf -y install dnf-plugins-core
  dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

  # engine + compose v2 (plugin) + buildx
  dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable --now docker
fi

# versiones
docker --version
docker compose version || docker-compose --version
