/**
 * Which browser origins may call this API, and why a fixed list cannot cover
 * all of them.
 *
 * Lives here rather than inline in `main.ts` for the same reason
 * `security-headers.ts` does: a policy nobody can import is a policy nobody
 * can test, and every mistake here is silent — an origin that stops being
 * allowed looks exactly like one that never was, from the browser's own
 * console, as an unhelpful "CORS error" with no server-side trace.
 */

/**
 * A preview deployment of *this* Vercel project — `chantier-routier`.
 *
 * Every push to a branch gets its own URL, with a hash Vercel mints per
 * deployment: `chantier-routier-<hash>-aellouzes-projects.vercel.app`. No
 * static list in `CORS_ORIGINS` can enumerate a value that does not exist
 * until the deployment happens, so this is a pattern instead of an entry.
 *
 * Anchored on both ends — the project name *and* the team slug. The project
 * name alone proves nothing: anyone can create a Vercel project called
 * `chantier-routier-whatever` in their own team, and its URLs would start the
 * same way. The team slug is the part only we control, and with
 * `credentials: true` an origin let in here can call the API with the user's
 * cookies. Moving the project to another team means updating this line —
 * previews then fail loudly, which is the safe direction.
 *
 * The hash is a single `[a-z0-9]+` segment, so branch aliases
 * (`chantier-routier-git-<branch>-aellouzes-projects.vercel.app`) are not
 * covered: only per-deployment URLs are.
 */
const VERCEL_PREVIEW = /^https:\/\/chantier-routier-[a-z0-9]+-aellouzes-projects\.vercel\.app$/;

/**
 * Whether a browser's `Origin` header may reach this API.
 *
 * `allowedOrigins` is the exact list — `http://localhost:3000` and whatever
 * `CORS_ORIGINS` names in production, generally the one stable production
 * domain. This function adds the one case that list structurally cannot: a
 * URL that does not exist until Vercel mints it.
 */
export function isAllowedOrigin(origin: string, allowedOrigins: readonly string[]): boolean {
  return allowedOrigins.includes(origin) || VERCEL_PREVIEW.test(origin);
}
