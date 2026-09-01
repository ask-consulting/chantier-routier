import { registerAs } from '@nestjs/config';

/**
 * How the module actually reaches people. Owned by the module, like
 * `identity/config/identity.config.ts` is owned by identity: the day this
 * becomes its own service, this file leaves with it.
 */
export type EmailProvider = 'log' | 'brevo';

export interface NotificationConfig {
  email: {
    /**
     * `log` writes the message to the console; `brevo` posts it to Brevo's HTTP
     * API. Nothing else exists, and an unknown value is refused at boot rather
     * than silently treated as `log` — an invitation that goes nowhere is the
     * one failure nobody notices.
     */
    provider: EmailProvider;
    /** Only read when `provider` is `brevo`, and required in that case. */
    apiKey: string;
    /**
     * The `From` address. Must be a sender Brevo has verified — on the free plan
     * that is a single mailbox you own, not a domain you bought.
     */
    fromAddress: string;
    fromName: string;
  };
}

const DEFAULT_FROM_NAME = 'Chantia';

export default registerAs('notification', (): NotificationConfig => {
  const provider = readProvider(process.env.EMAIL_PROVIDER);

  return {
    email: {
      provider,
      // Required together with the provider, and checked here rather than at the
      // first send: a missing key must break the deploy, not the invitation of
      // whoever happens to be onboarded first.
      apiKey: provider === 'brevo' ? requireEnv('BREVO_API_KEY') : '',
      fromAddress: provider === 'brevo' ? requireEnv('EMAIL_FROM_ADDRESS') : 'no-reply@chantia.local',
      fromName: process.env.EMAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME,
    },
  };
});

function readProvider(value: string | undefined): EmailProvider {
  // Absent means `log`: a fresh clone sends nowhere, which is the deliberate
  // default (docs/14 §5.2). Present but wrong is a typo in a deploy variable,
  // and a typo that falls back to `log` is a mail outage nobody is told about.
  const provider = (value ?? 'log').trim().toLowerCase();
  if (provider !== 'log' && provider !== 'brevo') {
    throw new Error(`EMAIL_PROVIDER must be "log" or "brevo", got "${value}"`);
  }

  return provider;
}

// Not `@config/auth.config`'s `requireEnv`: that one appends "generate one with
// randomBytes", which is good advice for a JWT secret and nonsense for an email
// address. Same shape, different sentence.
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when EMAIL_PROVIDER=brevo`);
  }

  return value;
}
