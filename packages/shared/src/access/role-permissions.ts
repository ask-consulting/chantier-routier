import { Permission } from '../enums/permission.enums';
import { UserRole } from '../enums/user.enums';

/**
 * The single authorization table of the product.
 *
 * Roles are static (there is no per-tenant role editor), so the mapping is a
 * constant rather than a database table: authorization needs no query, and the
 * access token alone is enough to decide. Web and mobile import the very same
 * table to hide actions the caller cannot perform, which keeps the UI and the
 * API from drifting apart.
 */
export const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly Permission[]>> = {
  /** Owner of the tenant: everything, including account management. */
  [UserRole.ADMIN]: Object.values(Permission),

  /**
   * Conducteur de travaux — runs the worksites and their money, but does not
   * hand out accounts.
   */
  [UserRole.SITE_MANAGER]: [
    Permission.ORGANIZATION_READ,
    Permission.USER_READ,
    Permission.WORKSITE_READ,
    Permission.WORKSITE_MANAGE,
    Permission.WORKER_READ,
    Permission.WORKER_MANAGE,
    Permission.TIMESHEET_READ,
    Permission.TIMESHEET_RECORD,
    Permission.TIMESHEET_MANAGE,
    Permission.EXPENSE_READ,
    Permission.EXPENSE_RECORD,
    Permission.EXPENSE_MANAGE,
    Permission.BUDGET_READ,
    Permission.BUDGET_MANAGE,
  ],

  /**
   * Chef de chantier — feeds the system from the field and fixes his crew's
   * entries. No access to budgets: he reports cost, he does not steer it.
   */
  [UserRole.FOREMAN]: [
    Permission.WORKSITE_READ,
    Permission.WORKER_READ,
    Permission.TIMESHEET_READ,
    Permission.TIMESHEET_RECORD,
    Permission.TIMESHEET_MANAGE,
    Permission.EXPENSE_READ,
    Permission.EXPENSE_RECORD,
  ],

  /**
   * Ouvrier — records his own hours. Reading is additionally narrowed to his
   * own rows by the query handlers; a permission grants the verb, not the scope.
   */
  [UserRole.WORKER]: [
    Permission.WORKSITE_READ,
    Permission.TIMESHEET_READ,
    Permission.TIMESHEET_RECORD,
  ],
};

/** Every capability a role carries. Never empty for a known role. */
export function permissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}

/**
 * All-of semantics: a route listing several permissions demands every one of
 * them. Requiring more is the safe reading of an ambiguous `@RequirePermissions`.
 */
export function roleHasEveryPermission(
  role: UserRole,
  permissions: readonly Permission[],
): boolean {
  const granted = permissionsForRole(role);
  return permissions.every((permission) => granted.includes(permission));
}
