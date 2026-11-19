import { PayMode } from '../enums/plan.enums';

/** The working day a daily rate stands for, until each worker carries their own. */
export const HOURS_PER_DAY = 8;

/**
 * The rate a new assignment proposes, from the worker's hourly rate, in the
 * currency's smallest unit. `null` by the task: a lump sum has no default, it
 * is agreed for that task.
 */
export function defaultTaskRate(payMode: PayMode, hourlyRate: number): number | null {
  switch (payMode) {
    case PayMode.HOUR:
      return hourlyRate;
    case PayMode.DAY:
      return hourlyRate * HOURS_PER_DAY;
    case PayMode.TASK:
      return null;
  }
}
