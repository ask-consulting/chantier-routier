'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { IUser, Permission } from '@chantia/shared';
import { permissionsForRole } from '@chantia/shared';
import { ApiError, authFetch, setAccessToken, setSessionRefresher } from '@/lib/api';

interface SessionResponse {
  accessToken: string;
  expiresIn: number;
  user: IUser;
}

interface SessionContextValue {
  user: IUser | null;
  /** False only while the first refresh is in flight, on page load. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  acceptInvitation: (token: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** What this account may do, from the shared role matrix. */
  can: (permission: Permission) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Holds the session for the whole application.
 *
 * The access token never leaves this module's memory: it is handed to the API
 * client and kept nowhere else. It dies with the tab, and the first thing this
 * provider does on mount is ask Next to rebuild one from the httpOnly cookie.
 *
 * That initial round-trip is why `loading` exists — without it every guarded
 * page would flash its empty state before the session arrives.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  /** Deduplicates concurrent refreshes: five parallel 401s must renew once. */
  const inFlight = useRef<Promise<string | null> | null>(null);

  const apply = useCallback((session: SessionResponse | null) => {
    setAccessToken(session?.accessToken ?? null);
    setUser(session?.user ?? null);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (inFlight.current) {
      return inFlight.current;
    }
    inFlight.current = authFetch<SessionResponse>('refresh')
      .then((session) => {
        apply(session);
        return session.accessToken;
      })
      .catch(() => {
        apply(null);
        return null;
      })
      .finally(() => {
        inFlight.current = null;
      });
    return inFlight.current;
  }, [apply]);

  // Rebuild the session on load, then keep it alive. The access token lasts five
  // minutes; renewing a minute early means a call is never made with a token
  // that expires mid-flight.
  useEffect(() => {
    setSessionRefresher(refresh);
    void refresh().finally(() => setLoading(false));

    const timer = setInterval(() => void refresh(), 4 * 60 * 1000);
    return () => {
      clearInterval(timer);
      setSessionRefresher(null);
    };
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      apply(await authFetch<SessionResponse>('login', { email, password }));
      // The server also set the language cookie from the profile; a reload is
      // what makes the next render pick it up.
      window.location.assign('/worksites');
    },
    [apply],
  );

  const acceptInvitation = useCallback(
    async (token: string, password: string) => {
      apply(await authFetch<SessionResponse>('accept-invitation', { token, password }));
      window.location.assign('/worksites');
    },
    [apply],
  );

  const signOut = useCallback(async () => {
    await authFetch('logout').catch(() => undefined);
    apply(null);
    window.location.assign('/login');
  }, [apply]);

  const can = useCallback(
    (permission: Permission) =>
      user ? permissionsForRole(user.role).includes(permission) : false,
    [user],
  );

  return (
    <SessionContext.Provider
      value={{ user, loading, signIn, acceptInvitation, signOut, can }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return context;
}

export { ApiError };
