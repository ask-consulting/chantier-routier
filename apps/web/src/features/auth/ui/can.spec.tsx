import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Permission, UserRole } from '@chantia/shared';
import { Can } from './can';

/**
 * `Can` and the permission hooks under it — mocked in every screen's tests,
 * so pinned here once against the real role matrix. The rule worth the most:
 * several permissions means **all** of them, which is what keeps a manager
 * without `budget:manage` from the fleet's write buttons.
 */

let session: { user: { role: UserRole } | null } = { user: null };
vi.mock('../model/session-provider', () => ({
  useSession: () => session,
}));

afterEach(() => {
  cleanup();
  session = { user: null };
});

function signedInAs(role: UserRole): void {
  session = { user: { role } };
}

describe('Can', () => {
  it('shows its children to a role holding the permission', () => {
    signedInAs(UserRole.SITE_MANAGER);
    render(<Can permission={Permission.CLIENT_MANAGE}>edit</Can>);

    expect(screen.getByText('edit')).toBeTruthy();
  });

  it('hides them from a role without it, or shows the fallback', () => {
    signedInAs(UserRole.FOREMAN);
    render(
      <Can permission={Permission.CLIENT_MANAGE} fallback="read only">
        edit
      </Can>,
    );

    expect(screen.queryByText('edit')).toBeNull();
    expect(screen.getByText('read only')).toBeTruthy();
  });

  it('requires every permission of a list', () => {
    signedInAs(UserRole.FOREMAN);
    render(
      <>
        <Can permission={[Permission.EQUIPMENT_READ, Permission.BUDGET_READ]}>money</Can>
        <Can permission={[Permission.EQUIPMENT_READ, Permission.WORKSITE_READ]}>fleet</Can>
      </>,
    );

    expect(screen.queryByText('money')).toBeNull();
    expect(screen.getByText('fleet')).toBeTruthy();
  });

  it('shows nothing to nobody', () => {
    render(<Can permission={Permission.WORKSITE_READ}>anything</Can>);

    expect(screen.queryByText('anything')).toBeNull();
  });
});
