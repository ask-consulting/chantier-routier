import { describe, expect, it } from 'vitest';
import manifest from './manifest';

/**
 * What the browser needs to offer "Install", and what Android needs to draw
 * the icon properly — easy to break without noticing, since nothing fails:
 * the install prompt simply never appears.
 */
describe('manifest', () => {
  const app = manifest();

  it('opens standalone, on the worksites, within the whole site', () => {
    expect(app.display).toBe('standalone');
    expect(app.start_url).toBe('/worksites');
    expect(app.scope).toBe('/');
    expect(app.short_name).toBe('Chantia');
  });

  it('has the 192 and 512 icons installability asks for, and a maskable one', () => {
    const icons = app.icons ?? [];
    expect(icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });
});
