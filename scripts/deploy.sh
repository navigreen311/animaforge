#!/bin/bash
set -euo pipefail

# AnimaForge - Deploy to Environment
# Usage: ./scripts/deploy.sh [environment] [image-tag]

ENV="${1:-staging}"
IMAGE_TAG="${2:-latest}"
NAMESPACE="animaforge-$ENV"
TIMEOUT="${DEPLOY_TIMEOUT:-300s}"

echo "========================================="
echo "AnimaForge - Deploying to $ENV"
echo "Namespace: $NAMESPACE"
echo "Image tag: $IMAGE_TAG"
echo "Timeout: $TIMEOUT"
echo "========================================="

# Validate environment
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "ERROR: Invalid environment '$ENV'. Must be 'staging' or 'production'."
  exit 1
fi

# Check kubectl is configured
if ! kubectl cluster-info &>/dev/null; then
  echo "ERROR: kubectl not configured or cluster unreachable."
  exit 1
fi

# Check namespace exists
if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
  echo "Creating namespace $NAMESPACE..."
  kubectl create namespace "$NAMESPACE"
fi

# Apply kustomize overlay
echo ""
echo "Applying Kubernetes manifests..."
if [ -d "k8s/overlays/$ENV" ]; then
  export IMAGE_TAG
  kubectl apply -k "k8s/overlays/$ENV/" --namespace "$NAMESPACE"
else
  echo "WARN: k8s/overlays/$ENV not found, using base manifests"
  kubectl apply -k k8s/ --namespace "$NAMESPACE"
fi

# Wait for rollouts
echo ""
echo "Waiting for rollouts to complete..."
services=(platform-api auth billing realtime workers gateway export notification search analytics ai-api web)
FAILED=()

for svc in "${services[@]}"; do
  echo "  Rolling out $svc..."
  if kubectl get deployment "$svc" --namespace "$NAMESPACE" &>/dev/null; then
    if ! kubectl rollout status deployment/"$svc" \
      --namespace "$NAMESPACE" \
      --timeout="$TIMEOUT"; then
      FAILED+=("$svc")
      echo "  FAIL: $svc did not roll out in time"
    else
      echo "  OK: $svc"
    fi
  else
    echo "  SKIP: $svc deployment not found"
  fi
done

echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "========================================="
  echo "DEPLOYMENT FAILED"
  echo "Failed services: ${FAILED[*]}"
  echo "========================================="
  echo ""
  echo "Run rollback: ./scripts/rollback.sh $ENV"
  exit 1
fi

echo "========================================="
echo "Deployment to $ENV completed successfully!"
echo "========================================="
