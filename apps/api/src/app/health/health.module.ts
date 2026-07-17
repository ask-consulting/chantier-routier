import { Module } from '@nestjs/common';
import { HealthController } from './presentation/controller/health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
