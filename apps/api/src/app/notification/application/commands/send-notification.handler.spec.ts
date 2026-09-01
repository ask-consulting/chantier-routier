import { describe, expect, it, vi } from 'vitest';
import { NotificationTemplate } from '../../domain/entities/notification-template.entity';
import {
  ChannelUnavailableException,
  TemplateNotFoundException,
  UnaddressableRecipientException,
} from '../../domain/exceptions/notification.exceptions';
import { ChannelSenderPort, OutgoingMessage } from '../../domain/ports/channel-sender.port';
import { TemplateRepositoryPort } from '../../domain/ports/template-repository.port';
import {
  NotificationChannel,
  NotificationLocale,
  NotificationSubject,
} from '../../domain/notification.types';
import { SendNotificationCommand } from './send-notification.command';
import { SendNotificationHandler } from './send-notification.handler';

/**
 * The use case, and mostly the difference between its two entry points.
 *
 * `execute` reports failure; `executeDetached` never does. That is not a
 * convenience pair — it is the whole reason an invitation survives a mail
 * outage, and the reason a future `POST /notifications` can still answer 500.
 */

const TEMPLATE = new NotificationTemplate(
  'tpl-1',
  NotificationSubject.INVITATION,
  NotificationChannel.EMAIL,
  NotificationLocale.FR,
  'Bienvenue {{firstName}}',
  'Lien : {{invitationUrl}}',
);

function setup(options: { template?: NotificationTemplate | null; sendFails?: boolean } = {}) {
  const sent: OutgoingMessage[] = [];
  const send = vi.fn(async (message: OutgoingMessage) => {
    if (options.sendFails) {
      throw new Error('smtp is down');
    }
    sent.push(message);
  });

  const emailSender: ChannelSenderPort = { channel: NotificationChannel.EMAIL, send };
  const findOne = vi.fn(async () =>
    options.template === undefined ? TEMPLATE : options.template,
  );
  const templates = { findOne } as unknown as TemplateRepositoryPort;

  return { sent, send, findOne, handler: new SendNotificationHandler(templates, [emailSender]) };
}

function anInvitation(overrides: Partial<{ channel: NotificationChannel }> = {}) {
  return new SendNotificationCommand(
    NotificationSubject.INVITATION,
    overrides.channel ?? NotificationChannel.EMAIL,
    NotificationLocale.FR,
    { email: 'chef@chantier.fr', name: 'Amine' },
    { firstName: 'Amine', invitationUrl: 'https://app/invitation/abc' },
  );
}

describe('execute', () => {
  it('renders the template and hands it to the channel', async () => {
    const h = setup();

    await h.handler.execute(anInvitation());

    expect(h.sent).toEqual([
      {
        recipient: { email: 'chef@chantier.fr', name: 'Amine' },
        subjectLine: 'Bienvenue Amine',
        body: 'Lien : https://app/invitation/abc',
      },
    ]);
  });

  it('looks the template up by subject, channel and language together', async () => {
    const h = setup();

    await h.handler.execute(anInvitation());

    expect(h.findOne).toHaveBeenCalledWith(
      NotificationSubject.INVITATION,
      NotificationChannel.EMAIL,
      NotificationLocale.FR,
    );
  });

  /**
   * A missing template means a missing migration, not a missing translation —
   * every combination is seeded. Falling back to another language would hide
   * that, and send Arabic to somebody who reads French.
   */
  it('refuses when no template exists, rather than falling back', async () => {
    const h = setup({ template: null });

    await expect(h.handler.execute(anInvitation())).rejects.toThrow(TemplateNotFoundException);
  });

  /**
   * SMS has templates and no transport. That is the designed state, so it must
   * fail loudly and distinctly — not look like a missing template.
   */
  it('refuses a channel that has templates but no sender', async () => {
    const h = setup();

    await expect(
      h.handler.execute(anInvitation({ channel: NotificationChannel.SMS })),
    ).rejects.toThrow(ChannelUnavailableException);
  });

  it('checks the channel before touching the database', async () => {
    const h = setup();

    await expect(
      h.handler.execute(anInvitation({ channel: NotificationChannel.SMS })),
    ).rejects.toThrow();

    expect(h.findOne).not.toHaveBeenCalled();
  });

  it('refuses a recipient carrying no address for the channel', async () => {
    const h = setup();
    const command = new SendNotificationCommand(
      NotificationSubject.INVITATION,
      NotificationChannel.EMAIL,
      NotificationLocale.FR,
      { name: 'Amine' },
      { firstName: 'Amine', invitationUrl: 'https://app/x' },
    );

    await expect(h.handler.execute(command)).rejects.toThrow(UnaddressableRecipientException);
  });

  it('reports a transport failure to its caller', async () => {
    const h = setup({ sendFails: true });

    await expect(h.handler.execute(anInvitation())).rejects.toThrow('smtp is down');
  });

  it('sends nothing when a placeholder has no value', async () => {
    const h = setup();
    const command = new SendNotificationCommand(
      NotificationSubject.INVITATION,
      NotificationChannel.EMAIL,
      NotificationLocale.FR,
      { email: 'chef@chantier.fr' },
      { firstName: 'Amine' },
    );

    await expect(h.handler.execute(command)).rejects.toThrow(/invitationUrl/);
    expect(h.sent).toEqual([]);
  });
});

describe('executeDetached', () => {
  it('still sends', async () => {
    const h = setup();

    h.handler.executeDetached(anInvitation());
    await vi.waitFor(() => expect(h.sent).toHaveLength(1));
  });

  /**
   * The property the whole design rests on: an invitation must not lose an
   * account to a mail outage.
   *
   * Asserting `not.toThrow()` would prove nothing — a rejected promise throws
   * nothing synchronously, so a handler that dropped its `.catch` would sail
   * past it. What actually has to hold is that *no unhandled rejection* escapes,
   * so the test listens for one.
   */
  it.each([
    ['the transport fails', { sendFails: true }],
    ['no template exists', { template: null }],
  ])('lets nothing escape when %s', async (_label, options) => {
    const h = setup(options);
    const escaped: unknown[] = [];
    const onUnhandled = (reason: unknown): void => void escaped.push(reason);
    process.on('unhandledRejection', onUnhandled);

    try {
      h.handler.executeDetached(anInvitation());
      // Two turns of the microtask queue, then one macrotask: Node reports an
      // unhandled rejection only once the queue has drained.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(escaped).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('returns before the send completes', () => {
    const h = setup();

    h.handler.executeDetached(anInvitation());

    // Synchronously after the call, nothing has left yet — that is what makes
    // it safe to put in front of a `return` inside a transaction.
    expect(h.sent).toEqual([]);
  });
});
