import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from '@config/app.config';
import authConfig from '@config/auth.config';
import multiTenantConfig from '@config/multi-tenant.config';
import throttlingConfig from '@config/throttling.config';
import { IdentityModule } from '@identity/identity.module';
import { AccessControlModule } from '@shared/auth';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { TenantContextMiddleware, TenantModule } from '@shared/tenant';
import { ThrottlingModule } from '@shared/throttling';
import { HealthModule } from './health/health.module';
import { NotificationModule } from './notification/notification.module';
import { WorkerModule } from './worker/worker.module';
import { WorksiteModule } from './worksite/worksite.module';

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: !ENV ? '.env' : `.env.${ENV}`,
      load: [appConfig, authConfig, multiTenantConfig, throttlingConfig],
    }),
    // Must precede PrismaModule: the tenant-filtered client is built from it.
    TenantModule,
    PrismaModule,
    // Guards every route by default; a route opts out with `@Public()`.
    AccessControlModule,
    // Registers ThrottlerGuard globally as a *provider*, not as a global guard:
    // only the authentication routes ask for it. See ThrottlingModule.
    ThrottlingModule,
    HealthModule,
    // Before IdentityModule: identity calls the send use case directly.
    NotificationModule,
    IdentityModule,
    WorkerModule,
    WorksiteModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Middleware rather than an interceptor: it runs before the guards, so the
    // tenant store already exists when JwtAuthGuard fills it in.
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
