import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationChannel, NotificationLocale, NotificationSubject } from '../notification.types';

export interface TemplateRepositoryPort {
  /**
   * The single template for this combination, or null.
   *
   * There is no "closest match" and no fallback to another language: a template
   * is seeded by migration for every (subject, channel, locale), so a miss is a
   * missing migration, not a missing translation. Guessing here would hide that.
   */
  findOne(
    subject: NotificationSubject,
    channel: NotificationChannel,
    locale: NotificationLocale,
  ): Promise<NotificationTemplate | null>;
}

export const TEMPLATE_REPOSITORY_PORT = Symbol('TemplateRepositoryPort');
