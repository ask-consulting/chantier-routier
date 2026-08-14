import type { IAuthSession } from '@chantia/shared';

/**
 * Calls to the API made from Next's server, for the `/api/auth` handlers.
 *
 * Separate from the browser client: this one never carries a bearer token, and
 * it is the only place that ever sees a refresh token.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

/** Thirty days, matching `JWT_REFRESH_TTL`. Kept as the cookie's own lifetime. */
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export interface ApiError {
  message: string;
  /** Field-level failures, e.g. every unmet password rule at once. */
  errors?: { field: string; code: string; message: string }[];
  statusCode: number;
}

export class ApiCallError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError,
  ) {
    super(body.message);
  }
}

export async function callApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    // Auth calls must never be served from a cache.
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    const error = body as ApiError;
    throw new ApiCallError(response.status, {
      message: error.message ?? 'Erreur inattendue',
      errors: error.errors,
      statusCode: response.status,
    });
  }

  return body as T;
}

export type AuthSession = IAuthSession;
