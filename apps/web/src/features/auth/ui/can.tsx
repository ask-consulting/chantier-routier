'use client';

import type { Permission } from '@chantia/shared';
import { useEveryPermission } from '../model/use-permissions';

interface CanProps {
  /** One capability, or several — all of which are required. */
  permission: Permission | readonly Permission[];
  children: React.ReactNode;
  /** Shown instead when the capability is missing. Nothing, by default. */
  fallback?: React.ReactNode;
}

/**
 * Renders its children only for accounts holding the capability.
 *
 * Declarative on purpose: `<Can permission={Permission.WORKSITE_MANAGE}>` reads
 * as the rule it enforces, and the rule stays next to the button it governs
 * rather than in a condition three components up.
 *
 * **All-of, not any-of**, when given a list — the same semantics as
 * `roleHasEveryPermission` on the API side. Two places that answer the same
 * question differently is how an interface starts contradicting its backend.
 *
 * Hiding, not disabling: a disabled button invites a support call about a thing
 * the person will never be allowed to do.
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const permissions = Array.isArray(permission) ? permission : [permission as Permission];
  const allowed = useEveryPermission(permissions);

  return <>{allowed ? children : fallback}</>;
}
