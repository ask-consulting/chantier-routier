# Chantier Routier — commandes utiles (API + Postgres via Docker).
# Lance `make` ou `make help` pour la liste.

# --- Variables ---------------------------------------------------------------
COMPOSE      := docker compose
COMPOSE_DEV  := docker compose -f docker-compose.yml -f docker-compose.dev.yml
API_DIR      := apps/api
API_URL      := http://localhost:8080
ORG_ID       := b62107ee-2174-463f-9365-1fa967cc1925   # organisation "ELLOUZE construction"
DB_CONTAINER := chantier-db
DB_USER      := chantier
DB_NAME      := chantier
PNPM         := pnpm

.DEFAULT_GOAL := help

# --- Aide --------------------------------------------------------------------
.PHONY: help
help: ## Affiche cette aide
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# --- Dépendances -------------------------------------------------------------
.PHONY: install
install: ## Installe les dépendances (pnpm, monorepo)
	$(PNPM) install

# --- Docker: cycle de vie ----------------------------------------------------
.PHONY: up
up: ## Démarre toute la stack (db + api) en arrière-plan
	$(COMPOSE) up -d

.PHONY: up-build
up-build: ## Reconstruit les images puis démarre la stack
	$(COMPOSE) up -d --build

.PHONY: up-dev
up-dev: ## Démarre en mode DEV avec hot-reload (code monté, nest --watch)
	$(COMPOSE_DEV) up -d --build

.PHONY: logs-dev
logs-dev: ## Suit les logs de l'API en mode dev
	$(COMPOSE_DEV) logs -f api

.PHONY: up-db
up-db: ## Démarre uniquement Postgres
	$(COMPOSE) up -d db

.PHONY: build
build: ## Construit l'image de l'API
	$(COMPOSE) build api

.PHONY: down
down: ## Arrête et supprime les conteneurs (garde les données)
	$(COMPOSE) down

.PHONY: nuke
nuke: ## Arrête tout ET supprime le volume Postgres (⚠ efface les données)
	$(COMPOSE) down -v

.PHONY: restart
restart: ## Redémarre l'API
	$(COMPOSE) restart api

.PHONY: rebuild
rebuild: ## Reconstruit l'API sans cache et la relance
	$(COMPOSE) build --no-cache api
	$(COMPOSE) up -d api

.PHONY: ps
ps: ## Liste l'état des conteneurs
	$(COMPOSE) ps

# --- Logs --------------------------------------------------------------------
.PHONY: logs
logs: ## Suit les logs de toute la stack
	$(COMPOSE) logs -f

.PHONY: logs-api
logs-api: ## Suit les logs de l'API
	$(COMPOSE) logs -f api

.PHONY: logs-db
logs-db: ## Suit les logs de Postgres
	$(COMPOSE) logs -f db

# --- Prisma / migrations -----------------------------------------------------
.PHONY: prisma-generate
prisma-generate: ## Génère le client Prisma
	cd $(API_DIR) && $(PNPM) exec prisma generate

.PHONY: migrate
migrate: ## Crée + applique une migration en dev  (usage: make migrate name=ma_migration)
	cd $(API_DIR) && $(PNPM) exec prisma migrate dev --name $(name)

.PHONY: migrate-create
migrate-create: ## Crée une migration vide sans l'appliquer  (usage: make migrate-create name=ma_migration)
	cd $(API_DIR) && $(PNPM) exec prisma migrate dev --create-only --name $(name)

.PHONY: migrate-deploy
migrate-deploy: ## Applique les migrations en attente (déploiement)
	cd $(API_DIR) && $(PNPM) exec prisma migrate deploy

.PHONY: migrate-status
migrate-status: ## Affiche l'état des migrations
	cd $(API_DIR) && $(PNPM) exec prisma migrate status

.PHONY: studio
studio: ## Ouvre Prisma Studio (UI base de données)
	cd $(API_DIR) && $(PNPM) exec prisma studio

# --- Base de données ---------------------------------------------------------
.PHONY: psql
psql: ## Ouvre un shell psql sur la base
	docker exec -it $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME)

.PHONY: db-orgs
db-orgs: ## Liste les organisations
	docker exec $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME) -c 'SELECT id, name, currency FROM organization;'

# --- Développement (hors Docker) ---------------------------------------------
.PHONY: dev
dev: ## Lance l'API en local avec hot-reload (nécessite Postgres: make up-db)
	$(PNPM) --filter @chantier/api dev

.PHONY: shell
shell: ## Ouvre un shell dans le conteneur de l'API
	docker exec -it chantier-api sh

# --- Qualité -----------------------------------------------------------------
.PHONY: test
test: ## Lance les tests (monorepo)
	$(PNPM) test

.PHONY: typecheck
typecheck: ## Vérifie les types (monorepo)
	$(PNPM) typecheck

.PHONY: lint
lint: ## Lance le linter (monorepo)
	$(PNPM) lint

# --- Divers ------------------------------------------------------------------
.PHONY: health
health: ## Vérifie que l'API répond
	curl -s $(API_URL)/health && echo

.PHONY: worksites
worksites: ## Appelle GET /worksites pour l'organisation ELLOUZE construction
	curl -s -H "x-organization-id: $(ORG_ID)" $(API_URL)/worksites && echo
