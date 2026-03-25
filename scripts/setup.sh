#!/bin/bash
set -e
echo "🎬 AnimaForge Development Setup"
echo "================================"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js required. Install from https://nodejs.org"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker required. Install from https://docker.com"; exit 1; }

# Environment
[ -f .env ] || cp .env.example .env
echo "✓ Environment file ready"

# Dependencies
npm install
echo "✓ Dependencies installed"

# Infrastructure
docker-compose -f docker/docker-compose.yml up -d
echo "✓ Infrastructure started (PostgreSQL, Redis, Elasticsearch, MinIO)"

# Wait for Postgres
echo "Waiting for PostgreSQL..."
until docker exec af-postgres pg_isready -U animaforge 2>/dev/null; do sleep 1; done
echo "✓ PostgreSQL ready"

# Database
cd packages/db
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push
npx prisma db seed
cd ../..
echo "✓ Database migrated and seeded"

echo ""
echo "🎬 AnimaForge is ready!"
echo "Run 'make dev' to start all services"
echo "Web: http://localhost:3000"
echo "API: http://localhost:4000"
echo "Prisma Studio: make db-studio"
