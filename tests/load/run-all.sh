#!/bin/bash
set -e
echo "Running AnimaForge load tests..."
for test in api-health api-auth api-projects api-generation api-search websocket full-workflow; do
  echo "=== Running $test ==="
  k6 run tests/load/$test.js --env BASE_URL=${BASE_URL:-http://localhost:4000}
done
echo "All load tests complete."
