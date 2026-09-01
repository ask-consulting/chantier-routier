import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { SendNotificationHandler } from './application/commands/send-notification.handler';
import { CHANNEL_SENDERS } from './domain/ports/channel-sender.port';
import { TEMPLATE_REPOSITORY_PORT } from './domain/ports/template-repository.port';
import { PrismaNotificationTemplateRepository } from './infrastructure/repositories/notification-template.repository';
import { BrevoEmailSender } from './infrastructure/senders/brevo-email.sender';
import { LogEmailSender } from './infrastructure/senders/log-email.sender';
import notificationConfig, { NotificationConfig } from './config/notification.config';

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
 * **Which email sender runs is a deploy variable**, not a build: `EMAIL_PROVIDER`
 * picks between the log and Brevo's HTTP API. Exactly one of the two is built —
 * the factory constructs it — so the unused one never asks for a key it has no
 * reason to hold.
 *
 * **Registering a channel** is one line in `CHANNEL_SENDERS`. The `sms` channel
 * has templates and no sender on purpose: the table is what a migration fills,
 * and back-filling a channel later would mean re-editing every template. A send
 * on it fails loudly with `ChannelUnavailableException` rather than silently.
 */
@Global()
@Module({
  imports: [ConfigModule.forFeature(notificationConfig), PrismaModule],
  providers: [
    SendNotificationHandler,
    { provide: TEMPLATE_REPOSITORY_PORT, useClass: PrismaNotificationTemplateRepository },
    {
      provide: CHANNEL_SENDERS,
      useFactory: (config: ConfigService) => {
        const { email } = config.getOrThrow<NotificationConfig>('notification');

        // Said out loud at boot. The failure this guards against is a deploy
        // that forgot the variable: mails then go to the log, everything looks
        // healthy, and nobody receives an invitation until somebody thinks to
        // read the logs.
        Logger.log(`Email channel: ${email.provider}`, 'NotificationModule');

        return [email.provider === 'brevo' ? new BrevoEmailSender(email) : new LogEmailSender()];
      },
      inject: [ConfigService],
    },
  ],
  exports: [SendNotificationHandler],
})
export class NotificationModule {}
