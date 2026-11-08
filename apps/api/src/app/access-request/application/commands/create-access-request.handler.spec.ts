import { AccessRequestKind, AccessRequestLocale } from '@chantia/shared';
import { ConfigService } from '@nestjs/config';
import { SendNotificationHandler } from '@notification/application/commands/send-notification.handler';
import { NotificationSubject } from '@notification/domain/notification.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessRequest } from '../../domain/entities/access-request.entity';
import { AccessRequestRepositoryPort } from '../../domain/ports/access-request-repository.port';
import { CreateAccessRequestCommand } from './create-access-request.command';
import { CreateAccessRequestHandler } from './create-access-request.handler';

const DATA = {
  company: '  Société Exemple ',
  phone: ' +216 71 000 000',
  kind: AccessRequestKind.ROADS,
  locale: AccessRequestLocale.LATIN,
};

function setup(alreadyToday = 1) {
  const saved: AccessRequest[] = [];
  const repository: AccessRequestRepositoryPort = {
    save: async (request) => {
      saved.push(request);
      return request;
    },
    countSince: vi.fn(async () => alreadyToday),
  };
  const executeDetached = vi.fn();
  const handler = new CreateAccessRequestHandler(
    repository,
    { executeDetached } as unknown as SendNotificationHandler,
    {
      getOrThrow: () => ({ notifyEmail: 'contact@chantia.tn', dailyEmailLimit: 2 }),
    } as unknown as ConfigService,
  );
  return { handler, saved, executeDetached, repository };
}

describe('CreateAccessRequestHandler', () => {
  let h: ReturnType<typeof setup>;
  beforeEach(() => {
    h = setup();
  });

  it('stores the request, tidied', async () => {
    await h.handler.execute(new CreateAccessRequestCommand(DATA));

    expect(h.saved).toHaveLength(1);
    expect(h.saved[0]).toMatchObject({ company: 'Société Exemple', phone: '+216 71 000 000' });
  });

  it('announces it to the team, in words', async () => {
    await h.handler.execute(new CreateAccessRequestCommand(DATA));

    const [command] = h.executeDetached.mock.calls[0];
    expect(command.subject).toBe(NotificationSubject.ACCESS_REQUEST);
    expect(command.recipient).toEqual({ email: 'contact@chantia.tn' });
    expect(command.data).toEqual({
      company: 'Société Exemple',
      phone: '+216 71 000 000',
      kind: 'Routes',
      locale: 'la',
    });
  });

  it('quietly ignores a bot that filled the hidden field', async () => {
    await expect(
      h.handler.execute(new CreateAccessRequestCommand({ ...DATA, website: 'http://spam.test' })),
    ).resolves.toBeUndefined();

    expect(h.saved).toHaveLength(0);
    expect(h.executeDetached).not.toHaveBeenCalled();
  });

  it('still announces at the daily limit', async () => {
    const atLimit = setup(2);

    await atLimit.handler.execute(new CreateAccessRequestCommand(DATA));

    expect(atLimit.executeDetached).toHaveBeenCalledOnce();
  });

  it('keeps the request but stops announcing past the daily limit', async () => {
    const flooded = setup(3);

    await flooded.handler.execute(new CreateAccessRequestCommand(DATA));

    expect(flooded.saved).toHaveLength(1);
    expect(flooded.executeDetached).not.toHaveBeenCalled();
  });
});
