import type { FastifyHelmetOptions } from '@fastify/helmet';
import { AppConfig } from '@config/app.config';

/**
 * The response headers that protect a browser from this service.
 *
 * Lives here rather than inline in `main.ts` for one reason: a policy nobody can
 * import is a policy nobody can test, and every mistake this file can make is
 * silent — a header that stops being sent looks exactly like one that never was.
 * `security-headers.spec.ts` pins the result.
 *
 * The shape of the policy turns on a single fact: almost every header below
 * protects HTML, and this service serves exactly one HTML page — Swagger, in
 * development only (see `app.config.ts`). Two of them protect everything:
 * `Strict-Transport-Security` and `X-Content-Type-Options`.
 */
export function securityHeaderOptions(appConfig: AppConfig): FastifyHelmetOptions {
  return {
    contentSecurityPolicy: {
      // No merge with helmet's defaults: a policy you cannot read in full is a
      // policy you cannot reason about.
      useDefaults: false,
      directives: appConfig.swaggerEnabled
        ? {
            // Swagger UI ships three same-origin bundles and no inline script;
            // its styles, however, are two inline <style> blocks, which is the
            // one thing 'self' alone would drop. Checked against the page the
            // server actually returns, not assumed from the library's reputation.
            'default-src': ["'self'"],
            'script-src': ["'self'"],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:'],
            'font-src': ["'self'"],
            'connect-src': ["'self'"],
            'object-src': ["'none'"],
            'base-uri': ["'none'"],
            'form-action': ["'none'"],
            'frame-ancestors': ["'none'"],
          }
        : {
            // JSON only. Nothing in a response is ever meant to load anything,
            // so the honest policy is to allow nothing at all.
            'default-src': ["'none'"],
            'base-uri': ["'none'"],
            'form-action': ["'none'"],
            'frame-ancestors': ["'none'"],
          },
    },
    // A year, and no `preload`: preloading is a submission to a browser-shipped
    // list that is slow and awkward to leave. Worth doing deliberately one day,
    // not as a side effect of adding headers.
    strictTransportSecurity: {
      maxAge: 31_536_000,
      includeSubDomains: true,
      preload: false,
    },
    // `frame-ancestors` above covers current browsers; this covers the rest.
    xFrameOptions: { action: 'deny' },
    xContentTypeOptions: true,
    // An API path can name a worksite or a user id. Never send it onward.
    referrerPolicy: { policy: 'no-referrer' },
    // Blocks embedding this resource cross-origin. It does not touch the web
    // front: CORP is only enforced on `no-cors` requests, and the front calls
    // the API in CORS mode — Authorization header, origin allow-list in `main.ts`.
    crossOriginResourcePolicy: { policy: 'same-origin' },
    // Cross-origin isolation buys us nothing (no SharedArrayBuffer, no precise
    // timers) and would make every cross-origin subresource opt in.
    crossOriginEmbedderPolicy: false,
  };
}
