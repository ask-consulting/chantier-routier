import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_ACCOUNT_EMAIL, DEMO_ORGANIZATION_ID } from '@chantia/shared';
import { DemoUnavailableException } from '../../domain/exceptions/identity.exceptions';
import { SessionIssuer } from '../services/session-issuer.service';
import { DemoLoginCommand } from './demo-login.command';
import { DemoLoginHandler } from './demo-login.handler';

const users = { findByEmail: vi.fn() };
const issueFor = vi.fn();
const handler = (enabled: boolean) =>
  new DemoLoginHandler(
    users as never,
    { issueFor } as unknown as SessionIssuer,
    { getOrThrow: () => ({ enabled }) } as unknown as ConfigService,
  );
const account = (over: object = {}) => ({
  id: 'u',
  organizationId: DEMO_ORGANIZATION_ID,
  active: true,
  ...over,
});

beforeEach(() => vi.resetAllMocks());

describe('opening the demonstration', () => {
  it('opens a session on the demo account', async () => {
    users.findByEmail.mockResolvedValue(account());
    issueFor.mockResolvedValue('session');

    await expect(handler(true).execute(new DemoLoginCommand('Safari'))).resolves.toBe('session');
    expect(users.findByEmail).toHaveBeenCalledWith(DEMO_ACCOUNT_EMAIL);
    expect(issueFor).toHaveBeenCalledWith(account(), { userAgent: 'Safari' });
  });

  it('does not exist while the demo is off', async () => {
    await expect(handler(false).execute(new DemoLoginCommand(null))).rejects.toBeInstanceOf(
      DemoUnavailableException,
    );
    expect(users.findByEmail).not.toHaveBeenCalled();
  });

  it('never opens an account outside the demo organization, nor a disabled one', async () => {
    for (const found of [
      null,
      account({ organizationId: 'real-org' }),
      account({ active: false }),
    ]) {
      users.findByEmail.mockResolvedValueOnce(found);
      await expect(handler(true).execute(new DemoLoginCommand(null))).rejects.toBeInstanceOf(
        DemoUnavailableException,
      );
    }
    expect(issueFor).not.toHaveBeenCalled();
  });
});
