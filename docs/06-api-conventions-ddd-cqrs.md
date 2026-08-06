# 06 — Conventions de l'API (DDD / CQRS)

> L'API (`apps/api`) est une application **NestJS + Fastify + Prisma** structurée en
> **DDD / CQRS**, calquée sur les conventions du projet `cie-next`.
> **Règle absolue : tout le code est en anglais** (identifiants, commentaires, noms de
> fichiers). La documentation (ce dossier `docs/`) reste en français.

## 1. Pourquoi une API dédiée

Supabase reste la base **PostgreSQL managée + Auth + Storage**, mais la logique métier
(calcul de coûts, validation de pointage, exports, règles multi-tenant) vit dans une API
NestJS. Raison : ces calculs deviennent vite trop riches pour des Edge Functions, et on
veut les **tester unitairement** et les **partager** (les fonctions pures vivent dans
`packages/shared`, réutilisées par le mobile en hors-ligne).

## 2. Glossaire métier (FR → EN)

Le domaine est en français dans les specs, **en anglais dans le code** :

| Français | Anglais (code) |
|---|---|
| chantier | `Worksite` |
| ouvrier | `Worker` |
| pointage | `Timesheet` |
| dépense | `Expense` |
| poste de budget | `BudgetLine` |
| organisation (tenant) | `Organization` |
| coût main d'œuvre | `laborCost` |
| coût réel | `actualCost` |
| budget total | `totalBudget` |
| écart budgétaire | `variance` |
| taux horaire | `hourlyRate` |
| statut | `status` |

## 3. Structure d'un module (slice verticale)

Un module = un *bounded context*. Les 4 couches sont **toujours** présentes :

```
src/app/<module>/
├── application/
│   ├── commands/   <action>.command.ts   + <action>.handler.ts   (@CommandHandler)
│   └── queries/    get-<x>.query.ts       + get-<x>.handler.ts    (@QueryHandler)
├── domain/
│   ├── entities/   <aggregate>.entity.ts  (constructeur + static create())
│   └── ports/      <x>-repository.port.ts (interface + Symbol token)
├── infrastructure/
│   ├── mappers/    <x>.mapper.ts          (toDomain / toPersistence)
│   └── repositories/ <x>.repository.ts    (implémente le port, dépend de PrismaService)
├── presentation/
│   ├── controllers/ <x>.controller.ts     (injecte QueryBus + CommandBus)
│   └── dto/        create-<x>.dto.ts (class-validator) + <x>-response.dto.ts (fromDomain)
└── <module>.module.ts
```

## 4. Règles de dépendance (sens des flèches)

```
presentation ──► application ──► domain ◄── infrastructure
```

- **domain** ne dépend de rien (ni NestJS, ni Prisma). Entités = objets riches.
- **application** dépend du domaine (entités + **ports**), jamais de Prisma.
- **infrastructure** implémente les **ports** du domaine avec Prisma.
- **presentation** ne parle qu'au `CommandBus` / `QueryBus`, jamais aux repositories.
- L'injection d'un repository se fait **par `Symbol`** (`@Inject(XXX_REPOSITORY_PORT)`),
  câblé dans le `*.module.ts` via `{ provide: XXX_REPOSITORY_PORT, useClass: XxxRepository }`.

## 5. Commands vs Queries

- **Command** = écriture (create/update/delete). Retourne l'entité (ou void).
- **Query** = lecture. Ne modifie jamais l'état.
- Chaque command/query est une classe *plain* (le `constructor` porte les données) et un
  handler séparé (`@CommandHandler` / `@QueryHandler`).

## 6. Calculs métier partagés

Les calculs **purs et testables** vivent dans `packages/shared` (`@chantia/shared`), pas
dans l'API. L'API les **appelle** depuis un query handler ; le mobile les **réutilise**
pour recalculer hors-ligne. Exemple : `calculateActualCost()` dans
`packages/shared/src/costs/worksite-costs.ts`, appelé par `GetWorksiteCostsHandler`.

## 7. Erreurs

- Validation d'entrée → `ValidationException` (renvoyée par le `ValidationPipe` global,
  format `{ field, code, message }`).
- Ressource absente → `ResourceNotFoundException` (HTTP 404), levée dans les handlers.

## 8. Multi-tenant et autorisation

Chaque ligne métier porte un `organizationId`. Il vient **du token d'accès vérifié**,
jamais de la requête (le header `x-organization-id` était un placeholder, il a été
supprimé) :

```ts
@Get()
@RequirePermissions(Permission.WORKSITE_READ)
async findAll(@CurrentUser('organizationId') organizationId: string) { … }
```

Un **filet de sécurité** double cette discipline : une extension Prisma injecte
automatiquement `organizationId` dans toute requête visant une table qui porte cette
colonne, dès lors que l'appelant est authentifié. Oublier le filtre n'est donc plus une
fuite. Les repositories injectent le client filtré via `@Inject(TENANT_PRISMA)` — voir
`08-identity-module.md` §4 bis pour la règle exacte et ses deux limites.

Deux règles qui en découlent, à appliquer dans **tout** nouveau module :

- Une route se garde par la **capacité** qu'elle exige (`@RequirePermissions`), pas par
  la liste des rôles qui la détiennent. La matrice vit dans `@chantia/shared`.
- Une permission donne le **verbe**, pas le **périmètre** : filtrer les lignes par tenant
  (et par appelant quand c'est « les siennes ») reste le travail du query handler. Une
  ressource d'un autre tenant renvoie `404`, pas `403`.

Détail complet : `08-identity-module.md`.

## 9. Générer un nouveau module

Utiliser la skill Claude Code **`create-cqrs-module`** (voir
`.claude/skills/create-cqrs-module/`) qui génère la slice verticale complète à partir du
nom d'entité et des champs. Voir le module `worksite` comme référence vivante.

## 10. Commandes utiles

```bash
pnpm --filter @chantia/api dev            # API en watch (prisma generate + nest start)
pnpm --filter @chantia/api prisma:migrate # créer/appliquer une migration
pnpm --filter @chantia/api typecheck
pnpm --filter @chantia/shared test        # tests des calculs métier
```
