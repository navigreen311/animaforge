#!/bin/bash
set -euo pipefail

# AnimaForge - Build All Services
# Usage: ./scripts/build-all.sh [tag]

TAG="${1:-latest}"
REGISTRY="${REGISTRY:-animaforge}"

echo "========================================="
echo "AnimaForge - Building All Services"
echo "Tag: $TAG"
echo "Registry: $REGISTRY"
echo "========================================="

# Node.js microservices
services=(platform-api auth billing realtime workers gateway export notification search analytics)
for svc in "${services[@]}"; do
  echo ""
  echo "--- Building $svc ---"
  if [ -d "services/$svc" ]; then
    docker build -t "$REGISTRY/$svc:$TAG" "services/$svc"
    echo "Built: $REGISTRY/$svc:$TAG"
  else
    echo "WARN: services/$svc not found, skipping"
  fi
done

# Python AI API
echo ""
echo "--- Building ai-api ---"
docker build -t "$REGISTRY/ai-api:$TAG" services/ai-api
echo "Built: $REGISTRY/ai-api:$TAG"

# Web frontend
echo ""
echo "--- Building web ---"
docker build -t "$REGISTRY/web:$TAG" apps/web
echo "Built: $REGISTRY/web:$TAG"

echo ""
echo "========================================="
echo "All services built successfully!"
echo "========================================="

# List built images
docker images "$REGISTRY/*:$TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
