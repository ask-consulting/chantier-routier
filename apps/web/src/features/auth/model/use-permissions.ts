'use client';

import { useMemo } from 'react';
import type { Permission } from '@chantia/shared';
import { permissionsForRole } from '@chantia/shared';
import { useSession } from './session-provider';

/**
 * What the signed-in account may do.
 *
 * The answer comes from `ROLE_PERMISSIONS` in `@chantia/shared` — the same table
 * the API guards with. No request is made: the role travels in the session, and
 * the mapping is a constant. That is the point of keeping the matrix shared
 * rather than exposing a `/me/permissions` endpoint.
 *
 * **This is not a security boundary.** Anything hidden here is still reachable by
 * hand; the API refuses it. What this buys is an interface that does not offer
 * buttons that will answer 403.
 */

export function usePermissions(): readonly Permission[] {
  const { user } = useSession();
  return useMemo(() => (user ? permissionsForRole(user.role) : []), [user]);
}

/** True when the account holds this capability. False while signed out. */
export function usePermission(permission: Permission): boolean {
  return usePermissions().includes(permission);
}

/** True only when the account holds **every** capability listed. */
export function useEveryPermission(permissions: readonly Permission[]): boolean {
  const held = usePermissions();
  return permissions.every((permission) => held.includes(permission));
}
