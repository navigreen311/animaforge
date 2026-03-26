#!/bin/bash
sleep 3
mc alias set af http://minio:9000 animaforge animaforge_dev
mc mb af/animaforge-assets --ignore-existing
mc anonymous set public af/animaforge-assets
echo "MinIO bucket created."
