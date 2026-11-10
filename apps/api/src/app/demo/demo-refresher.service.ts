import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEMO_ORGANIZATION_ID } from '@chantia/shared';
import { DemoConfig } from '@config/demo.config';
import { PrismaService } from '@shared/prisma/prisma.service';
import { refreshDemo } from '../../scripts/seed/demo-seeder';

/** Older than this, the demonstration is written again: dates move with the days. */
export const DEMO_MAX_AGE_MS = 20 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 60 * 1000;

/**
 * Keeps the public demonstration fresh: on start-up, then every hour, it writes
 * the « Chantia Démo » organization again when the last time was more than
 * twenty hours ago. A visitor's changes therefore last a day at most.
 *
 * Checked on start-up as well as on a timer because a free Render service
 * sleeps when idle, and a timer does not run while it sleeps.
 *
 * Through `PrismaService`, the client with no tenant filter: the demo is an
 * organization of its own, written on nobody's behalf.
 */
@Injectable()
export class DemoRefresher implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(DemoRefresher.name);
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.getOrThrow<DemoConfig>('demo').enabled) {
      return;
    }
    void this.refreshIfStale();
    this.timer = setInterval(() => void this.refreshIfStale(), CHECK_EVERY_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /** Writes the demonstration again if it is missing or too old. Never throws. */
  refreshIfStale(now = new Date()): Promise<void> {
    this.running ??= this.run(now).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async run(now: Date): Promise<void> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: DEMO_ORGANIZATION_ID },
        select: { updatedAt: true },
      });
      if (organization && now.getTime() - organization.updatedAt.getTime() < DEMO_MAX_AGE_MS) {
        return;
      }
      await refreshDemo(this.prisma, now.toISOString().slice(0, 10));
      this.logger.log('Demonstration written again.');
    } catch (error) {
      // The demo is a convenience: its failure must never take the API down.
      this.logger.error(`Could not refresh the demonstration: ${String(error)}`);
    }
  }
}
