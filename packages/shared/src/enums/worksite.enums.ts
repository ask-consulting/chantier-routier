/** Worksite lifecycle status — see docs/03-architecture.md §5. */
export enum WorksiteStatus {
  UPCOMING = 'upcoming',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended',
}

/** Category of a worksite expense. */
export enum ExpenseType {
  LABOR = 'labor',
  MATERIALS = 'materials',
  EQUIPMENT = 'equipment',
  SUBCONTRACTING = 'subcontracting',
  OTHER = 'other',
}
