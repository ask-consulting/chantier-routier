'use client';

import { useCallback, useState } from 'react';
import { WorksiteStatus, type IWorksite } from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import { useCreateWorksite, useUpdateWorksite } from '../api/worksite.queries';

/** Why a worksite could not be saved, as a key under `worksites.error.*`. */
export type WorksiteErrorKey = 'invalidInput' | 'unknown';

/** A refusal that belongs next to one field, as a key under `form.errors.*`. */
export type WorksiteFieldErrorKey = 'worksiteCodeTaken' | 'endBeforeStart' | 'unknownClient';

export interface WorksiteFormValues {
  code: string;
  name: string;
  /** A client id, or `''` for none. */
  clientId: string;
  address: string;
  /** `YYYY-MM-DD`, what `<input type="date">` reads and writes. Empty is "not planned". */
  plannedStartDate: string;
  plannedEndDate: string;
  status: WorksiteStatus;
  /** Kept as the raw input string; parsed at submission. Empty is "no budget", not zero. */
  totalBudget: string;
}

/**
 * The API answers a full ISO timestamp; a date input only takes the day.
 *
 * The first ten characters rather than a `Date` round trip: the value is
 * stored as midnight UTC, and formatting it back through the local timezone
 * would show the day before to anybody west of Greenwich.
 */
function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function valuesOf(worksite: IWorksite | null): WorksiteFormValues {
  return worksite
    ? {
        code: worksite.code,
        name: worksite.name,
        clientId: worksite.clientId ?? '',
        address: worksite.address ?? '',
        plannedStartDate: toDateInput(worksite.plannedStartDate),
        plannedEndDate: toDateInput(worksite.plannedEndDate),
        status: worksite.status,
        totalBudget:
          worksite.totalBudget === null || worksite.totalBudget === undefined
            ? ''
            : String(worksite.totalBudget),
      }
    : {
        code: '',
        name: '',
        clientId: '',
        address: '',
        plannedStartDate: '',
        plannedEndDate: '',
        status: WorksiteStatus.UPCOMING,
        totalBudget: '',
      };
}

/**
 * One form for both doors: create when `worksite` is `null`, edit otherwise —
 * the same arrangement as `useWorkerForm`, remounted by a `key` when the
 * target changes.
 *
 * **`withBudget` decides whether the budget travels at all.** A caller who may
 * not read the budget receives a worksite without `totalBudget`; sending the
 * empty box back would clear a figure they were never shown. So without it,
 * the key is left out of the payload entirely and the API leaves it alone.
 *
 * **The schedule is checked here too**, not only by the API: an end before the
 * start is visible the moment both dates are in, and waiting for a round trip
 * to say so would be a form that knows and keeps quiet.
 */
export function useWorksiteForm(
  worksite: IWorksite | null = null,
  { withBudget }: { withBudget: boolean },
) {
  const [values, setValues] = useState<WorksiteFormValues>(() => valuesOf(worksite));
  const [error, setError] = useState<WorksiteErrorKey | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Partial<Record<keyof WorksiteFormValues, WorksiteFieldErrorKey>>
  >({});
  const create = useCreateWorksite();
  const update = useUpdateWorksite();
  const pending = create.isPending || update.isPending;
  const isEditing = worksite !== null;

  const setValue = useCallback(<K extends keyof WorksiteFormValues>(
    field: K,
    value: WorksiteFormValues[K],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    // Any refusal was about what was in the boxes; once one changes, it is stale.
    setError(null);
    setServerFieldErrors({});
  }, []);

  const reset = useCallback(() => {
    setValues(valuesOf(worksite));
    setError(null);
    setServerFieldErrors({});
    create.reset();
    update.reset();
  }, [worksite, create, update]);

  // `YYYY-MM-DD` strings compare correctly as strings.
  const endsBeforeStart =
    values.plannedStartDate !== '' &&
    values.plannedEndDate !== '' &&
    values.plannedEndDate < values.plannedStartDate;

  const parsedBudget = Number(values.totalBudget);
  const budgetIsValid =
    values.totalBudget.trim() === '' || (Number.isFinite(parsedBudget) && parsedBudget >= 0);

  const fieldErrors: Partial<Record<keyof WorksiteFormValues, WorksiteFieldErrorKey>> = {
    ...serverFieldErrors,
    ...(endsBeforeStart ? { plannedEndDate: 'endBeforeStart' as const } : {}),
  };

  const isComplete =
    values.code.trim().length > 0 &&
    values.name.trim().length > 0 &&
    !endsBeforeStart &&
    (!withBudget || budgetIsValid);

  /** Returns whether it worked, so the drawer knows to close. */
  async function submit(event: React.FormEvent): Promise<boolean> {
    event.preventDefault();
    if (!isComplete || pending) {
      return false;
    }
    setError(null);
    setServerFieldErrors({});

    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      clientId: values.clientId || null,
      address: values.address.trim() || null,
      plannedStartDate: values.plannedStartDate || null,
      plannedEndDate: values.plannedEndDate || null,
      status: values.status,
      ...(withBudget
        ? { totalBudget: values.totalBudget.trim() === '' ? null : parsedBudget }
        : {}),
    };

    try {
      if (isEditing) {
        await update.mutateAsync({ id: worksite.id, data: payload });
      } else {
        await create.mutateAsync(payload);
      }
      return true;
    } catch (caught) {
      const onFields = toFieldErrors(caught);
      if (Object.keys(onFields).length > 0) {
        setServerFieldErrors(onFields);
      } else {
        setError(caught instanceof ApiError && caught.status === 400 ? 'invalidInput' : 'unknown');
      }
      return false;
    }
  }

  return {
    values,
    setValue,
    reset,
    submit,
    isComplete,
    pending,
    error,
    fieldErrors,
    isEditing,
  };
}

const KNOWN_FIELD_ERRORS: Record<string, WorksiteFieldErrorKey> = {
  'form.errors.worksiteCodeTaken': 'worksiteCodeTaken',
  'form.errors.endBeforeStart': 'endBeforeStart',
  'form.errors.unknownClient': 'unknownClient',
};

/**
 * The refusals the API pins to a field, kept only when this form knows how to
 * say them — anything else falls back to the general alert rather than
 * showing a raw key under a box.
 */
function toFieldErrors(
  caught: unknown,
): Partial<Record<keyof WorksiteFormValues, WorksiteFieldErrorKey>> {
  if (!(caught instanceof ApiError) || !caught.fields) {
    return {};
  }
  const result: Partial<Record<keyof WorksiteFormValues, WorksiteFieldErrorKey>> = {};
  for (const { field, code } of caught.fields) {
    const key = KNOWN_FIELD_ERRORS[code];
    if (key && field in valuesOf(null)) {
      result[field as keyof WorksiteFormValues] = key;
    }
  }
  return result;
}
