/**
 * Transport representation of a worker — an **HR record**, not an account.
 *
 * The distinction is the whole point of this interface existing next to
 * `IUser`: a worker is somebody whose hours cost money, and most of them never
 * sign in (no smartphone on site). An account is somebody who signs in, and some
 * of those never set foot on a worksite. A site manager is both, and the two
 * records are linked by `app_users.worker_id`.
 *
 * Nothing here can authenticate: no email, no password, no role.
 */
export interface IWorker {
  id: string;
  organizationId: string;
  name: string;
  /** Trade or grade — `maçon`, `chef d'équipe`, `conducteur d'engin`. Free text. */
  qualification: string | null;
  /** What an hour of this person costs the company. Feeds every labour cost. */
  hourlyRate: number;
  /**
   * Still on the payroll.
   *
   * Deactivation is the normal way somebody leaves: it keeps the timesheets, and
   * therefore keeps the cost of every worksite they ever worked on true.
   */
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICreateWorker {
  name: string;
  qualification?: string | null;
  hourlyRate: number;
  active?: boolean;
}

/** Every field optional: the same payload deactivates, renames or re-rates. */
export interface IUpdateWorker {
  name?: string;
  qualification?: string | null;
  hourlyRate?: number;
  active?: boolean;
}
