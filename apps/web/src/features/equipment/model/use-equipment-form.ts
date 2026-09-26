'use client';

import { useCallback, useState } from 'react';
import {
  AcquisitionMethod,
  EquipmentCategory,
  EquipmentStatus,
  depreciationEndDate,
  equipmentDailyCost,
  equipmentType,
  isOwned,
  type EquipmentCostInput,
  type IEquipment,
} from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import { useCreateEquipment, useUpdateEquipment } from '../api/equipment.queries';

/** Why a machine could not be saved, as a key under `equipment.error.*`. */
export type EquipmentErrorKey = 'invalidInput' | 'unknown';

/** A refusal pinned to one field, as a key under `form.errors.*`. */
export type EquipmentFieldErrorKey =
  | 'required'
  | 'endBeforeStart'
  | 'residualAbovePrice'
  | 'unknownEquipmentType'
  | 'fleetNumberTaken';

/** Everything as the boxes hold it — strings, parsed at submission. Empty is "not set". */
export interface EquipmentFormValues {
  category: EquipmentCategory;
  typeCode: string;
  designation: string;
  fleetNumber: string;
  brand: string;
  model: string;
  serialNumber: string;
  registrationNumber: string;
  manufactureYear: string;
  status: EquipmentStatus;
  acquisitionMethod: AcquisitionMethod;
  acquisitionDate: string;
  supplier: string;
  purchasePrice: string;
  residualValue: string;
  usefulLifeMonths: string;
  monthlyPayment: string;
  buyoutValue: string;
  dailyRate: string;
  contractEndDate: string;
  disposalDate: string;
  notes: string;
}

