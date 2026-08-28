import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChannelSenderPort, CHANNEL_SENDERS } from '../../domain/ports/channel-sender.port';
import {
  TEMPLATE_REPOSITORY_PORT,
  TemplateRepositoryPort,
} from '../../domain/ports/template-repository.port';
import { NotificationChannel } from '../../domain/notification.types';
import {
  ChannelUnavailableException,
  TemplateNotFoundException,
  UnaddressableRecipientException,
} from '../../domain/exceptions/notification.exceptions';
import { SendNotificationCommand } from './send-notification.command';

/**
 * The use case. Look up the template, fill it, hand it to the channel.
 *
 * Callers choose whether to await it. `execute` is the synchronous contract —
 * it resolves when the message has left, and rejects when it has not. Anything
 * that must not fail its own transaction calls `executeDetached` instead, which
 * is the asynchronous one: it never throws, and reports into the log.
 *
 * Both exist because the two are genuinely different decisions, not two moods.
 * An invitation must not lose an account to a mail outage (docs/08); a future
 * `POST /notifications` will want the failure in its response.
 */
@Injectable()
export class SendNotificationHandler {
  private readonly logger = new Logger(SendNotificationHandler.name);
  private readonly senders: ReadonlyMap<NotificationChannel, ChannelSenderPort>;

  constructor(
    @Inject(TEMPLATE_REPOSITORY_PORT)
    private readonly templates: TemplateRepositoryPort,
    @Inject(CHANNEL_SENDERS)
    senders: readonly ChannelSenderPort[],
  ) {
    this.senders = new Map(senders.map((sender) => [sender.channel, sender]));
  }

  async execute(command: SendNotificationCommand): Promise<void> {
    const { subject, channel, locale, recipient, data } = command;

    const sender = this.senders.get(channel);
    if (!sender) {
      // A template exists for SMS and no transport does. Failing here — rather
      // than at the template lookup — keeps the two facts separate.
      throw new ChannelUnavailableException(channel);
    }

    if (!hasAddress(recipient, channel)) {
      throw new UnaddressableRecipientException(channel);
    }

    const template = await this.templates.findOne(subject, channel, locale);
    if (!template) {
      throw new TemplateNotFoundException(subject, channel, locale);
    }

    const { subjectLine, body } = template.render(data);
    await sender.send({ recipient, subjectLine, body });
  }

  /**
   * Fire and forget, deliberately.
   *
   * Returns before the send completes and never rejects: a caller using this
   * has already decided that its own work stands or falls on its own. The only
   * trace of a failure is this log line — which is the accepted cost, written
   * down in `docs/14-etat-des-lieux.md` §5.1 rather than discovered later.
   */
  executeDetached(command: SendNotificationCommand): void {
    void this.execute(command).catch((error: unknown) => {
      this.logger.error(
        `Failed to send ${command.subject} over ${command.channel} (${command.locale}): ` +
          (error instanceof Error ? error.message : String(error)),
      );
    });
  }
}

function hasAddress(
  recipient: { email?: string; phone?: string },
  channel: NotificationChannel,
): boolean {
  return channel === NotificationChannel.EMAIL ? !!recipient.email : !!recipient.phone;
}
