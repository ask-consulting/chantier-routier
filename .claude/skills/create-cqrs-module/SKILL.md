---
name: create-cqrs-module
description: Scaffold a new DDD/CQRS module in apps/api (NestJS + Prisma) following the project conventions — entity, ports, command/query handlers, mapper, repository, controller, DTOs, and module wiring. Use when adding a new bounded context / resource to the back-end API (e.g. worker, timesheet, expense, budget-line). Triggers on "nouveau module", "ajoute une entité à l'API", "scaffold a CQRS module", "create <entity> module".
---

# Create a CQRS/DDD module in `apps/api`

Generates a complete vertical slice for one aggregate, matching the conventions in
`docs/06-api-conventions-ddd-cqrs.md`. The `worksite` module is the living reference —
read it first when in doubt.

## Inputs

- `entity`: singular PascalCase aggregate name in **English** (e.g. `Worker`, `Timesheet`).
- `fields`: list of `name:type` (TS types), e.g. `name:string`, `hourlyRate:number`,
  `active:boolean`. Every business row also carries `organizationId` (tenant).
- `operations` (optional): subset of `create`, `update`, `delete`, `getById`, `list`.
  Default: `create`, `getById`, `list`.

## HARD RULES

1. **English only** in all code (identifiers, comments, filenames). No French.
2. Keep the 4 layers and the dependency direction: `presentation → application → domain ← infrastructure`.
3. Inject repositories **by Symbol token** (`@Inject(<ENTITY>_REPOSITORY_PORT)`), wired in the module.
4. Domain entities: rich object with a `constructor` + `static create(props)`. **No** NestJS/Prisma imports in `domain/`.
5. Shared transport interfaces + enums go in `packages/shared` (`@chantia/shared`), re-exported from its `index.ts`.
6. **Pure business calculations go in `packages/shared`**, never inline in a handler. The handler calls them.
7. Add a Prisma model to `apps/api/prisma/schema.prisma` following
   `docs/10-conventions-base-de-donnees.md`: `@@map` to a **plural snake_case** table,
   `@map("snake_case")` on every column, named constraints (`pk_` / `fk_` / `uq_` /
   `ix_`), `@db.Uuid` on ids, explicit `onDelete`, and `organizationId` + its index.
8. Response DTOs expose a `static fromDomain(entity)`. Request DTOs use `class-validator` + `@ApiProperty`.
9. **Tenant + authorization** (see `docs/08-identity-module.md`):
   - `organizationId` comes from `@CurrentUser('organizationId')` — **never** from a
     header, a body or a query param. There is no `x-organization-id`.
   - Guard every route with `@RequirePermissions(Permission.<RESOURCE>_<ACTION>)`, not
     with `@Roles(...)`. Add the permission to `Permission` and to `ROLE_PERMISSIONS`
     in `packages/shared/src/access/` first, and cover the new row with a spec.
   - A permission grants the verb, not the scope: `findById`-style queries must take
     the `organizationId` and throw `ResourceNotFoundException` (404, never 403) when
     the row belongs to another tenant.
   - Mark a route `@Public()` only when it genuinely needs no caller. A `@Public()`
     route runs with no tenant context, so the automatic filter does **not** apply
     there — never expose tenant data from one.
   - Repositories inject the tenant-filtered client: `@Inject(TENANT_PRISMA)
     private readonly prisma: TenantPrismaClient`, not `PrismaService`. A model with an
     `organizationId` is then filtered automatically; one without it (reached through a
     parent, like `Timesheet`) is not — root queries on such a table must filter through
     the relation by hand.

## Steps

1. **Prisma**: add the `model <Entity>` (+ any enum) to `schema.prisma`. Run `pnpm --filter @chantia/api prisma:generate`.
2. **Shared** (`packages/shared/src/`): add `interfaces/<entity>.interface.ts` (`I<Entity>`, `ICreate<Entity>`) and any enum in `enums/`; export from `index.ts`.
3. **domain/entities/`<entity>.entity.ts`**: class + `static create`.
4. **domain/ports/`<entity>-repository.port.ts`**: interface + `export const <ENTITY>_REPOSITORY_PORT = Symbol(...)`.
5. **application/**: one `*.command.ts`+`*.handler.ts` per write op, one `*.query.ts`+`*.handler.ts` per read op.
6. **infrastructure/mappers/`<entity>.mapper.ts`**: `toDomain` / `toPersistence` (convert Prisma `Decimal` via `.toNumber()`).
7. **infrastructure/repositories/`<entity>.repository.ts`**: implements the port, uses `PrismaService`, `buildPrismaSearchQuery` + `getPrismaPagination` for `list`.
8. **presentation/**: `create-<entity>.dto.ts`, `get-<entities>.dto.ts`, `<entity>-response.dto.ts`, `paginated-<entity>-response.dto.ts`, controller.
9. **`<module>.module.ts`**: import `CqrsModule` + `PrismaModule`, register handlers + `{ provide: <ENTITY>_REPOSITORY_PORT, useClass: <Entity>Repository }`, declare the controller.
10. **Wire** the module into `apps/api/src/app/app.module.ts`.
11. **Verify**: `pnpm --filter @chantia/api typecheck`.

## Reference templates

Copy the corresponding file from `apps/api/src/app/worksite/` and rename/retype:

| Layer | Reference file |
|---|---|
| Entity | `worksite/domain/entities/worksite.entity.ts` |
| Port | `worksite/domain/ports/worksite-repository.port.ts` |
| Command + handler | `worksite/application/commands/create-worksite.*` |
| Query + handler | `worksite/application/queries/get-worksites.*` |
| Mapper | `worksite/infrastructure/mappers/worksite.mapper.ts` |
| Repository | `worksite/infrastructure/repositories/worksite.repository.ts` |
| Request DTO | `worksite/presentation/dto/create-worksite.dto.ts` |
| Response DTO | `worksite/presentation/dto/worksite-response.dto.ts` |
| Controller | `worksite/presentation/controllers/worksite.controller.ts` |
| Module | `worksite/worksite.module.ts` |

## Business calculations

If the entity needs a computed value (cost, aggregate, KPI), add a **pure function** in
`packages/shared/src/costs/` (or a new domain folder), unit-test it with Vitest (`*.spec.ts`),
export it, and call it from a query handler — exactly like `calculateActualCost` /
`GetWorksiteCostsHandler`.
