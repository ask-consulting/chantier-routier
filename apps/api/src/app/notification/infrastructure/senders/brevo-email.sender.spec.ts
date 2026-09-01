import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutgoingMessage } from '../../domain/ports/channel-sender.port';
import { BrevoEmailSender } from './brevo-email.sender';

/**
 * The sender is one HTTP call, so what is worth testing is the *shape* of that
 * call and what happens when it comes back wrong. Nothing here touches the
 * network: `fetch` is replaced, which is also the reason the sender takes its
 * config as a plain object rather than reaching for `ConfigService`.
 */

const CONFIG = {
  provider: 'brevo' as const,
  apiKey: 'xkeysib-secret',
  fromAddress: 'contact@exemple.fr',
  fromName: 'Chantia',
};

const MESSAGE: OutgoingMessage = {
  recipient: { email: 'ouvrier@exemple.fr', name: 'Amina B.' },
  subjectLine: 'Vous êtes invité',
  body: 'Lien : https://app.example/invitation/abc',
};

function respond(status: number, body = '{}'): Response {
  return new Response(body, { status });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => respond(201, '{"messageId":"<1@brevo>"}'));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BrevoEmailSender', () => {
  it('posts the message to the Brevo API with the key in the header', async () => {
    await new BrevoEmailSender(CONFIG).send(MESSAGE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['api-key']).toBe('xkeysib-secret');

    expect(JSON.parse(init.body as string)).toEqual({
      sender: { email: 'contact@exemple.fr', name: 'Chantia' },
      to: [{ email: 'ouvrier@exemple.fr', name: 'Amina B.' }],
      subject: 'Vous êtes invité',
      textContent: 'Lien : https://app.example/invitation/abc',
    });
  });

  it('gives up rather than hanging on a silent provider', async () => {
    await new BrevoEmailSender(CONFIG).send(MESSAGE);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends Arabic bodies unchanged', async () => {
    await new BrevoEmailSender(CONFIG).send({
      ...MESSAGE,
      subjectLine: 'تمت دعوتك',
      body: 'مرحبا أمينة،',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(init.body as string) as { subject: string; textContent: string };
    expect(payload.subject).toBe('تمت دعوتك');
    expect(payload.textContent).toBe('مرحبا أمينة،');
  });

  it('fails loudly when Brevo refuses, quoting its diagnosis and not our key', async () => {
    fetchMock.mockResolvedValue(
      respond(400, '{"code":"invalid_parameter","message":"sender not verified"}'),
    );

    await expect(new BrevoEmailSender(CONFIG).send(MESSAGE)).rejects.toThrow(
      /HTTP 400.*sender not verified/s,
    );
    await expect(new BrevoEmailSender(CONFIG).send(MESSAGE)).rejects.not.toThrow(
      /xkeysib-secret/,
    );
  });

  it('still reports the status when the error body cannot be read', async () => {
    const unreadable = { ok: false, status: 502, text: () => Promise.reject(new Error('nope')) };
    fetchMock.mockResolvedValue(unreadable as unknown as Response);

    await expect(new BrevoEmailSender(CONFIG).send(MESSAGE)).rejects.toThrow(/HTTP 502/);
  });

  it('refuses a recipient with no address instead of posting an empty `to`', async () => {
    await expect(
      new BrevoEmailSender(CONFIG).send({ ...MESSAGE, recipient: { name: 'Amina B.' } }),
    ).rejects.toThrow(/recipient email/);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
