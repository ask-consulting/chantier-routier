import { describe, expect, it } from 'vitest';
import { TenantContext } from '../tenant/tenant-context';
import { TENANT_SCOPED_MODELS } from './tenant.extension';

describe('TENANT_SCOPED_MODELS', () => {
  it('is derived from the schema, not hand-written', () => {
    // Carry `organizationId` — filtered automatically.
    expect(TENANT_SCOPED_MODELS.has('Worksite')).toBe(true);
    expect(TENANT_SCOPED_MODELS.has('Worker')).toBe(true);
    expect(TENANT_SCOPED_MODELS.has('User')).toBe(true);

    // No such column: reached through a filtered parent, by schema design.
    expect(TENANT_SCOPED_MODELS.has('Timesheet')).toBe(false);
    expect(TENANT_SCOPED_MODELS.has('Expense')).toBe(false);
    expect(TENANT_SCOPED_MODELS.has('RefreshToken')).toBe(false);

    // The tenant itself.
    expect(TENANT_SCOPED_MODELS.has('Organization')).toBe(false);
  });
});

describe('TenantContext', () => {
  it('has no tenant outside a request', () => {
    expect(new TenantContext().current()).toBeNull();
  });

  it('reports null until the guard sets one — login and register run here', () => {
    const context = new TenantContext();
    context.run(() => {
      expect(context.current()).toBeNull();
    });
  });

  it('exposes the tenant the guard published', () => {
    const context = new TenantContext();
    context.run(() => {
      context.set('org-1');
      expect(context.current()).toBe('org-1');
    });
  });

  it('keeps the tenant across async boundaries', async () => {
    const context = new TenantContext();
    await context.run(async () => {
      context.set('org-1');
      await new Promise((resolve) => setImmediate(resolve));
      expect(context.current()).toBe('org-1');
    });
  });

  it('isolates concurrent requests from one another', async () => {
    const context = new TenantContext();
    const seen: string[] = [];

    const request = (id: string, delay: number): Promise<void> =>
      context.run(async () => {
        context.set(id);
        await new Promise((resolve) => setTimeout(resolve, delay));
        seen.push(context.current() ?? 'none');
      });

    // The slower request must not pick up the faster one's tenant.
    await Promise.all([request('org-a', 20), request('org-b', 5)]);
    expect(seen.sort()).toEqual(['org-a', 'org-b']);
  });

  it('suspends the filter inside runUnscoped, and restores it after', () => {
    const context = new TenantContext();
    context.run(() => {
      context.set('org-1');
      context.runUnscoped(() => {
        expect(context.current()).toBeNull();
      });
      expect(context.current()).toBe('org-1');
    });
  });

  it('keeps runUnscoped suspended for the whole of an async block', async () => {
    const context = new TenantContext();
    await context.run(async () => {
      context.set('org-1');
      await context.runUnscoped(async () => {
        await new Promise((resolve) => setImmediate(resolve));
        // Would already be back to 'org-1' if the restore used a `finally`.
        expect(context.current()).toBeNull();
      });
      expect(context.current()).toBe('org-1');
    });
  });
});

describe('TenantContext.disable / enable', () => {
  it('suspends and resumes the filter imperatively', () => {
    const context = new TenantContext();
    context.run(() => {
      context.set('org-1');
      expect(context.isEnabled()).toBe(true);

      context.disable();
      expect(context.current()).toBeNull();
      expect(context.isEnabled()).toBe(false);

      context.enable();
      expect(context.current()).toBe('org-1');
      expect(context.isEnabled()).toBe(true);
    });
  });

  it('stays suspended across async boundaries until enable()', async () => {
    const context = new TenantContext();
    await context.run(async () => {
      context.set('org-1');
      context.disable();
      await new Promise((resolve) => setImmediate(resolve));
      expect(context.current()).toBeNull();
      context.enable();
      expect(context.current()).toBe('org-1');
    });
  });

  it('does not leak a forgotten disable() into another request', async () => {
    const context = new TenantContext();

    // First request disables and never re-enables.
    await context.run(async () => {
      context.set('org-1');
      context.disable();
      await new Promise((resolve) => setImmediate(resolve));
    });

    // The next request gets a fresh store, so the filter is back on.
    context.run(() => {
      context.set('org-2');
      expect(context.current()).toBe('org-2');
    });
  });

  it('is a no-op outside a request, where nothing is scoped anyway', () => {
    const context = new TenantContext();
    context.disable();
    context.enable();
    expect(context.current()).toBeNull();
  });
});