type Field = keyof EquipmentFormValues;
type FieldErrors = Partial<Record<Field, EquipmentFieldErrorKey>>;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function text(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

function valuesOf(equipment: IEquipment | null): EquipmentFormValues {
  if (!equipment) {
    return {
      category: EquipmentCategory.EARTHMOVING,
      typeCode: '',
      designation: '',
      fleetNumber: '',
      brand: '',
      model: '',
      serialNumber: '',
      registrationNumber: '',
      manufactureYear: '',
      status: EquipmentStatus.IN_SERVICE,
      acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
      acquisitionDate: today(),
      supplier: '',
      purchasePrice: '',
      residualValue: '',
      usefulLifeMonths: '',
      monthlyPayment: '',
      buyoutValue: '',
      dailyRate: '',
      contractEndDate: '',
      disposalDate: '',
      notes: '',
    };
  }
  return {
    category: equipmentType(equipment.typeCode)?.category ?? EquipmentCategory.EARTHMOVING,
    typeCode: equipment.typeCode,
    designation: equipment.designation,
    fleetNumber: text(equipment.fleetNumber),
    brand: text(equipment.brand),
    model: text(equipment.model),
    serialNumber: text(equipment.serialNumber),
    registrationNumber: text(equipment.registrationNumber),
    manufactureYear: text(equipment.manufactureYear),
    status: equipment.status,
    acquisitionMethod: equipment.acquisitionMethod,
    acquisitionDate: equipment.acquisitionDate,
    supplier: text(equipment.supplier),
    purchasePrice: text(equipment.purchasePrice),
    residualValue: text(equipment.residualValue),
    usefulLifeMonths: text(equipment.usefulLifeMonths),
    monthlyPayment: text(equipment.monthlyPayment),
    buyoutValue: text(equipment.buyoutValue),
    dailyRate: text(equipment.dailyRate),
    contractEndDate: text(equipment.contractEndDate),
    disposalDate: text(equipment.disposalDate),
    notes: text(equipment.notes),
  };
}

/** `''` is "not set"; anything else must parse. `NaN` marks a box that does not. */
function amount(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  return trimmed === '' ? null : Number(trimmed);
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * One form for both doors — create when `equipment` is `null`, edit otherwise —
 * remounted by a `key` when the target changes, like the other drawers.
 *
 * **The same rules as the aggregate, checked as the boxes fill.** Which money
 * an acquisition method needs, a residual value under the price, dates that
 * run forwards, a disposal date once retired. The API re-checks all of it;
 * this only saves a round trip to learn what the form could already see.
 *
 * **The lifetime follows the type until it is typed in.** Picking a
 * "compacteur tandem" fills 60 months; once the box is edited by hand, a
 * later change of type leaves it alone.
 *
 * **The end of depreciation and today's cost are previewed** with the very
 * functions the API computes them with (`@chantia/shared`).
 */
export function useEquipmentForm(equipment: IEquipment | null = null) {
  const [values, setValues] = useState<EquipmentFormValues>(() => valuesOf(equipment));
  const [lifetimeTouched, setLifetimeTouched] = useState(equipment !== null);
  const [error, setError] = useState<EquipmentErrorKey | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors>({});
  const create = useCreateEquipment();
  const update = useUpdateEquipment();
  const pending = create.isPending || update.isPending;
  const isEditing = equipment !== null;

  const setValue = useCallback(
    <K extends Field>(field: K, value: EquipmentFormValues[K]) => {
      setValues((previous) => {
        const next = { ...previous, [field]: value };
        if (field === 'category') {
          // A type from another category would be a contradiction on screen.
          next.typeCode = '';
        }
        if (field === 'typeCode' && !lifetimeTouched) {
          next.usefulLifeMonths = text(equipmentType(String(value))?.defaultUsefulLifeMonths);
        }
        return next;
      });
      if (field === 'usefulLifeMonths') {
        setLifetimeTouched(true);
      }
      setError(null);
      setServerFieldErrors({});
    },
    [lifetimeTouched],
  );

  const reset = useCallback(() => {
    setValues(valuesOf(equipment));
    setLifetimeTouched(equipment !== null);
    setError(null);
    setServerFieldErrors({});
    create.reset();
    update.reset();
  }, [equipment, create, update]);

  const method = values.acquisitionMethod;
  const owned = isOwned(method);
  const leased =
    method === AcquisitionMethod.LEASING || method === AcquisitionMethod.LONG_TERM_RENTAL;
  const hired = method === AcquisitionMethod.SHORT_TERM_RENTAL;
  const retired = values.status === EquipmentStatus.RETIRED;

  const numbers = {
    purchasePrice: amount(values.purchasePrice),
    residualValue: amount(values.residualValue),
    usefulLifeMonths: amount(values.usefulLifeMonths),
    monthlyPayment: amount(values.monthlyPayment),
    buyoutValue: amount(values.buyoutValue),
    dailyRate: amount(values.dailyRate),
    manufactureYear: amount(values.manufactureYear),
  };

  const clientErrors: FieldErrors = {};
  const requirePositive = (field: keyof typeof numbers): void => {
    const value = numbers[field];
    if (value === null || !Number.isFinite(value) || value <= 0) {
      clientErrors[field] = 'required';
    }
  };
  if (owned) {
    requirePositive('purchasePrice');
    requirePositive('usefulLifeMonths');
    if (
      numbers.residualValue !== null &&
      numbers.purchasePrice !== null &&
      numbers.residualValue > numbers.purchasePrice
    ) {
      clientErrors.residualValue = 'residualAbovePrice';
    }
  }
  if (leased) {
    requirePositive('monthlyPayment');
    if (!values.contractEndDate) {
      clientErrors.contractEndDate = 'required';
    }
  }
  if (hired) {
    requirePositive('dailyRate');
  }
  if (!owned && values.contractEndDate && values.contractEndDate < values.acquisitionDate) {
    clientErrors.contractEndDate = 'endBeforeStart';
  }
  if (retired && !values.disposalDate) {
    clientErrors.disposalDate = 'required';
  }
  if (retired && values.disposalDate && values.disposalDate < values.acquisitionDate) {
    clientErrors.disposalDate = 'endBeforeStart';
  }

  // A box is only marked once it holds something, or once the server said so:
  // a form opened blank should not greet its reader with a column of red.
  const shown: FieldErrors = { ...serverFieldErrors };
  for (const [field, key] of Object.entries(clientErrors) as [Field, EquipmentFieldErrorKey][]) {
    if (key !== 'required' || values[field] !== '') {
      shown[field] = key;
    }
  }

  const unparsable = Object.values(numbers).some((value) => value !== null && Number.isNaN(value));
  const isComplete =
    values.typeCode !== '' &&
    values.designation.trim() !== '' &&
    values.acquisitionDate !== '' &&
    Object.keys(clientErrors).length === 0 &&
    !unparsable;

  const costInput: EquipmentCostInput = {
    acquisitionMethod: method,
    acquisitionDate: values.acquisitionDate || today(),
    purchasePrice: owned ? numbers.purchasePrice : null,
    residualValue: owned ? numbers.residualValue : null,
    usefulLifeMonths: owned ? numbers.usefulLifeMonths : null,
    monthlyPayment: leased ? numbers.monthlyPayment : null,
    dailyRate: hired ? numbers.dailyRate : null,
    contractEndDate: owned ? null : orNull(values.contractEndDate),
    disposalDate: retired ? orNull(values.disposalDate) : null,
  };
  const preview = isComplete
    ? {
        depreciationEndDate: depreciationEndDate(costInput),
        dailyCost: equipmentDailyCost(costInput, today()),
      }
    : null;

  async function submit(event: React.FormEvent): Promise<boolean> {
    event.preventDefault();
    if (!isComplete || pending) {
      return false;
    }
    setError(null);
    setServerFieldErrors({});

    const payload = {
      typeCode: values.typeCode,
      designation: values.designation.trim(),
      fleetNumber: orNull(values.fleetNumber),
      brand: orNull(values.brand),
      model: orNull(values.model),
      serialNumber: orNull(values.serialNumber),
      registrationNumber: orNull(values.registrationNumber),
      manufactureYear: numbers.manufactureYear,
      status: values.status,
      acquisitionMethod: method,
      acquisitionDate: values.acquisitionDate,
      supplier: orNull(values.supplier),
      purchasePrice: costInput.purchasePrice ?? null,
      residualValue: costInput.residualValue ?? null,
      usefulLifeMonths: costInput.usefulLifeMonths ?? null,
      monthlyPayment: costInput.monthlyPayment ?? null,
      buyoutValue: method === AcquisitionMethod.LEASING ? numbers.buyoutValue : null,
      dailyRate: costInput.dailyRate ?? null,
      contractEndDate: costInput.contractEndDate ?? null,
      disposalDate: costInput.disposalDate ?? null,
      notes: orNull(values.notes),
    };

    try {
      if (isEditing) {
        await update.mutateAsync({ id: equipment.id, data: payload });
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
    fieldErrors: shown,
    preview,
    owned,
    leased,
    hired,
    retired,
    isEditing,
  };
}

const KNOWN: Record<string, EquipmentFieldErrorKey> = {
  'form.errors.required': 'required',
  'form.errors.endBeforeStart': 'endBeforeStart',
  'form.errors.residualAbovePrice': 'residualAbovePrice',
  'form.errors.unknownEquipmentType': 'unknownEquipmentType',
  'form.errors.fleetNumberTaken': 'fleetNumberTaken',
};

/** The API's per-field refusals this form knows how to say; anything else is a general alert. */
function toFieldErrors(caught: unknown): FieldErrors {
  if (!(caught instanceof ApiError) || !caught.fields) {
    return {};
  }
  const result: FieldErrors = {};
  const fields = valuesOf(null);
  for (const { field, code } of caught.fields) {
    const key = KNOWN[code];
    if (key && field in fields) {
      result[field as Field] = key;
    }
  }
  return result;
}
