import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { SendNotificationHandler } from './application/commands/send-notification.handler';
import { CHANNEL_SENDERS } from './domain/ports/channel-sender.port';
import { TEMPLATE_REPOSITORY_PORT } from './domain/ports/template-repository.port';
import { PrismaNotificationTemplateRepository } from './infrastructure/repositories/notification-template.repository';
import { LogEmailSender } from './infrastructure/senders/log-email.sender';

/**
 * The notification module.
 *
 * It exports the use case and nothing else. Today identity calls it in-process;
 * the plan is a `POST /notifications` on its own service, and the seam that makes
 * that a small change is the command object, not this module — see
 * `send-notification.command.ts`.
 *
 * `@Global`, like the other transverse modules of `app/shared/`. That is not a
 * convenience: it is what keeps `identity.module.ts` free of an import the wall
 * forbids. Only `invite-user.handler.ts` names this module's types, and the
 * ESLint exception is exactly that one file wide.
 *
 * **Registering a channel** is one line in `CHANNEL_SENDERS`. The `sms` channel
 * has templates and no sender on purpose: the table is what a migration fills,
 * and back-filling a channel later would mean re-editing every template. A send
 * on it fails loudly with `ChannelUnavailableException` rather than silently.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    SendNotificationHandler,
    { provide: TEMPLATE_REPOSITORY_PORT, useClass: PrismaNotificationTemplateRepository },
    LogEmailSender,
    {
      provide: CHANNEL_SENDERS,
      useFactory: (email: LogEmailSender) => [email],
      inject: [LogEmailSender],
    },
  ],
  exports: [SendNotificationHandler],
})
export class NotificationModule {}
