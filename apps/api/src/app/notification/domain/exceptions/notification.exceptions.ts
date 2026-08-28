import { DomainErrorKind, DomainException } from '@shared/domain/domain.exception';
import { NotificationChannel, NotificationLocale, NotificationSubject } from '../notification.types';

/**
 * No template for this combination. A configuration fault, not a user's: every
 * (subject, channel, locale) is seeded by migration, so this means a migration
 * is missing — which is why it reads as a server-side failure rather than a 404.
 */
export class TemplateNotFoundException extends DomainException {
  readonly kind: DomainErrorKind = 'not-found';

  constructor(subject: NotificationSubject, channel: NotificationChannel, locale: NotificationLocale) {
    super(`No ${channel} template for ${subject} in ${locale}`);
  }
}

/** A channel with a template but no transport — `SMS`, today. */
export class ChannelUnavailableException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor(channel: NotificationChannel) {
    super(`No sender is registered for the ${channel} channel`);
  }
}

/** The recipient carries nothing the channel can address. */
export class UnaddressableRecipientException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor(channel: NotificationChannel) {
    super(`The recipient has no address for the ${channel} channel`);
  }
}
