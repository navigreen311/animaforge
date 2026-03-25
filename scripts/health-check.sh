#!/bin/bash
set -euo pipefail

# AnimaForge - Health Check All Services
# Usage: HEALTH_CHECK_URL=https://staging.animaforge.com ./scripts/health-check.sh
# Or:    ./scripts/health-check.sh [base-url]

BASE_URL="${HEALTH_CHECK_URL:-${1:-http://localhost}}"
TIMEOUT="${HEALTH_CHECK_TIMEOUT:-10}"
RETRIES="${HEALTH_CHECK_RETRIES:-3}"
RETRY_DELAY="${HEALTH_CHECK_RETRY_DELAY:-5}"

echo "========================================="
echo "AnimaForge - Health Check"
echo "Base URL: $BASE_URL"
echo "Timeout: ${TIMEOUT}s | Retries: $RETRIES"
echo "========================================="

# Define service health endpoints
declare -A ENDPOINTS=(
  ["platform-api"]="/api/health"
  ["auth"]="/auth/health"
  ["billing"]="/billing/health"
  ["realtime"]="/realtime/health"
  ["gateway"]="/health"
  ["export"]="/export/health"
  ["notification"]="/notification/health"
  ["search"]="/search/health"
  ["analytics"]="/analytics/health"
  ["ai-api"]="/ai/health"
  ["web"]="/"
)

PASSED=0
FAILED=0
FAILED_SERVICES=()

for svc in "${!ENDPOINTS[@]}"; do
  endpoint="${ENDPOINTS[$svc]}"
  url="${BASE_URL}${endpoint}"
  success=false

  for attempt in $(seq 1 "$RETRIES"); do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" \
      --max-time "$TIMEOUT" 2>/dev/null || echo "000")

    if [[ "$status" -ge 200 && "$status" -lt 400 ]]; then
      echo "  OK   [$status] $svc ($endpoint)"
      success=true
      break
    fi

    if [[ "$attempt" -lt "$RETRIES" ]]; then
      echo "  RETRY [$status] $svc ($endpoint) - attempt $attempt/$RETRIES"
      sleep "$RETRY_DELAY"
    fi
  done

  if [[ "$success" == true ]]; then
    PASSED=$((PASSED + 1))
  else
    echo "  FAIL [$status] $svc ($endpoint)"
    FAILED=$((FAILED + 1))
    FAILED_SERVICES+=("$svc")
  fi
done

echo ""
echo "========================================="
echo "Results: $PASSED passed, $FAILED failed"
if [[ $FAILED -gt 0 ]]; then
  echo "Failed services: ${FAILED_SERVICES[*]}"
  echo "========================================="
  exit 1
fi
echo "All services healthy!"
echo "========================================="
