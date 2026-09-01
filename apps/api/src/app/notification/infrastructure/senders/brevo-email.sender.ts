import { Logger } from '@nestjs/common';
import { NotificationChannel } from '../../domain/notification.types';
import { ChannelSenderPort, OutgoingMessage } from '../../domain/ports/channel-sender.port';
import { NotificationConfig } from '../../config/notification.config';

/**
 * The email channel, over Brevo's HTTP API.
 *
 * **HTTP and not SMTP, on purpose.** Render blocks outbound traffic to ports 25,
 * 465 and 587 on free web services, so a `nodemailer` transport cannot connect
 * at all there — it hangs until it times out. An HTTPS call is not blocked, which
 * makes the API the only shape that works on the plan this project runs on.
 *
 * **Brevo and not Resend** for one reason: Resend's free tier sends only from a
 * domain you have verified by DNS, and this project has no domain — the API
 * lives on `*.onrender.com` and the front on `*.vercel.app`. Brevo's free plan
 * sends from a single mailbox you own, verified by clicking a link. 300 mails a
 * day, no card, no expiry; invitations are a handful a week.
 *
 * Swapping provider is this file and the `provider` union in the config. The
 * port is unchanged, so neither the use case nor identity notices.
 */
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Ten seconds, then give up. `executeDetached` is the caller that matters here:
 * it holds nothing open, but a request with no timeout at all would leave a
 * dangling promise for as long as the provider stays silent.
 */
const REQUEST_TIMEOUT_MS = 10_000;

export class BrevoEmailSender implements ChannelSenderPort {
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger(BrevoEmailSender.name);

  constructor(private readonly config: NotificationConfig['email']) {}

  async send(message: OutgoingMessage): Promise<void> {
    if (!message.recipient.email) {
      // The use case checks this before choosing a sender; repeated here because
      // a port implementation may not assume the caller did its job.
      throw new Error('Brevo needs a recipient email address');
    }

    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': this.config.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: this.config.fromAddress, name: this.config.fromName },
        to: [{ email: message.recipient.email, name: message.recipient.name }],
        subject: message.subjectLine ?? '',
        // Templates are plain text, Arabic included — no HTML part, so nothing
        // has to keep two renderings of the same message in step.
        textContent: message.body,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      // The body carries Brevo's own diagnosis ("sender not verified", "daily
      // limit reached") and is the only place it appears, so it goes into the
      // error. It is *their* error text, never our request — the API key must
      // not end up in a log line.
      throw new Error(`Brevo refused the message (HTTP ${response.status}): ${await safeBody(response)}`);
    }

    this.logger.log(`Email sent to ${message.recipient.email} via Brevo`);
  }
}

/** A failed send must report the HTTP status even when the body is unreadable. */
async function safeBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return '<unreadable body>';
  }
}
