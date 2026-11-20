import { MaterialUnit } from '../enums/material.enums';
import { Translations } from './equipment.interface';

/**
 * One material of the common catalog — zeft, 7jar, trab, sand, cement… Global,
 * the same for every organization, written only by migrations. Served by
 * `GET /material-catalog` with all its labels, the client picking its language.
 */
export interface ICatalogMaterial {
  id: string;
  /** Readable and stable; the catalog is identified by `id`. */
  code: string;
  categoryId: string;
  unit: MaterialUnit;
  labels: Translations;
}

/** A family of the catalog, with its materials — already in display order. */
export interface IMaterialCategory {
  id: string;
  code: string;
  labels: Translations;
  materials: ICatalogMaterial[];
}

/**
 * A material an organization added to the catalog for itself: private to it,
 * filed under one of the common categories, named in the words of whoever
 * typed it — one label, not a translation per language.
 */
export interface IOwnMaterial {
  id: string;
  categoryId: string;
  label: string;
  unit: MaterialUnit;
}

export interface ICreateOwnMaterial {
  categoryId: string;
  label: string;
  unit: MaterialUnit;
}

/** The unit changes only while no task counts in it yet. */
export type IUpdateOwnMaterial = Partial<ICreateOwnMaterial>;

/**
 * What a task is planned to need of one material: the quantity, in the
 * material's unit, and what one unit is expected to cost.
 */
export interface ITaskMaterial {
  id: string;
  taskId: string;
  /** A material of the catalog, or one of the organization's own. */
  materialId: string;
  /** The catalog's labels; empty for an organization's own material, see `label`. */
  labels: Translations;
  /** Set for an organization's own material, `null` for one of the catalog. */
  label: string | null;
  unit: MaterialUnit;
  quantity: number;
  /** Per unit, in the currency's smallest unit. Withheld without `budget:read`. */
  unitPrice?: number | null;
  /** `quantity × unitPrice`, rounded; `null` without a price. Withheld like it. */
  plannedCost?: number | null;
}

export interface IPlanTaskMaterial {
  /** The id of a catalog material, or of one of the organization's own. */
  materialId: string;
  quantity: number;
  unitPrice?: number | null;
}

export interface IUpdateTaskMaterial {
  quantity?: number;
  /** `null` takes the price away. */
  unitPrice?: number | null;
}
