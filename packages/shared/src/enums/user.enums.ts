/** Application role — drives RBAC, see docs/03-architecture.md §6. */
export enum UserRole {
  /** Full control over the organization, including user management. */
  ADMIN = 'admin',
  /** Conducteur de travaux — manages worksites, budgets and expenses. */
  SITE_MANAGER = 'site_manager',
  /** Chef de chantier — records timesheets and expenses from the field. */
  FOREMAN = 'foreman',
  /** Ouvrier — reads own assignments and records own timesheet. */
  WORKER = 'worker',
}
