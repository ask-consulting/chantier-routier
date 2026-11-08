import { PrismaService } from '@shared/prisma/prisma.service';
import { describe, expect, it, vi } from 'vitest';
import {
  NotificationChannel,
  NotificationLocale,
  NotificationSubject,
} from '../../domain/notification.types';
import { PrismaNotificationTemplateRepository } from './notification-template.repository';

const lookup = (row: unknown) => {
  const findUnique = vi.fn(async () => row);
  const repository = new PrismaNotificationTemplateRepository({
    notificationTemplate: { findUnique },
  } as unknown as PrismaService);
  return {
    findUnique,
    result: repository.findOne(
      NotificationSubject.ACCESS_REQUEST,
      NotificationChannel.EMAIL,
      NotificationLocale.FR,
    ),
  };
};

describe('PrismaNotificationTemplateRepository', () => {
  it('finds the template for a subject, channel and language', async () => {
    const { findUnique, result } = lookup({
      id: 't-1',
      subject: 'access_request',
      channel: 'email',
      locale: 'fr',
      subjectLine: 'Demande : {{company}}',
      body: 'Entreprise : {{company}}',
    });

    const template = await result;

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        subject_channel_locale: { subject: 'access_request', channel: 'email', locale: 'fr' },
      },
    });
    expect(template?.render({ company: 'A' }).subjectLine).toBe('Demande : A');
  });

  it('answers null when none exists', async () => {
    await expect(lookup(null).result).resolves.toBeNull();
  });
});
