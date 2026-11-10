import { Module } from '@nestjs/common';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { DemoRefresher } from './demo-refresher.service';

/** The public demonstration, kept fresh when `DEMO_ENABLED` is set. */
@Module({
  imports: [PrismaModule],
  providers: [DemoRefresher],
})
export class DemoModule {}
