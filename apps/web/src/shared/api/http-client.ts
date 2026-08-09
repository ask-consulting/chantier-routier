/**
 * The browser's API client.
 *
 * Two destinations, and the split matters:
 *
 *   - `/api/auth/*` — Next's own handlers, which hold the refresh token in an
 *     httpOnly cookie the page cannot read.
 *   - the Nest API — everything else, carrying the short-lived access token.
 *
 * The access token lives in memory only. It dies with the tab, and is rebuilt
 * from the cookie on the next load. Nothing worth stealing survives in
 * `localStorage`.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

/** Set by the session provider. Module-level so every call sees it without prop drilling. */
let accessToken: string | null = null;
/** Lets the client refresh once and retry, instead of bouncing the user to the login page. */
let refreshSession: (() => Promise<string | null>) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setSessionRefresher(refresher: (() => Promise<string | null>) | null): void {
  refreshSession = refresher;
}

export interface FieldError {
  field: string;
  /** An i18n key, e.g. `form.errors.password.minLength`. */
  code: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Present when the API rejected specific fields — all of them at once. */
    readonly fields?: FieldError[],
  ) {
    super(message);
  }
}

async function parse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: FieldError[];
  };

  if (!response.ok) {
    throw new ApiError(response.status, body.message ?? 'Erreur inattendue', body.errors);
  }
  return body as T;
}

/**
 * A call to the Nest API, carrying the access token.
 *
 * On 401 it refreshes **once** and retries. Once, deliberately: if the second
 * attempt also fails the session is genuinely over, and looping would turn an
 * expired session into a burst of requests.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401 && retry && refreshSession) {
    const renewed = await refreshSession();
    if (renewed) {
      return apiFetch<T>(path, init, false);
    }
  }

  return parse<T>(response);
}

/** A call to one of Next's own auth handlers. The cookie travels on its own. */
export async function authFetch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Same origin, but explicit: without the cookie the handler has nothing.
    credentials: 'same-origin',
  });
  return parse<T>(response);
}

/**
 * The envelope every list endpoint answers with.
 *
 * Generic on purpose: this module must not learn the name of a single business
 * resource. `fetchWorksites` used to live here, and that is exactly the drift
 * this layout is meant to stop — transport belongs to `shared`, endpoints belong
 * to the feature that owns them.
 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
