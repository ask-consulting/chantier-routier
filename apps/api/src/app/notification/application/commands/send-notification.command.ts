import {
  NotificationChannel,
  NotificationLocale,
  NotificationRecipient,
  NotificationSubject,
} from '../../domain/notification.types';

/**
 * Send one notification.
 *
 * This is the shape a future `POST /notifications` will carry, which is why it
 * is plain data: no entity, no id of anything owned by another context. The day
 * the module becomes its own service, this class becomes its request DTO and
 * nothing else moves.
 */
export class SendNotificationCommand {
  constructor(
    readonly subject: NotificationSubject,
    readonly channel: NotificationChannel,
    readonly locale: NotificationLocale,
    readonly recipient: NotificationRecipient,
    /** Values for the template's `{{placeholders}}`. All of them, or it throws. */
    readonly data: Readonly<Record<string, string>>,
  ) {}
}
