import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import identityConfig, { IdentityConfig } from './identity.config';

/**
 * The identity settings, and mostly the one whose default is dangerous.
 *
 * `WEB_APP_URL` is what turns an invitation path into a link somebody can click.
 * It used to fall back to `http://localhost:3000` everywhere, so a deployment
 * that forgot it sent perfectly well-formed emails pointing at the recipient's
 * own machine — account created, mail delivered, link dead, nothing logged. That
 * is what production did on 2 September 2026.
 *
 * The rest is ordinary parsing, tested here because a config that silently falls
 * back to a default is the same class of failure in a smaller coat: a mistyped
 * `JWT_ACCESS_TTL` must not become five minutes without saying so.
 */

const KEYS = [
  'JWT_ACCESS_SECRET',
  'JWT_ISSUER',
  'JWT_ACCESS_TTL',
  'JWT_REFRESH_TTL',
  'MIN_PASSWORD_LENGTH',
  'INVITATION_TTL',
  'ALLOW_SELF_REGISTRATION',
  'WEB_APP_URL',
  'NODE_ENV',
];

const saved = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of KEYS) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }
  process.env.JWT_ACCESS_SECRET = 'secret-de-test';
});

afterEach(() => {
  for (const [key, value] of saved) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

function load(): IdentityConfig {
  return identityConfig() as IdentityConfig;
}

describe('WEB_APP_URL', () => {
  it('falls back to localhost in development, where that is the right answer', () => {
    expect(load().webAppUrl).toBe('http://localhost:3000');
  });

  it('refuses to boot in production without it', () => {
    process.env.NODE_ENV = 'production';

    // A crash on deploy is cheap. An invitation that silently goes nowhere is
    // not: nothing fails, nothing is logged, and you find out when somebody
    // clicks a link pointing at their own machine.
    expect(load).toThrow(/WEB_APP_URL is required in production/);
  });

  it('treats a blank value as missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.WEB_APP_URL = '   ';

    expect(load).toThrow(/WEB_APP_URL/);
  });

  it('takes the configured value in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.WEB_APP_URL = 'https://chantier-routier.vercel.app';

    expect(load().webAppUrl).toBe('https://chantier-routier.vercel.app');
  });

  it('trims trailing slashes, so a path can start with one', () => {
    process.env.WEB_APP_URL = 'https://chantia.example///';

    // Otherwise every link would carry `//invitation`.
    expect(load().webAppUrl).toBe('https://chantia.example');
  });
});

describe('the rest of the identity settings', () => {
  it('requires the signing secret, in every environment', () => {
    delete process.env.JWT_ACCESS_SECRET;

    expect(load).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('keeps registration closed unless it is opened explicitly', () => {
    expect(load().allowSelfRegistration).toBe(false);

    process.env.ALLOW_SELF_REGISTRATION = 'yes';
    // Anything but the exact string is still closed: a missing or mistyped
    // variable must not open sign-up on a private back-office.
    expect(load().allowSelfRegistration).toBe(false);

    process.env.ALLOW_SELF_REGISTRATION = 'true';
    expect(load().allowSelfRegistration).toBe(true);
  });

  it('has the lifetimes the module documents', () => {
    const config = load();

    expect(config.accessTokenTtl).toBe(5 * 60);
    expect(config.refreshTokenTtl).toBe(30 * 24 * 60 * 60);
    expect(config.invitationTtl).toBe(7 * 24 * 60 * 60);
    expect(config.minPasswordLength).toBe(10);
  });

  it('reads the overrides when they are numbers', () => {
    process.env.JWT_ACCESS_TTL = '900';
    process.env.INVITATION_TTL = '3600';

    expect(load().accessTokenTtl).toBe(900);
    expect(load().invitationTtl).toBe(3600);
  });

  it('ignores an override that is not a positive number', () => {
    process.env.JWT_ACCESS_TTL = 'quinze minutes';
    expect(load().accessTokenTtl).toBe(5 * 60);

    process.env.JWT_ACCESS_TTL = '-30';
    expect(load().accessTokenTtl).toBe(5 * 60);

    process.env.JWT_ACCESS_TTL = '0';
    expect(load().accessTokenTtl).toBe(5 * 60);
  });
});
