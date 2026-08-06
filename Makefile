# Chantia — commandes utiles du monorepo.
# `make` ou `make help` pour la liste (groupée par application).
# Préfixes : (global) · api-* · web-* (front) · mobile-*

# --- Variables ---------------------------------------------------------------
PNPM         := pnpm
COMPOSE      := docker compose
COMPOSE_DEV  := docker compose -f docker-compose.yml -f docker-compose.dev.yml

API_DIR      := apps/api
WEB_DIR      := apps/web
MOBILE_DIR   := apps/mobile

API_URL      := http://localhost:8080
WEB_URL      := http://localhost:3000

# Identifiants pour les cibles de smoke-test (surchargeables : make api-login EMAIL=…)
EMAIL        ?= admin@ellouze-construction.fr
PASSWORD     ?=
# Jeton d'accès, à passer aux cibles authentifiées : make api-worksites TOKEN=$(...)
TOKEN        ?=

DB_CONTAINER := chantia-db
DB_USER      := chantia
DB_NAME      := chantia

.DEFAULT_GOAL := help

# --- Aide (auto-générée, groupée par section ##@) ----------------------------
.PHONY: help
help: ## Affiche cette aide
	@awk 'BEGIN {FS = ":.*##"} \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5); next } \
		/^[a-zA-Z0-9_-]+:.*##/ { printf "  \033[36m%-26s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

##@ Global (monorepo)
.PHONY: install build typecheck test lint clean
install: ## Installe les dépendances (pnpm, tout le monorepo)
	$(PNPM) install
build: ## Build tout le monorepo (turbo)
	$(PNPM) build
typecheck: ## Typecheck tout le monorepo
	$(PNPM) typecheck
test: ## Lance tous les tests
	$(PNPM) test
lint: ## Lint tout le monorepo
	$(PNPM) lint
clean: ## Nettoie les artefacts de build
	$(PNPM) clean

##@ API — application (hors Docker)
.PHONY: api-dev api-build api-typecheck api-test
api-dev: ## Lance l'API en local (hot-reload, nécessite Postgres: make api-up-db)
	$(PNPM) --filter @chantia/api dev
api-build: ## Build l'API
	$(PNPM) --filter @chantia/api build
api-typecheck: ## Typecheck l'API
	$(PNPM) --filter @chantia/api typecheck
api-test: ## Tests de l'API
	$(PNPM) --filter @chantia/api test

##@ API — Docker (Postgres + API)
.PHONY: api-up api-up-build api-up-dev api-up-db api-down api-nuke api-restart api-rebuild api-image api-ps
api-up: ## Démarre la stack (db + api) en arrière-plan
	$(COMPOSE) up -d
api-up-build: ## Reconstruit les images puis démarre la stack
	$(COMPOSE) up -d --build
api-up-dev: ## Démarre en mode DEV hot-reload (code monté, nest --watch)
	$(COMPOSE_DEV) up -d --build
api-up-db: ## Démarre uniquement Postgres
	$(COMPOSE) up -d db
api-down: ## Arrête et supprime les conteneurs (garde les données)
	$(COMPOSE) down
api-nuke: ## Arrête tout ET supprime le volume Postgres (⚠ efface les données)
	$(COMPOSE) down -v
api-restart: ## Redémarre l'API
	$(COMPOSE) restart api
api-rebuild: ## Reconstruit l'API sans cache et la relance
	$(COMPOSE) build --no-cache api
	$(COMPOSE) up -d api
api-image: ## Construit l'image Docker de l'API
	$(COMPOSE) build api
api-ps: ## État des conteneurs
	$(COMPOSE) ps

##@ API — Logs & shell
.PHONY: api-logs api-logs-db api-logs-dev api-shell
api-logs: ## Suit les logs de l'API
	$(COMPOSE) logs -f api
api-logs-db: ## Suit les logs de Postgres
	$(COMPOSE) logs -f db
api-logs-dev: ## Suit les logs de l'API en mode dev
	$(COMPOSE_DEV) logs -f api
api-shell: ## Ouvre un shell dans le conteneur de l'API
	docker exec -it chantia-api sh

##@ API — Prisma / migrations
.PHONY: api-prisma-generate api-migrate api-migrate-create api-migrate-deploy api-migrate-status api-studio
api-prisma-generate: ## Génère le client Prisma
	cd $(API_DIR) && $(PNPM) exec prisma generate
api-migrate: ## Crée + applique une migration en dev  (usage: make api-migrate name=ma_migration)
	cd $(API_DIR) && $(PNPM) exec prisma migrate dev --name $(name)
api-migrate-create: ## Crée une migration vide sans l'appliquer  (usage: make api-migrate-create name=ma_migration)
	cd $(API_DIR) && $(PNPM) exec prisma migrate dev --create-only --name $(name)
api-migrate-deploy: ## Applique les migrations en attente (déploiement)
	cd $(API_DIR) && $(PNPM) exec prisma migrate deploy
api-migrate-status: ## Affiche l'état des migrations
	cd $(API_DIR) && $(PNPM) exec prisma migrate status
api-studio: ## Ouvre Prisma Studio (UI base de données)
	cd $(API_DIR) && $(PNPM) exec prisma studio

##@ API — Base de données & santé
.PHONY: api-psql api-db-orgs api-db-users api-health api-login api-worksites
api-psql: ## Ouvre un shell psql sur la base
	docker exec -it $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME)
api-db-orgs: ## Liste les organisations (schéma identity)
	docker exec $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME) -c 'SELECT id, name, currency FROM identity.organization;'
api-db-users: ## Liste les comptes (sans les hashs)
	docker exec $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME) -c 'SELECT email, role, active, "lastLoginAt" FROM identity.app_user ORDER BY email;'
api-health: ## Vérifie que l'API répond
	curl -s $(API_URL)/health && echo
api-login: ## Récupère un access token — make api-login EMAIL=… PASSWORD=…
	@curl -s -X POST $(API_URL)/auth/login -H 'Content-Type: application/json' \
		-d '{"email":"$(EMAIL)","password":"$(PASSWORD)"}' \
		| python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("accessToken") or d)'
api-worksites: ## GET /worksites — make api-worksites TOKEN=$$(make -s api-login PASSWORD=…)
	curl -s -H "Authorization: Bearer $(TOKEN)" $(API_URL)/worksites && echo

##@ Web (front) — Next.js
.PHONY: web-dev web-build web-start web-typecheck
web-dev: ## Lance le front en local (Next.js, http://localhost:3000)
	$(PNPM) --filter @chantia/web dev
web-build: ## Build le front (next build)
	$(PNPM) --filter @chantia/web build
web-start: ## Démarre le front en mode production (après web-build)
	$(PNPM) --filter @chantia/web start
web-typecheck: ## Typecheck le front
	$(PNPM) --filter @chantia/web typecheck

##@ Mobile — Expo (à venir : apps/mobile pas encore scaffoldé)
.PHONY: mobile-start
mobile-start: ## Démarre l'app mobile (Expo)
	$(PNPM) --filter @chantia/mobile start
