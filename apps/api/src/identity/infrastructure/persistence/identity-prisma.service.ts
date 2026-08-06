import { Inject, Injectable } from '@nestjs/common';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';

/**
 * Only the delegates the identity context owns — no worksites, no workers.
 * Typed as a `Pick`, so reaching across the boundary is a compile error rather
 * than a code-review catch.
 *
 * Derived from the *extended* client: its delegates are a distinct type from the
 * plain `Prisma.TransactionClient`, and taking them from the source keeps the
 * tenant filter visible in the types instead of quietly cast away.
 */
export type IdentityTransactionClient = Pick<
  TenantPrismaClient,
  'organization' | 'user' | 'refreshToken'
>;

/**
 * Narrow database facade for the identity context.
 *
 * Today it wraps the shared client, but it exposes strictly the three identity
 * tables. That keeps the extraction mechanical: point this class at its own
 * client and the repositories above it do not change.
 *
 * It uses the tenant-filtered client like everything else — `app_user` carries
 * an `organizationId`, so listing or updating accounts is automatically confined
 * to the caller's organization. Login, register and refresh run without an
 * access token and are therefore un-scoped by the same rule, which is exactly
 * what they need: they look an account up before any tenant is known.
 */
@Injectable()
export class IdentityPrismaService {
  constructor(
    @Inject(TENANT_PRISMA)
    private readonly prisma: TenantPrismaClient,
  ) {}

  get organization(): TenantPrismaClient['organization'] {
    return this.prisma.organization;
  }

  get user(): TenantPrismaClient['user'] {
    return this.prisma.user;
  }

  get refreshToken(): TenantPrismaClient['refreshToken'] {
    return this.prisma.refreshToken;
  }

  transaction<T>(handler: (tx: IdentityTransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => handler(tx));
  }
}
