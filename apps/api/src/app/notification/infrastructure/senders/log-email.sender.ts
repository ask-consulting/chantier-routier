import { Injectable, Logger } from '@nestjs/common';
import { ChannelSenderPort, OutgoingMessage } from '../../domain/ports/channel-sender.port';
import { NotificationChannel } from '../../domain/notification.types';

/**
 * The email channel, writing to the log instead of the network.
 *
 * This is not a stub to be tolerated until the real one lands — it is what runs
 * in development, and it is deliberately the default. Choosing a provider means
 * an account, a verified domain and a key; none of that should stand between a
 * fresh clone and a working invitation flow.
 *
 * The real sender does not replace it: `EMAIL_PROVIDER` chooses between the two
 * at boot (`brevo` in production, absent everywhere else), so development keeps
 * this one and neither the port nor the use case changes.
 *
 * It logs the whole message, link included. That is safe here precisely because
 * it is the *development* transport — the invitation link in a local log is the
 * same link the developer would have copied by hand anyway. Swap this class
 * before pointing the log anywhere shared.
 */
@Injectable()
export class LogEmailSender implements ChannelSenderPort {
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger(LogEmailSender.name);

  async send(message: OutgoingMessage): Promise<void> {
    this.logger.log(
      [
        '',
        '──────── email (not actually sent) ────────',
        `To:      ${message.recipient.name ?? ''} <${message.recipient.email}>`,
        `Subject: ${message.subjectLine ?? '(none)'}`,
        '',
        message.body,
        '───────────────────────────────────────────',
      ].join('\n'),
    );
  }
}
