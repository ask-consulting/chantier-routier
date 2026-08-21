import helmet from '@fastify/helmet';
import { Controller, Get } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { AppConfig } from '@config/app.config';
import appConfigFactory from '@config/app.config';
import { securityHeaderOptions } from './security-headers';

/**
 * Every failure mode here is silent. A header that stops being sent, a policy
 * that quietly relaxes, Swagger coming back in production — none of them break a
 * request, so none of them show up anywhere but here.
 */

@Controller('probe')
class ProbeController {
  @Get()
  get(): string {
    return 'ok';
  }
}

async function headersFor(swaggerEnabled: boolean): Promise<Record<string, string>> {
  const moduleRef = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

  const config = { port: 8080, env: 'test', corsOrigins: [], swaggerEnabled } satisfies AppConfig;
  await app.register(helmet, securityHeaderOptions(config));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  try {
    const response = await app.inject({ method: 'GET', url: '/probe' });
    expect(response.statusCode).toBe(200);
    return response.headers as Record<string, string>;
  } finally {
    await app.close();
  }
}

describe('securityHeaderOptions', () => {
  describe('whatever the environment', () => {
    it('pins the transport, so a first plain-HTTP request is a one-time window and not a habit', async () => {
      for (const swaggerEnabled of [true, false]) {
        const headers = await headersFor(swaggerEnabled);
        expect(headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
        // `preload` is a submission to a browser-shipped list; it is not made by accident.
        expect(headers['strict-transport-security']).not.toContain('preload');
      }
    });

    it('refuses content-type sniffing and framing', async () => {
      for (const swaggerEnabled of [true, false]) {
        const headers = await headersFor(swaggerEnabled);
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['x-frame-options']).toBe('DENY');
        expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
      }
    });

    it('never leaks the path — an API path names a worksite or a user', async () => {
      for (const swaggerEnabled of [true, false]) {
        const headers = await headersFor(swaggerEnabled);
        expect(headers['referrer-policy']).toBe('no-referrer');
      }
    });
  });

  describe('without Swagger — the production shape', () => {
    it('allows nothing at all: a JSON response never loads anything', async () => {
      const csp = (await headersFor(false))['content-security-policy'] ?? '';

      expect(csp).toContain("default-src 'none'");
      // The relaxations the Swagger page needs must not be present here.
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'self'");
    });
  });

  describe('with Swagger — the development shape', () => {
    it('gives the UI back exactly what the served page needs, and nothing more', async () => {
      const csp = (await headersFor(true))['content-security-policy'] ?? '';

      // Its three bundles are same-origin files, so scripts stay at 'self' —
      // if a future Swagger inlines one, this is where we find out.
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
      // Its styles are inline, and only its styles.
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });
  });
});

describe('swaggerEnabled', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('is off in production — the whole API surface is not published for free', () => {
    process.env.NODE_ENV = 'production';
    expect(appConfigFactory().swaggerEnabled).toBe(false);
  });

  it('is on everywhere else', () => {
    for (const env of ['development', 'test', undefined]) {
      if (env === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = env;

      expect(appConfigFactory().swaggerEnabled).toBe(true);
    }
  });
});
