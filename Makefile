.PHONY: setup dev test build deploy clean

# First-time setup
setup:
	@echo "Setting up AnimaForge development environment..."
	cp -n .env.example .env || true
	npm install
	cd packages/db && npx prisma generate
	docker-compose -f docker/docker-compose.yml up -d
	sleep 5
	cd packages/db && npx prisma migrate deploy
	cd packages/db && npx prisma db seed
	@echo "Setup complete! Run 'make dev' to start."

# Start all services
dev:
	npx concurrently \
		"cd services/platform-api && npx ts-node-dev src/index.ts" \
		"cd services/auth && npx ts-node-dev src/index.ts" \
		"cd services/billing && npx ts-node-dev src/index.ts" \
		"cd services/realtime && npx ts-node-dev src/index.ts" \
		"cd services/gateway && npx ts-node-dev src/index.ts" \
		"cd services/ai-api && uvicorn src.main:app --reload --port 8001" \
		"cd apps/web && npx next dev"

# Start infrastructure only
infra:
	docker-compose -f docker/docker-compose.yml up -d

# Stop infrastructure
infra-down:
	docker-compose -f docker/docker-compose.yml down

# Run all tests
test:
	npx vitest run
	cd services/ai-api && pytest
	npx playwright test

# Build all
build:
	cd apps/web && npm run build
	cd services/platform-api && npx tsc
	cd services/auth && npx tsc

# Database
db-migrate:
	cd packages/db && npx prisma migrate dev

db-seed:
	cd packages/db && npx prisma db seed

db-studio:
	cd packages/db && npx prisma studio

db-reset:
	cd packages/db && npx prisma migrate reset --force

# Docker full stack
docker-up:
	docker-compose -f docker/docker-compose.yml up -d --build

docker-down:
	docker-compose -f docker/docker-compose.yml down -v

# Clean
clean:
	rm -rf node_modules
	rm -rf apps/*/node_modules services/*/node_modules packages/*/node_modules
	rm -rf apps/web/.next
	rm -rf dist
