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

import axios, { type InternalAxiosRequestConfig } from 'axios';

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

/** Marks a request that already went through one refresh-and-retry cycle. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

/**
 * The Nest API instance.
 *
 * No default `Content-Type`: axios only sets it when `data` is a plain object,
 * which is exactly the behaviour Fastify needs. It refuses a request that
 * announces JSON and carries nothing — `400 Body cannot be empty when
 * content-type is set to 'application/json'`. Both invitation actions answered
 * 400 in production while the list beside them worked, because a hand-set
 * header went out on every request, body or no body.
 */
export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  // Axios defaults every POST/PUT/PATCH to `application/x-www-form-urlencoded`
  // when nothing else claims the header first — data or not. Fastify rejects
  // exactly that combination when there is no body, so a request with no
  // `data` explicitly claims the header itself, the same way axios' own XHR
  // adapter does in a real browser.
  if (config.data === undefined && !config.headers.has('Content-Type')) {
    config.headers.setContentType(null);
  }
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

/**
 * On 401 it refreshes **once** and retries. Once, deliberately: if the second
 * attempt also fails the session is genuinely over, and looping would turn an
 * expired session into a burst of requests.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(toApiError(error));
    }

    const original = error.config as RetriableConfig | undefined;
    if (!refreshSession || !original || original._retried) {
      return Promise.reject(toApiError(error));
    }

    const renewed = await refreshSession();
    if (!renewed) {
      return Promise.reject(toApiError(error));
    }

    original._retried = true;
    return apiClient(original);
  },
);

function toApiError(error: unknown): unknown {
  if (axios.isAxiosError(error) && error.response) {
    const body = error.response.data as { message?: string; errors?: FieldError[] } | undefined;
    return new ApiError(error.response.status, body?.message ?? 'Erreur inattendue', body?.errors);
  }
  // No response at all — a network failure, not an API answer. Nothing useful
  // to translate; let the caller see what actually happened.
  return error;
}

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  headers?: Record<string, string>;
}

/** A call to the Nest API, carrying the access token. */
export async function apiFetch<T>(path: string, config: ApiRequestConfig = {}): Promise<T> {
  const response = await apiClient.request<T>({
    url: path,
    method: config.method ?? 'GET',
    data: config.data,
    headers: config.headers,
  });
  return response.data;
}

/**
 * Next's own auth handlers. The cookie travels on its own — same origin, but
 * `withCredentials` keeps that explicit rather than relying on the default.
 */
export const authClient = axios.create({ baseURL: '/api/auth', withCredentials: true });

authClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);

/** A call to one of Next's own auth handlers. */
export async function authFetch<T>(path: string, body?: unknown): Promise<T> {
  const response = await authClient.request<T>({
    url: path,
    method: 'POST',
    data: body,
    // Always announced, unlike `apiFetch`: these are our own Next route
    // handlers, not Fastify, and they don't reject an empty JSON body.
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
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
