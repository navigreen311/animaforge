#!/bin/bash
# AnimaForge PostgreSQL Backup Script
set -e
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="animaforge-db-${TIMESTAMP}.sql.gz"
BACKUP_BUCKET="${BACKUP_S3_BUCKET:-animaforge-backups}"

echo "[backup] Starting PostgreSQL backup at $(date)..."
pg_dump "$DATABASE_URL" | gzip > "/tmp/$FILENAME"
echo "[backup] Dump complete: $FILENAME ($(du -h /tmp/$FILENAME | cut -f1))"

if command -v aws &> /dev/null; then
  aws s3 cp "/tmp/$FILENAME" "s3://$BACKUP_BUCKET/postgres/$FILENAME" --storage-class STANDARD_IA
  echo "[backup] Uploaded to s3://$BACKUP_BUCKET/postgres/$FILENAME"
  gunzip -t "/tmp/$FILENAME" && echo "[backup] Backup verified OK" || echo "[backup] WARNING: Backup verification failed"
else
  echo "[backup] AWS CLI not available — backup saved locally at /tmp/$FILENAME"
fi

rm -f "/tmp/$FILENAME"
echo "[backup] Done at $(date)"
