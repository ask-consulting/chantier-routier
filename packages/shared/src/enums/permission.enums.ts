/**
 * Fine-grained capabilities. A route is guarded by the *capability* it needs,
 * never by the list of roles that happen to have it today — adding a role or
 * moving a capability between roles then touches one table
 * (`ROLE_PERMISSIONS`) instead of every controller.
 *
 * Naming: `<resource>:<action>`.
 *   - `read`   — see the resource.
 *   - `record` — create field data from the site (timesheets, expenses).
 *   - `manage` — full write: create, update, delete, and correct others' data.
 */
export enum Permission {
  /** Read the tenant's own settings (name, currency). */
  ORGANIZATION_READ = 'organization:read',
  ORGANIZATION_MANAGE = 'organization:manage',

  USER_READ = 'user:read',
  /** Create accounts, change roles, deactivate. Admin territory. */
  USER_MANAGE = 'user:manage',

  WORKSITE_READ = 'worksite:read',
  WORKSITE_MANAGE = 'worksite:manage',

  WORKER_READ = 'worker:read',
  WORKER_MANAGE = 'worker:manage',

  TIMESHEET_READ = 'timesheet:read',
  /** Record hours from the field — the day-to-day act of a foreman or worker. */
  TIMESHEET_RECORD = 'timesheet:record',
  /** Correct or delete somebody else's entry. */
  TIMESHEET_MANAGE = 'timesheet:manage',

  EXPENSE_READ = 'expense:read',
  EXPENSE_RECORD = 'expense:record',
  EXPENSE_MANAGE = 'expense:manage',

  /**
   * Money: budgets, actual costs, variance. Split out from `worksite:read`
   * on purpose — field staff need the worksite without seeing its margin.
   */
  BUDGET_READ = 'budget:read',
  BUDGET_MANAGE = 'budget:manage',
}
