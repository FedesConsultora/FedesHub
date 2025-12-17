#!/bin/bash
TS=$(date +%Y%m%d_%H%M)
mkdir -p /root/backups/db

docker exec fedes-hub_db \
  pg_dump -U $DB_USER -d $DB_NAME > /root/backups/db/fedeshub_$TS.sql
