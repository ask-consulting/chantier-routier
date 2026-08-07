import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@shared/auth';

@ApiTags('Health')
@Controller()
export class HealthController {
  // Render's health check has no credentials — it must reach this unauthenticated.
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  check(): { status: string } {
    return { status: 'ok' };
  }
}
