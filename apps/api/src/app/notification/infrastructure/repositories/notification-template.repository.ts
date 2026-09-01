import { Injectable } from '@nestjs/common';
import { NotificationTemplate as PrismaTemplate } from '@prisma/client';
import { PrismaService } from '@shared/prisma/prisma.service';
import { NotificationTemplate } from '../../domain/entities/notification-template.entity';
import {
  NotificationChannel,
  NotificationLocale,
  NotificationSubject,
} from '../../domain/notification.types';
import { TemplateRepositoryPort } from '../../domain/ports/template-repository.port';

/**
 * The one place allowed to know both the Prisma enums and the domain ones.
 *
 * They are spelled identically on purpose — the domain enum's values *are* the
 * database's — so the mapping is an assertion rather than a table. If they ever
 * diverge, this is the file that has to say so.
 *
 * `notification_templates` carries no `organization_id`, so the multi-tenant
 * extension leaves it alone: a lookup works before any tenant is known, which is
 * what lets an invitation be sent while the recipient has no session.
 */
@Injectable()
export class PrismaNotificationTemplateRepository implements TemplateRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(
    subject: NotificationSubject,
    channel: NotificationChannel,
    locale: NotificationLocale,
  ): Promise<NotificationTemplate | null> {
    const row = await this.prisma.notificationTemplate.findUnique({
      where: { subject_channel_locale: { subject, channel, locale } },
    });

    return row ? toDomain(row) : null;
  }
}

function toDomain(row: PrismaTemplate): NotificationTemplate {
  return new NotificationTemplate(
    row.id,
    row.subject as NotificationSubject,
    row.channel as NotificationChannel,
    row.locale as NotificationLocale,
    row.subjectLine,
    row.body,
  );
}
