import {
  translated,
  type IMaterialCategory,
  type IOwnMaterial,
  type MaterialUnit,
  type Translations,
} from '@chantia/shared';

/**
 * One material as a picker shows it, whichever list it comes from: the
 * common catalog, or the organization's own additions.
 */
export interface MaterialChoice {
  id: string;
  categoryId: string;
  label: string;
  unit: MaterialUnit;
  own: boolean;
}

/** A label of the catalog in the reader's language — else French, else its code. */
export function labelOf(entry: { code: string; labels: Translations }, locale: string): string {
  return translated(entry.labels, locale, entry.code);
}

/** What a planned need is called: its own label, or the catalog's in the reader's language. */
export function needLabel(
  need: { label: string | null; labels: Translations; materialId: string },
  locale: string,
): string {
  return need.label ?? translated(need.labels, locale, need.materialId);
}

/**
 * Every material of one category, the catalog's in its order and then the
 * organization's own by name — the order of the picker.
 */
export function choicesOf(
  catalog: readonly IMaterialCategory[],
  own: readonly IOwnMaterial[],
  categoryId: string,
  locale: string,
): MaterialChoice[] {
  const category = catalog.find((entry) => entry.id === categoryId);
  return [
    ...(category?.materials ?? []).map((material) => ({
      id: material.id,
      categoryId,
      label: labelOf(material, locale),
      unit: material.unit,
      own: false,
    })),
    ...own
      .filter((material) => material.categoryId === categoryId)
      .map((material) => ({ ...material, own: true })),
  ];
}

/** A quantity as typed — a comma or a point — or `null` when it is not one. */
export function parseQuantity(typed: string): number | null {
  const value = Number(typed.trim().replace(',', '.'));
  return typed.trim() !== '' && Number.isFinite(value) && value > 0
    ? Math.round(value * 1000) / 1000
    : null;
}
