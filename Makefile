# Every command runs inside Docker; the host only needs Docker (and make).
COMPOSE := docker compose
RUN     := $(COMPOSE) run --rm app
# The Supabase CLI container mounts the project at its host path (see compose.yaml).
SUPABASE := HOST_PROJECT_DIR=$(CURDIR) $(COMPOSE) run --rm supabase

.PHONY: help setup supabase-start supabase-stop supabase-status up down logs sh install vapid \
        migrate migration seed studio lint typecheck format test test-watch e2e check build prod clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## First-time setup: .env, images, dependencies, local Supabase and migrations
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example")
	$(COMPOSE) build app supabase
	$(RUN) pnpm install
	$(SUPABASE) start
	$(RUN) pnpm db:deploy

supabase-start: ## Start the local Supabase stack (Studio: http://localhost:56323)
	$(SUPABASE) start

supabase-stop: ## Stop the local Supabase stack (data is kept)
	$(SUPABASE) stop

supabase-status: ## Show local Supabase URLs and keys
	$(SUPABASE) status

up: ## Start the Next.js dev server on http://localhost:3100 (needs supabase-start)
	$(COMPOSE) up app

down: ## Stop the app containers (Supabase keeps running; see supabase-stop)
	$(COMPOSE) --profile prod --profile tools down

logs: ## Follow app logs
	$(COMPOSE) logs -f app

sh: ## Open a shell in the app container
	$(RUN) sh

install: ## Install/refresh dependencies inside the container
	$(RUN) pnpm install

migrate: ## Apply pending migrations to the dev database
	$(RUN) pnpm db:deploy

migration: ## Create a migration from schema changes: make migration name=add_something
	$(RUN) sh -c "pnpm prisma migrate dev --name $(name) && pnpm prisma generate"
	@# The dev server keeps the old Prisma client in memory; restart it if it is running.
	@$(COMPOSE) ps --status running --services | grep -qx app && $(COMPOSE) restart app || true

vapid: ## Generate Web Push keys; copy them to VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in .env
	$(RUN) pnpm exec web-push generate-vapid-keys

seed: ## Load demo data (demo@lucapp.local / demo12345)
	$(RUN) pnpm db:seed

studio: ## Open Prisma Studio on http://localhost:5555
	$(COMPOSE) run --rm -p 127.0.0.1:5555:5555 app pnpm prisma studio --port 5555 --browser none

lint: ## ESLint, including the architecture rules
	$(RUN) pnpm lint

typecheck: ## TypeScript compiler
	$(RUN) pnpm typecheck

format: ## Format the code with Prettier
	$(RUN) pnpm format

test: ## Unit + integration tests (integration uses a separate lucapp_test database)
	$(RUN) pnpm test

test-watch: ## Tests in watch mode
	$(RUN) pnpm test:watch

e2e: ## End-to-end tests with Playwright (needs `make up` running)
	$(COMPOSE) --profile tools run --rm e2e

check: ## Lint + typecheck + tests (what CI runs)
	$(RUN) sh -c "pnpm lint && pnpm typecheck && pnpm test"

build: ## Build the production image
	docker build --target runner -t lucapp:latest .

prod: ## Run the production image against Supabase Cloud (.env.production) on http://localhost:3101
	$(COMPOSE) --profile prod up --build migrate web

clean: ## Remove app containers and volumes (Supabase data is untouched)
	$(COMPOSE) --profile prod --profile tools down -v
