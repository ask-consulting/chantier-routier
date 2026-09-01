import { afterEach, describe, expect, it } from 'vitest';
import notificationConfig, { NotificationConfig } from './notification.config';

/**
 * The config is where a mail outage gets decided, so its refusals are the part
 * worth pinning: a typo in `EMAIL_PROVIDER` and a missing key both have to stop
 * the boot, because both otherwise end as "the invitation went to the log".
 */

const KEYS = ['EMAIL_PROVIDER', 'BREVO_API_KEY', 'EMAIL_FROM_ADDRESS', 'EMAIL_FROM_NAME'];

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

function load(): NotificationConfig {
  return notificationConfig() as NotificationConfig;
}

describe('notification config', () => {
  it('defaults to the log sender, so a fresh clone sends nowhere', () => {
    expect(load().email.provider).toBe('log');
  });

  it('reads the Brevo settings when the provider is Brevo', () => {
    process.env.EMAIL_PROVIDER = 'brevo';
    process.env.BREVO_API_KEY = 'xkeysib-1';
    process.env.EMAIL_FROM_ADDRESS = 'contact@exemple.fr';
    process.env.EMAIL_FROM_NAME = 'Chantia BTP';

    expect(load().email).toEqual({
      provider: 'brevo',
      apiKey: 'xkeysib-1',
      fromAddress: 'contact@exemple.fr',
      fromName: 'Chantia BTP',
    });
  });

  it('falls back to a default sender name', () => {
    process.env.EMAIL_PROVIDER = 'brevo';
    process.env.BREVO_API_KEY = 'xkeysib-1';
    process.env.EMAIL_FROM_ADDRESS = 'contact@exemple.fr';

    expect(load().email.fromName).toBe('Chantia');
  });

  it('refuses an unknown provider rather than quietly logging', () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';

    expect(load).toThrow(/EMAIL_PROVIDER/);
  });

  it('refuses Brevo without a key or without a sender address', () => {
    process.env.EMAIL_PROVIDER = 'brevo';
    expect(load).toThrow(/BREVO_API_KEY/);

    process.env.BREVO_API_KEY = 'xkeysib-1';
    expect(load).toThrow(/EMAIL_FROM_ADDRESS/);
  });
});
