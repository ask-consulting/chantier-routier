import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import throttlingConfig from '@config/throttling.config';
import { SkipRateLimit } from './skip-rate-limit.decorator';
import { ThrottlingModule } from './throttling.module';

/**
 * The wiring, end to end.
 *
 * `trackers.spec.ts` pins what the limiter counts; this pins that it counts at
 * all — the guard is reachable, both named limiters are live, `@SkipRateLimit()`
 * really exempts, and the allowance is shared across routes. Each of those is a
 * way the feature could ship looking correct and doing nothing.
 */

const IP_LIMIT = 4;
const IDENTITY_LIMIT = 2;

@Controller('probe')
@UseGuards(ThrottlerGuard)
class ProbeController {
  @Post('login')
  login(@Body() _body: unknown): string {
    return 'ok';
  }

  @Post('other')
  other(@Body() _body: unknown): string {
    return 'ok';
  }

  @Post('exempt')
  @SkipRateLimit()
  exempt(@Body() _body: unknown): string {
    return 'ok';
  }
}

describe('ThrottlingModule', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    process.env.THROTTLE_IP_LIMIT = String(IP_LIMIT);
    process.env.THROTTLE_IDENTITY_LIMIT = String(IDENTITY_LIMIT);
    process.env.TRUSTED_PROXY_HOPS = '0';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [throttlingConfig] }),
        ThrottlingModule,
      ],
      controllers: [ProbeController],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.THROTTLE_IP_LIMIT;
    delete process.env.THROTTLE_IDENTITY_LIMIT;
    delete process.env.TRUSTED_PROXY_HOPS;
  });

  function post(url: string, payload: unknown = {}): Promise<{ statusCode: number }> {
    return app.inject({ method: 'POST', url, payload });
  }

  it('refuses once the address has spent its allowance', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < IP_LIMIT + 1; attempt += 1) {
      statuses.push((await post('/probe/other')).statusCode);
    }

    expect(statuses.slice(0, IP_LIMIT)).toEqual(Array(IP_LIMIT).fill(201));
    expect(statuses.at(-1)).toBe(429);
  });

  it('refuses on the email well before the address limit is reached', async () => {
    const body = { email: 'chef@chantia.fr', password: 'wrong' };

    const statuses: number[] = [];
    for (let attempt = 0; attempt < IDENTITY_LIMIT + 1; attempt += 1) {
      statuses.push((await post('/probe/login', body)).statusCode);
    }

    expect(statuses.slice(0, IDENTITY_LIMIT)).toEqual(Array(IDENTITY_LIMIT).fill(201));
    expect(statuses.at(-1)).toBe(429);
  });

  it('spends one allowance across routes, not one per route', async () => {
    // The regression this guards: the library's default key includes the handler
    // name, so an attacker would get a fresh budget on every endpoint.
    const body = { email: 'chef@chantia.fr', password: 'wrong' };
    for (let attempt = 0; attempt < IDENTITY_LIMIT; attempt += 1) {
      await post('/probe/login', body);
    }

    const { statusCode } = await post('/probe/other', body);

    expect(statusCode).toBe(429);
  });

  it('keeps separate emails on separate allowances', async () => {
    for (let attempt = 0; attempt < IDENTITY_LIMIT; attempt += 1) {
      await post('/probe/login', { email: 'chef@chantia.fr' });
    }

    const { statusCode } = await post('/probe/login', { email: 'autre@chantia.fr' });

    expect(statusCode).toBe(201);
  });

  it('lets an exempt route through past both limits', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < IP_LIMIT + IDENTITY_LIMIT + 2; attempt += 1) {
      statuses.push((await post('/probe/exempt', { email: 'chef@chantia.fr' })).statusCode);
    }

    expect(statuses.every((status) => status === 201)).toBe(true);
  });
});
