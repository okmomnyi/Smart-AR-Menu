# AR Menu Platform — convenience commands.
.PHONY: help dev up down seed reset logs build check

help:
	@echo "  make dev     Start PostgreSQL only (run the apps locally)"
	@echo "  make up      Start the full stack in Docker (needs a root .env)"
	@echo "  make down    Stop all containers"
	@echo "  make seed    Load demo data (database must be running)"
	@echo "  make reset   Wipe the database and re-seed"
	@echo "  make check   Typecheck both apps and run the auth smoke test"
	@echo "  make logs    Tail container logs"

## PostgreSQL only, for local `npm run dev` in each app.
dev:
	docker compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "PostgreSQL is on localhost:5434 (user/password/db: ar_menu / ar_menu_secret / ar_menu)"
	@echo ""
	@echo "Next:"
	@echo "  cd backend  && npm run db:migrate && npm run db:seed && npm run dev"
	@echo "  cd frontend && npm run dev"

## Full stack. Requires .env at the repository root (cp .env.docker .env).
up:
	docker compose up --build -d
	@echo ""
	@echo "  Frontend  http://localhost:3000"
	@echo "  API       http://localhost:4000"
	@echo "  Admin     http://localhost:3000/admin"

down:
	docker compose down
	docker compose -f docker-compose.dev.yml down

seed:
	cd backend && npm run db:seed

reset:
	cd backend && npm run db:reset

logs:
	docker compose logs -f

build:
	docker compose build --no-cache

## Everything that can be checked without a running database.
check:
	cd backend  && npx tsc --noEmit && npm run build && npm run verify:auth
	cd frontend && npx tsc --noEmit && npm run lint && npm run build
