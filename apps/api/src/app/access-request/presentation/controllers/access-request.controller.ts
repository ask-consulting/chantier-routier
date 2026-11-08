import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard, hours } from '@nestjs/throttler';
import { Public } from '@shared/auth';
import { IP_THROTTLER } from '@shared/throttling';
import { createHash } from 'node:crypto';
import { CreateAccessRequestCommand } from '../../application/commands/create-access-request.command';
import { CreateAccessRequestDto } from '../dto/create-access-request.dto';

/** Its own bucket: filling the form must not use up the sign-in allowance. */
function accessRequestBucket(_context: unknown, tracker: string): string {
  return createHash('sha256').update(`access-request:${tracker}`).digest('hex');
}

@ApiTags('Access requests')
@Controller('access-requests')
@UseGuards(ThrottlerGuard)
export class AccessRequestController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({
    [IP_THROTTLER]: {
      limit: 5,
      ttl: hours(1),
      blockDuration: hours(1),
      generateKey: accessRequestBucket,
    },
  })
  @ApiOperation({ summary: 'Ask for access to Chantia from the public showcase' })
  @ApiResponse({ status: 202, description: 'Request received' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async create(@Body() dto: CreateAccessRequestDto): Promise<void> {
    await this.commandBus.execute(new CreateAccessRequestCommand(dto));
  }
}
