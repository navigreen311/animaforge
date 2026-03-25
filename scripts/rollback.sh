#!/bin/bash
set -euo pipefail

# AnimaForge - Rollback Deployment
# Usage: ./scripts/rollback.sh [environment] [revision]

ENV="${1:-staging}"
REVISION="${2:-}"
NAMESPACE="animaforge-$ENV"

echo "========================================="
echo "AnimaForge - Rollback on $ENV"
echo "Namespace: $NAMESPACE"
echo "========================================="

# Validate environment
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "ERROR: Invalid environment '$ENV'. Must be 'staging' or 'production'."
  exit 1
fi

# Check kubectl
if ! kubectl cluster-info &>/dev/null; then
  echo "ERROR: kubectl not configured or cluster unreachable."
  exit 1
fi

# For production blue-green: switch traffic back to previous slot
if [[ "$ENV" == "production" ]]; then
  echo "Production blue-green rollback..."

  ACTIVE=$(kubectl get svc animaforge-router \
    --namespace "$NAMESPACE" \
    -o jsonpath='{.spec.selector.slot}' 2>/dev/null || echo "unknown")

  if [[ "$ACTIVE" == "blue" ]]; then
    ROLLBACK_TO="green"
  elif [[ "$ACTIVE" == "green" ]]; then
    ROLLBACK_TO="blue"
  else
    echo "ERROR: Cannot determine active slot (got: $ACTIVE)"
    echo "Manual intervention required."
    exit 1
  fi

  echo "Active slot: $ACTIVE"
  echo "Rolling back to: $ROLLBACK_TO"

  kubectl patch svc animaforge-router \
    --namespace "$NAMESPACE" \
    -p "{\"spec\":{\"selector\":{\"slot\":\"$ROLLBACK_TO\"}}}"

  echo "Traffic switched to $ROLLBACK_TO slot."
  echo ""
  echo "Verifying rollback..."
  sleep 5

  CURRENT=$(kubectl get svc animaforge-router \
    --namespace "$NAMESPACE" \
    -o jsonpath='{.spec.selector.slot}')

  if [[ "$CURRENT" == "$ROLLBACK_TO" ]]; then
    echo "Rollback verified: traffic now on $ROLLBACK_TO"
  else
    echo "WARNING: Rollback verification failed. Current slot: $CURRENT"
    exit 1
  fi

else
  # For staging: use kubectl rollout undo
  echo "Rolling back staging deployments..."

  services=(platform-api auth billing realtime workers gateway export notification search analytics ai-api web)
  for svc in "${services[@]}"; do
    if kubectl get deployment "$svc" --namespace "$NAMESPACE" &>/dev/null; then
      echo "  Rolling back $svc..."
      if [[ -n "$REVISION" ]]; then
        kubectl rollout undo deployment/"$svc" \
          --namespace "$NAMESPACE" \
          --to-revision="$REVISION"
      else
        kubectl rollout undo deployment/"$svc" \
          --namespace "$NAMESPACE"
      fi
      echo "  OK: $svc rolled back"
    else
      echo "  SKIP: $svc not found"
    fi
  done

  echo ""
  echo "Waiting for rollback to complete..."
  for svc in "${services[@]}"; do
    if kubectl get deployment "$svc" --namespace "$NAMESPACE" &>/dev/null; then
      kubectl rollout status deployment/"$svc" \
        --namespace "$NAMESPACE" \
        --timeout=300s
    fi
  done
fi

echo ""
echo "========================================="
echo "Rollback on $ENV completed."
echo "========================================="
