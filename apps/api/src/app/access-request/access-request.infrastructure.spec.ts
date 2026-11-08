import { AccessRequestKind, AccessRequestLocale } from '@chantia/shared';
import { CommandBus } from '@nestjs/cqrs';
import { THROTTLER_LIMIT, THROTTLER_KEY_GENERATOR } from '@nestjs/throttler/dist/throttler.constants';
import { PrismaService } from '@shared/prisma/prisma.service';
import { IP_THROTTLER } from '@shared/throttling';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateAccessRequestCommand } from './application/commands/create-access-request.command';
import accessRequestConfig from './config/access-request.config';
import { AccessRequest } from './domain/entities/access-request.entity';
import { AccessRequestRepository } from './infrastructure/repositories/access-request.repository';
import { AccessRequestController } from './presentation/controllers/access-request.controller';

const CREATED_AT = new Date('2026-11-08T10:00:00Z');
const REQUEST = AccessRequest.create({
  id: 'request-1',
  company: 'Société',
  phone: '+216 71 000 000',
  kind: AccessRequestKind.OTHER,
  locale: AccessRequestLocale.FR,
});

describe('AccessRequestRepository', () => {
  const accessRequest = {
    create: vi.fn(async ({ data }) => ({ ...data, createdAt: CREATED_AT })),
    count: vi.fn(async () => 7),
  };
  const repository = new AccessRequestRepository({ accessRequest } as unknown as PrismaService);

  it('stores the request and reads back its date', async () => {
    const saved = await repository.save(REQUEST);

    expect(accessRequest.create.mock.calls[0][0].data).toEqual({
      id: 'request-1',
      company: 'Société',
      phone: '+216 71 000 000',
      kind: 'other',
      locale: 'fr',
    });
    expect(saved.createdAt).toEqual(CREATED_AT);
  });

  it('counts from the date it is given', async () => {
    await expect(repository.countSince(CREATED_AT)).resolves.toBe(7);
    expect(accessRequest.count).toHaveBeenCalledWith({
      where: { createdAt: { gte: CREATED_AT } },
    });
  });
});

describe('AccessRequestController', () => {
  const create = AccessRequestController.prototype.create;

  it('hands the request to the command bus', async () => {
    const execute = vi.fn(async () => undefined);
    const controller = new AccessRequestController({ execute } as unknown as CommandBus);
    const dto = {
      company: 'A',
      phone: '+216 71 000 000',
      kind: AccessRequestKind.OTHER,
      locale: AccessRequestLocale.FR,
    };

    await controller.create(dto);

    expect(execute).toHaveBeenCalledWith(new CreateAccessRequestCommand(dto));
  });

  it('allows five attempts, far fewer than the sign-in routes', () => {
    expect(Reflect.getMetadata(THROTTLER_LIMIT + IP_THROTTLER, create)).toBe(5);
  });

  it('counts the form apart from sign-in, without keeping the address in clear', () => {
    const key: (context: unknown, tracker: string) => string = Reflect.getMetadata(
      THROTTLER_KEY_GENERATOR + IP_THROTTLER,
      create,
    );

    expect(key(null, '1.2.3.4')).toMatch(/^[0-9a-f]{64}$/);
    expect(key(null, '1.2.3.4')).not.toBe(key(null, '1.2.3.5'));
  });
});

describe('accessRequestConfig', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('defaults to the public contact address and a modest limit', () => {
    vi.stubEnv('ACCESS_REQUEST_NOTIFY_EMAIL', undefined as unknown as string);
    vi.stubEnv('ACCESS_REQUEST_DAILY_EMAIL_LIMIT', 'nonsense');

    expect(accessRequestConfig()).toEqual({
      notifyEmail: 'contact@chantia.tn',
      dailyEmailLimit: 50,
    });
  });

  it('reads both from the environment', () => {
    vi.stubEnv('ACCESS_REQUEST_NOTIFY_EMAIL', 'sales@chantia.tn');
    vi.stubEnv('ACCESS_REQUEST_DAILY_EMAIL_LIMIT', '10');

    expect(accessRequestConfig()).toEqual({ notifyEmail: 'sales@chantia.tn', dailyEmailLimit: 10 });
  });
});
