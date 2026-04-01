# AR Menu Platform — convenience commands
# Usage: make <target>

.PHONY: dev up down seed reset logs build help

## Start only the database (run backend + frontend locally)
dev:
	docker compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "✅ PostgreSQL running on localhost:5432"
	@echo "   user: ar_menu  |  password: ar_menu_secret  |  db: ar_menu"
	@echo ""
	@echo "Next steps:"
	@echo "  cd backend  && npm run db:push && npm run db:seed && npm run dev"
	@echo "  cd frontend && npm run dev"

## Start the full stack (requires .env file at project root)
up:
	docker compose up --build -d
	@echo ""
	@echo "✅ Full stack running"
	@echo "   Frontend : http://localhost:3000"
	@echo "   Backend  : http://localhost:4000"
	@echo "   Menu     : http://localhost:3000/r/golden-fork"
	@echo "   Admin    : http://localhost:3000/admin"

## Stop all containers
down:
	docker compose down
	docker compose -f docker-compose.dev.yml down

## Seed the database with test data (db must be running)
seed:
	cd backend && npm run db:seed

## Reset database and re-seed
reset:
	cd backend && npm run db:reset

## Tail logs for all services
logs:
	docker compose logs -f

## Tail logs for backend only
logs-backend:
	docker compose logs -f backend

## Build all Docker images (no cache)
build:
	docker compose build --no-cache

help:
	@echo "Available targets:"
	@echo "  make dev          — Start only PostgreSQL (local dev)"
	@echo "  make up           — Start full stack in Docker"
	@echo "  make down         — Stop all containers"
	@echo "  make seed         — Seed test data"
	@echo "  make reset        — Wipe DB and re-seed"
	@echo "  make logs         — Tail all container logs"
	@echo "  make build        — Rebuild images without cache"
