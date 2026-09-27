import { describe, expect, it } from 'vitest';
import { translated } from './locale.enums';

/**
 * Labels stored in the database can gain a language before the product speaks
 * it, or lack one it does — neither may leave a blank on screen.
 */
describe('translated', () => {
  const labels = { fr: 'Niveleuse', ar: 'ممهدة' };

  it('picks the reader’s language', () => {
    expect(translated(labels, 'ar')).toBe('ممهدة');
  });

  it('falls back to French for a language without a row', () => {
    expect(translated(labels, 'en')).toBe('Niveleuse');
  });

  it('falls back to any label, then to the fallback', () => {
    expect(translated({ it: 'Livellatrice' }, 'ar')).toBe('Livellatrice');
    expect(translated({}, 'fr', 'motor_grader')).toBe('motor_grader');
  });
});
