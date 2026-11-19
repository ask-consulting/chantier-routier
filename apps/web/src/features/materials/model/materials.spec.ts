import { describe, expect, it } from 'vitest';
import { MaterialUnit, type IMaterialCategory } from '@chantia/shared';
import { choicesOf, labelOf, needLabel, parseQuantity } from './materials';

const CATALOG: IMaterialCategory[] = [
  {
    id: 'agg',
    code: 'aggregates',
    labels: { fr: 'Granulats et terres' },
    materials: [
      {
        id: 'sand',
        code: 'sand',
        categoryId: 'agg',
        unit: MaterialUnit.CUBIC_METRE,
        labels: { fr: 'Sable', ar: 'رمل' },
      },
    ],
  },
];

describe('material labels', () => {
  it('reads the catalog in the reader’s language, else French, else the code', () => {
    expect(labelOf(CATALOG[0]!.materials[0]!, 'ar')).toBe('رمل');
    expect(labelOf(CATALOG[0]!.materials[0]!, 'en')).toBe('Sable');
    expect(labelOf({ code: 'sand', labels: {} }, 'fr')).toBe('sand');
  });

  it('names a planned need by its own label first', () => {
    expect(needLabel({ label: 'Sable de oued', labels: {}, materialId: 'm' }, 'ar')).toBe(
      'Sable de oued',
    );
    expect(needLabel({ label: null, labels: { fr: 'Sable' }, materialId: 'm' }, 'ar')).toBe(
      'Sable',
    );
  });
});

describe('choicesOf', () => {
  it('lists the catalog of a category, then the organization’s own in it', () => {
    const own = [
      { id: 'o', categoryId: 'agg', label: 'Sable de oued', unit: MaterialUnit.TONNE },
      { id: 'x', categoryId: 'steel', label: 'Fer 12', unit: MaterialUnit.TONNE },
    ];

    expect(choicesOf(CATALOG, own, 'agg', 'fr')).toEqual([
      { id: 'sand', categoryId: 'agg', label: 'Sable', unit: MaterialUnit.CUBIC_METRE, own: false },
      { id: 'o', categoryId: 'agg', label: 'Sable de oued', unit: MaterialUnit.TONNE, own: true },
    ]);
    expect(choicesOf(CATALOG, own, 'nowhere', 'fr')).toEqual([]);
  });
});

describe('parseQuantity', () => {
  it('reads a comma or a point, to the gram of a tonne', () => {
    expect(parseQuantity('12,5')).toBe(12.5);
    expect(parseQuantity(' 3.25 ')).toBe(3.25);
    expect(parseQuantity('1.23456')).toBe(1.235);
  });

  it('refuses nothing, zero, a negative and a word', () => {
    for (const typed of ['', '0', '-2', 'beaucoup']) {
      expect(parseQuantity(typed)).toBeNull();
    }
  });
});
