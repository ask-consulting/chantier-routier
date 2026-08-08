'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui';
import { useSession } from './session-provider';

/**
 * Keeps a page for signed-in callers.
 *
 * Client-side on purpose: the refresh token is httpOnly, so a Next middleware
 * could see *that* a cookie exists but not whether the API still honours it. A
 * redirect based on the cookie's mere presence would send people to a page that
 * immediately bounces them back. Here the decision is taken once the session has
 * actually been rebuilt.
 *
 * This is not a security boundary — the API is. It is a courtesy: it stops an
 * empty screen and a burst of 401s.
 */
export function RequireSession({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    // Skeletons rather than a spinner: the page keeps its final shape, so
    // nothing jumps when the session lands.
    return (
      <div className="flex flex-col gap-2" aria-busy>
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  return <>{children}</>;
}
