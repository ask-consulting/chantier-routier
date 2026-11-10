import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@shared/prisma/prisma.service';
import { refreshDemo } from '../../scripts/seed/demo-seeder';
import { DEMO_MAX_AGE_MS, DemoRefresher } from './demo-refresher.service';

vi.mock('../../scripts/seed/demo-seeder', () => ({ refreshDemo: vi.fn() }));

const NOW = new Date('2026-11-10T08:00:00Z');
const findUnique = vi.fn();
const prisma = { organization: { findUnique } } as unknown as PrismaService;
const config = (enabled: boolean) =>
  ({ getOrThrow: () => ({ enabled }) }) as unknown as ConfigService;

beforeEach(() => vi.mocked(refreshDemo).mockReset());
afterEach(() => vi.useRealTimers());

describe('DemoRefresher', () => {
  it('writes the demonstration when it does not exist yet, dated today', async () => {
    findUnique.mockResolvedValue(null);

    await new DemoRefresher(prisma, config(true)).refreshIfStale(NOW);

    expect(refreshDemo).toHaveBeenCalledWith(prisma, '2026-11-10');
  });

  it('writes it again once it is older than its limit, not before', async () => {
    const refresher = new DemoRefresher(prisma, config(true));
    findUnique.mockResolvedValueOnce({
      updatedAt: new Date(NOW.getTime() - DEMO_MAX_AGE_MS + 1000),
    });
    await refresher.refreshIfStale(NOW);
    expect(refreshDemo).not.toHaveBeenCalled();

    findUnique.mockResolvedValueOnce({
      updatedAt: new Date(NOW.getTime() - DEMO_MAX_AGE_MS - 1000),
    });
    await refresher.refreshIfStale(NOW);
    expect(refreshDemo).toHaveBeenCalledOnce();
  });

  it('never runs twice at once', async () => {
    findUnique.mockResolvedValue(null);
    const refresher = new DemoRefresher(prisma, config(true));

    await Promise.all([refresher.refreshIfStale(NOW), refresher.refreshIfStale(NOW)]);

    expect(refreshDemo).toHaveBeenCalledOnce();
  });

  it('survives a failure: the demo must never take the API down', async () => {
    findUnique.mockRejectedValue(new Error('database down'));

    await expect(
      new DemoRefresher(prisma, config(true)).refreshIfStale(NOW),
    ).resolves.toBeUndefined();
  });

  it('does nothing at all when the demo is off', () => {
    const refresher = new DemoRefresher(prisma, config(false));
    const spy = vi.spyOn(refresher, 'refreshIfStale');

    refresher.onApplicationBootstrap();
    refresher.onApplicationShutdown();

    expect(spy).not.toHaveBeenCalled();
  });

  it('checks on start-up, then every hour, until shut down', () => {
    vi.useFakeTimers();
    findUnique.mockResolvedValue({ updatedAt: NOW });
    const refresher = new DemoRefresher(prisma, config(true));
    const spy = vi.spyOn(refresher, 'refreshIfStale').mockResolvedValue();

    refresher.onApplicationBootstrap();
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    refresher.onApplicationShutdown();
    vi.advanceTimersByTime(5 * 60 * 60 * 1000);

    expect(spy).toHaveBeenCalledTimes(3);
  });
});
