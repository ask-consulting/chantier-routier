import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from '@config/app.config';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { WorksiteModule } from './worksite/worksite.module';

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: !ENV ? '.env' : `.env.${ENV}`,
      load: [appConfig],
    }),
    PrismaModule,
    HealthModule,
    WorksiteModule,
  ],
})
export class AppModule {}
