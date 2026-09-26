'use client';

import { useCallback, useState } from 'react';
import {
  equipmentAvailability,
  equipmentCostOverPeriod,
  type EquipmentCostInput,
  type IEquipment,
  type IEquipmentAssignment,
} from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import { useCreateAssignment, useUpdateAssignment } from '../api/equipment.queries';

/** A refusal pinned to one field, as a key under `form.errors.*`. */
export type AssignmentFieldErrorKey =
  | 'endBeforeStart'
  | 'beforeEquipmentAvailable'
  | 'afterEquipmentAvailable'
  | 'unknownWorksite'
  | 'equipmentAlreadyAssigned';

export interface AssignmentFormValues {
  /** A worksite id, or `''` before one is picked. */
  worksiteId: string;
  startDate: string;
  endDate: string;
  notes: string;
}

type Field = keyof AssignmentFormValues;
type FieldErrors = Partial<Record<Field, AssignmentFieldErrorKey>>;

function valuesOf(assignment: IEquipmentAssignment | null): AssignmentFormValues {
  return assignment
    ? {
        worksiteId: assignment.worksiteId,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        notes: assignment.notes ?? '',
      }
    : { worksiteId: '', startDate: '', endDate: '', notes: '' };
}

/**
 * The money a machine's record carries, as the cost functions want it — or
 * `null` for a reader without `budget:read`, whose records carry none. No
 * preview then: a figure computed from nothing would be a wrong figure.
 */
function costInputOf(equipment: IEquipment): EquipmentCostInput | null {
  if (equipment.dailyCost === undefined) {
    return null;
  }
  return {
    acquisitionMethod: equipment.acquisitionMethod,
    acquisitionDate: equipment.acquisitionDate,
    purchasePrice: equipment.purchasePrice,
    residualValue: equipment.residualValue,
    usefulLifeMonths: equipment.usefulLifeMonths,
    monthlyPayment: equipment.monthlyPayment,
    dailyRate: equipment.dailyRate,
    contractEndDate: equipment.contractEndDate,
    disposalDate: equipment.disposalDate,
  };
}

/**
 * Putting one machine on a worksite, or moving it — create when `editing` is
 * `null`, move otherwise.
 *
 * **What the form can see, it says before the API does**: a period that runs
 * backwards, or days the machine is not there (before it arrived, after its
 * disposal or contract end). An overlap with another worksite needs the rest
 * of the planning, so that one only the API can refuse — and its message,
 * naming the worksite in the way, is shown as is.
 *
 * **The cost is previewed** over the whole period, with the functions the
 * API prices it with — for a reader who may see money.
 */
export function useAssignmentForm(equipment: IEquipment, editing: IEquipmentAssignment | null) {
  const [values, setValues] = useState<AssignmentFormValues>(() => valuesOf(editing));
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors>({});
  const [conflict, setConflict] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const create = useCreateAssignment();
  const update = useUpdateAssignment();
  const pending = create.isPending || update.isPending;

  const setValue = useCallback(<K extends Field>(field: K, value: AssignmentFormValues[K]) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setServerFieldErrors({});
    setConflict(null);
    setFailed(false);
  }, []);

  const clientErrors: FieldErrors = {};
  const { from, until } = equipmentAvailability(equipment);
  if (values.startDate && values.startDate < from) {
    clientErrors.startDate = 'beforeEquipmentAvailable';
  }
  if (values.endDate && until && values.endDate > until) {
    clientErrors.endDate = 'afterEquipmentAvailable';
  }
  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    clientErrors.endDate = 'endBeforeStart';
  }

  const isComplete =
    values.worksiteId !== '' &&
    values.startDate !== '' &&
    values.endDate !== '' &&
    Object.keys(clientErrors).length === 0;

  const costInput = costInputOf(equipment);
  const previewCost =
    isComplete && costInput
      ? equipmentCostOverPeriod(costInput, values.startDate, values.endDate)
      : null;

  async function submit(event: React.FormEvent): Promise<boolean> {
    event.preventDefault();
    if (!isComplete || pending) {
      return false;
    }
    const notes = values.notes.trim() || null;
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          data: {
            worksiteId: values.worksiteId,
            startDate: values.startDate,
            endDate: values.endDate,
            notes,
          },
        });
      } else {
        await create.mutateAsync({
          equipmentId: equipment.id,
          worksiteId: values.worksiteId,
          startDate: values.startDate,
          endDate: values.endDate,
          notes,
        });
        setValues(valuesOf(null));
      }
      return true;
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setConflict(caught.message);
      } else {
        const onFields = toFieldErrors(caught);
        if (Object.keys(onFields).length > 0) {
          setServerFieldErrors(onFields);
        } else {
          setFailed(true);
        }
      }
      return false;
    }
  }

  return {
    values,
    setValue,
    submit,
    isComplete,
    pending,
    fieldErrors: { ...serverFieldErrors, ...clientErrors },
    conflict,
    failed,
    previewCost,
    availableFrom: from,
    availableUntil: until,
  };
}

const KNOWN: Record<string, AssignmentFieldErrorKey> = {
  'form.errors.endBeforeStart': 'endBeforeStart',
  'form.errors.beforeEquipmentAvailable': 'beforeEquipmentAvailable',
  'form.errors.afterEquipmentAvailable': 'afterEquipmentAvailable',
  'form.errors.unknownWorksite': 'unknownWorksite',
};

function toFieldErrors(caught: unknown): FieldErrors {
  if (!(caught instanceof ApiError) || !caught.fields) {
    return {};
  }
  const result: FieldErrors = {};
  for (const { field, code } of caught.fields) {
    const key = KNOWN[code];
    if (key && field in valuesOf(null)) {
      result[field as Field] = key;
    }
  }
  return result;
}
