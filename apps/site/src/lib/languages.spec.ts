import { describe, expect, it, vi } from 'vitest';
import { LANGS, REDIRECT_SCRIPT, STORAGE_KEY, langInfo, langOf } from './languages';

describe('langOf', () => {
  it('reads the language of a path: none is the page in Arabic letters', () => {
    expect(langOf(undefined)).toBe('ar');
    expect(langOf([])).toBe('ar');
    expect(langOf(['la'])).toBe('la');
    expect(langOf(['fr'])).toBe('fr');
  });

  it('knows no other page', () => {
    expect(langOf(['ar'])).toBeNull();
    expect(langOf(['en'])).toBeNull();
    expect(langOf(['fr', 'x'])).toBeNull();
  });
});

describe('langInfo', () => {
  it('gives each language its page and its HTML language', () => {
    expect(langInfo('ar')).toMatchObject({ path: '/', html: 'aeb' });
    expect(langInfo('la')).toMatchObject({ path: '/la', html: 'aeb-Latn' });
    expect(langInfo('fr')).toMatchObject({ path: '/fr', html: 'fr' });
    expect(LANGS.map((item) => item.path)).toEqual(['/', '/la', '/fr']);
  });
});

/** Runs the `<head>` script of `/` against a stored choice. */
function runRedirect(stored: string | null, { throws = false } = {}) {
  const replace = vi.fn();
  const localStorage = {
    getItem: (key: string) => {
      if (throws) throw new Error('private browsing');
      return key === STORAGE_KEY ? stored : null;
    },
  };
  const location = { replace, search: '?ref=fb', hash: '#signup' };
  new Function('localStorage', 'location', REDIRECT_SCRIPT)(localStorage, location);
  return replace;
}

describe('the redirect of /', () => {
  it('sends a visitor who chose another language to its page, keeping the query and the anchor', () => {
    expect(runRedirect('fr')).toHaveBeenCalledWith('/fr?ref=fb#signup');
    expect(runRedirect('la')).toHaveBeenCalledWith('/la?ref=fb#signup');
  });

  it('stays on / otherwise, storage blocked included', () => {
    expect(runRedirect(null)).not.toHaveBeenCalled();
    expect(runRedirect('ar')).not.toHaveBeenCalled();
    expect(runRedirect('<script>')).not.toHaveBeenCalled();
    expect(runRedirect('fr', { throws: true })).not.toHaveBeenCalled();
  });
});
