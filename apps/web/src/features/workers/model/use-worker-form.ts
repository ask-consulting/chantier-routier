'use client';

import { useCallback, useState } from 'react';
import type { IWorker } from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import { useCreateWorker, useUpdateWorker } from '../api/worker.queries';

/**
 * Why a worker could not be saved, as a key under `workers.*`.
 *
 * A key rather than a sentence, like `use-invite-form`: the hook decides *what
 * happened*, the component decides *how it reads*.
 */
export type WorkerErrorKey = 'invalidInput' | 'unknown';

export interface WorkerFormValues {
  name: string;
  qualification: string;
  /** Kept as the raw input string; parsed at submission. Empty is not zero. */
  hourlyRate: string;
  active: boolean;
}

function valuesOf(worker: IWorker | null): WorkerFormValues {
  return worker
    ? {
        name: worker.name,
        qualification: worker.qualification ?? '',
        hourlyRate: String(worker.hourlyRate),
        active: worker.active,
      }
    : { name: '', qualification: '', hourlyRate: '', active: true };
}

/**
 * One form for both doors: create when `worker` is `null`, edit otherwise.
 *
 * A single hook rather than two, because the fields and their validation are
 * the same act either way — only which mutation fires, and what the payload
 * contains, differs. The caller is expected to remount this (a `key` on the
 * drawer, keyed by the worker's id) when it switches from one worker to
 * another, or from editing to creating; this hook does not watch `worker` for
 * changes itself, the same way `useInviteForm` never has to.
 *
 * **Client-side validation stops at "is it filled in and a positive number".**
 * The rate feeds every labour cost computed from this person's hours, so a
 * zero or a blank is refused before it ever reaches the network — but the API
 * remains the only source of truth for anything past that.
 */
export function useWorkerForm(worker: IWorker | null = null) {
  const [values, setValues] = useState<WorkerFormValues>(() => valuesOf(worker));
  const [error, setError] = useState<WorkerErrorKey | null>(null);
  const create = useCreateWorker();
  const update = useUpdateWorker();
  const pending = create.isPending || update.isPending;
  const isEditing = worker !== null;

  const setValue = useCallback(<K extends keyof WorkerFormValues>(
    field: K,
    value: WorkerFormValues[K],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    // The refusal was about what was in the boxes; the moment one changes, it
    // is stale.
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setValues(valuesOf(worker));
    setError(null);
    create.reset();
    update.reset();
  }, [worker, create, update]);

  const parsedRate = Number(values.hourlyRate);
  const isComplete =
    values.name.trim().length > 0 &&
    values.hourlyRate.trim().length > 0 &&
    Number.isFinite(parsedRate) &&
    parsedRate > 0;

  /**
   * Returns whether it worked, so the drawer knows to close — there is no
   * second state to show afterwards, unlike an invitation's link.
   */
  async function submit(event: React.FormEvent): Promise<boolean> {
    event.preventDefault();
    if (!isComplete || pending) {
      return false;
    }
    setError(null);

    const payload = {
      name: values.name.trim(),
      qualification: values.qualification.trim() || null,
      hourlyRate: parsedRate,
      active: values.active,
    };

    try {
      if (isEditing) {
        await update.mutateAsync({ id: worker.id, data: payload });
      } else {
        await create.mutateAsync(payload);
      }
      return true;
    } catch (caught) {
      setError(toErrorKey(caught));
      return false;
    }
  }

  return { values, setValue, reset, submit, isComplete, pending, error, isEditing };
}

function toErrorKey(caught: unknown): WorkerErrorKey {
  return caught instanceof ApiError && caught.status === 400 ? 'invalidInput' : 'unknown';
}
