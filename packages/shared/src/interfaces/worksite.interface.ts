import { WorksiteStatus } from '../enums/worksite.enums';

/** Transport representation of a worksite (API response, web/mobile cache). */
export interface IWorksite {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  client: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  status: WorksiteStatus;
  /**
   * Optional because the API **omits the field entirely** for a caller without
   * `budget:read` — field staff get the worksite, not its margin.
   *
   * `undefined` therefore means "not allowed to know", while `null` means "no
   * budget set". Two different facts, and worth keeping distinguishable: a UI
   * that renders `null` as "—" is right to do so, and would be wrong to render
   * the same dash for a figure it simply was not shown.
   */
  totalBudget?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Payload to create a worksite. */
export interface ICreateWorksite {
  code: string;
  name: string;
  client?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  status?: WorksiteStatus;
  totalBudget?: number | null;
}

/** Result of a worksite cost computation (budget vs actual). */
export interface IWorksiteCosts {
  worksiteId: string;
  laborCost: number;
  expensesCost: number;
  actualCost: number;
  totalBudget: number | null;
  /** totalBudget - actualCost (positive = under budget, negative = overrun). null when no budget. */
  variance: number | null;
}
