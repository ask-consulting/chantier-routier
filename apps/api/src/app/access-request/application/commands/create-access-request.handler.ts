import { AccessRequestKind } from '@chantia/shared';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SendNotificationCommand } from '@notification/application/commands/send-notification.command';
import { SendNotificationHandler } from '@notification/application/commands/send-notification.handler';
import {
  NotificationChannel,
  NotificationLocale,
  NotificationSubject,
} from '@notification/domain/notification.types';
import { randomUUID } from 'node:crypto';
import { AccessRequestConfig } from '../../config/access-request.config';
import { AccessRequest } from '../../domain/entities/access-request.entity';
import {
  ACCESS_REQUEST_REPOSITORY_PORT,
  AccessRequestRepositoryPort,
} from '../../domain/ports/access-request-repository.port';
import { CreateAccessRequestCommand } from './create-access-request.command';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const KIND_LABELS: Record<AccessRequestKind, string> = {
  [AccessRequestKind.BUILDING]: 'Bâtiment',
  [AccessRequestKind.ROADS]: 'Routes',
  [AccessRequestKind.NETWORKS]: 'Réseaux',
  [AccessRequestKind.EARTHWORKS]: 'Terrassement',
  [AccessRequestKind.OTHER]: 'Autre',
};

/**
 * Records the request first, then announces it.
 *
 * The record is what matters: the announcement is detached, so a mail outage
 * cannot lose a prospect or fail the form.
 */
@CommandHandler(CreateAccessRequestCommand)
export class CreateAccessRequestHandler implements ICommandHandler<CreateAccessRequestCommand> {
  private readonly logger = new Logger(CreateAccessRequestHandler.name);
  private readonly config: AccessRequestConfig;

  constructor(
    @Inject(ACCESS_REQUEST_REPOSITORY_PORT)
    private readonly repository: AccessRequestRepositoryPort,
    private readonly notifications: SendNotificationHandler,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<AccessRequestConfig>('accessRequest');
  }

  async execute({ data }: CreateAccessRequestCommand): Promise<void> {
    // The hidden field was filled in, so this is a bot. It gets the same answer
    // as anyone else: telling it apart would teach it what to change.
    if (data.website) {
      return;
    }

    const request = await this.repository.save(
      AccessRequest.create({
        id: randomUUID(),
        company: data.company,
        phone: data.phone,
        kind: data.kind,
        locale: data.locale,
      }),
    );

    const lastDay = await this.repository.countSince(new Date(Date.now() - ONE_DAY_MS));
    if (lastDay > this.config.dailyEmailLimit) {
      this.logger.warn(`Daily limit reached: access request ${request.id} stored, not announced`);
      return;
    }

    this.notifications.executeDetached(
      new SendNotificationCommand(
        NotificationSubject.ACCESS_REQUEST,
        NotificationChannel.EMAIL,
        NotificationLocale.FR,
        { email: this.config.notifyEmail },
        {
          company: request.company,
          phone: request.phone,
          kind: KIND_LABELS[request.kind],
          locale: request.locale,
        },
      ),
    );
  }
}
