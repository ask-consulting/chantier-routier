import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../tenant/tenant-context';

/** The column that marks a table as belonging to one tenant. */
export const TENANT_FIELD = 'organizationId';

/**
 * Models carrying `organizationId`, read from the generated schema at startup.
 *
 * Derived rather than declared: a hand-maintained list would have to be updated
 * for every new model, which is precisely the kind of forgetting this extension
 * exists to prevent. Add a model with an `organizationId` and it is filtered on
 * the next `prisma generate` — nothing to register.
 *
 * A model *without* the column is left alone. That is a schema decision, not an
 * oversight: `Timesheet` and `Expense` hang off `worksite`, `RefreshToken` off
 * `app_user`, and `Organization` *is* the tenant.
 */
export const TENANT_SCOPED_MODELS: ReadonlySet<string> = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === TENANT_FIELD))
    .map((model) => model.name),
);

/** Operations whose arguments carry a `where` the filter can be merged into. */
const FILTERED_BY_WHERE = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

/** Operations that write new rows, where the tenant goes into `data` instead. */
const STAMPED_ON_DATA = new Set(['create', 'createMany', 'upsert']);

type OperationArgs = Record<string, unknown> | undefined;

export interface TenantExtensionOptions {
  /** Master switch — `MULTI_TENANT_ENABLED=false` turns the filter off entirely. */
  enabled: boolean;
}

/**
 * Injects `organizationId = <caller's tenant>` into every query touching a
 * tenant-scoped table.
 *
 * The rule, deliberately simple:
 *
 *   column exists  +  caller authenticated  →  filter injected
 *   column absent                           →  table is tenant-agnostic, untouched
 *   no access token (login, register)       →  no filter
 *
 * Not passing `organizationId` by hand stops being a data leak and becomes a
 * no-op: the extension adds it anyway. Handlers that still pass it explicitly
 * (they should, it documents intent) write the same value twice — harmless.
 *
 * **Known limit — fail-open.** With no authenticated caller there is no filter,
 * which is what makes login work without a second client. The flip side is that
 * a route wrongly marked `@Public()` would read across tenants. That case is
 * logged loudly rather than silently allowed; see `warnUnscoped`.
 *
 * **Known limit — nested reads.** Prisma forbids mutating `include`/`select`, so
 * relations loaded through them are not filtered here. They are safe by
 * construction in this schema: every relation descends from a filtered root
 * through a foreign key.
 */
export function tenantExtension(tenantContext: TenantContext, options: TenantExtensionOptions) {
  const logger = new Logger('TenantExtension');
  const warned = new Set<string>();

  /** One warning per model+operation: a loud signal, not a flooded log. */
  const warnUnscoped = (model: string, operation: string): void => {
    const key = `${model}.${operation}`;
    if (!warned.has(key)) {
      warned.add(key);
      logger.warn(
        `${key} ran with no tenant in context — returning rows across every organization. ` +
          `Expected on login/register and in background jobs; on any other route it is a bug.`,
      );
    }
  };

  return Prisma.defineExtension({
    name: 'multi-tenant',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!options.enabled || !model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const organizationId = tenantContext.current();
          if (organizationId === null) {
            warnUnscoped(model, operation);
            return query(args);
          }

          // Cast back to the operation's own argument union: `withTenant` works
          // structurally over 100+ generated arg types that share no supertype.
          return query(
            withTenant(args as OperationArgs, operation, organizationId) as typeof args,
          );
        },
      },
    },
  });
}

/** Merges the tenant into whichever argument the operation actually uses. */
function withTenant(
  args: OperationArgs,
  operation: string,
  organizationId: string,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(args ?? {}) };

  if (FILTERED_BY_WHERE.has(operation)) {
    // Last position wins, so a caller cannot widen the scope by passing their
    // own organizationId — theirs is overwritten with the token's.
    next.where = { ...((next.where as object) ?? {}), [TENANT_FIELD]: organizationId };
  }

  if (STAMPED_ON_DATA.has(operation)) {
    // `upsert` carries its insert payload under `create`.
    const dataKey = operation === 'upsert' ? 'create' : 'data';
    next[dataKey] = stampTenant(next[dataKey], organizationId);
  }

  return next;
}

/** `createMany` takes an array; everything else a single object. */
function stampTenant(data: unknown, organizationId: string): unknown {
  if (Array.isArray(data)) {
    return data.map((row) => stampTenant(row, organizationId));
  }
  if (data && typeof data === 'object') {
    // The token wins here too: a payload naming another tenant is overwritten
    // rather than trusted, so no request can plant a row outside its own.
    return { ...(data as object), [TENANT_FIELD]: organizationId };
  }
  return { [TENANT_FIELD]: organizationId };
}
