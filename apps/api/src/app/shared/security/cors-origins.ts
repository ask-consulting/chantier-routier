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
 * Two shapes between the anchors, because Vercel mints two URLs per preview:
 *
 *   - per deployment — `chantier-routier-<hash>-…`, a single `[a-z0-9]+`;
 *   - per branch — `chantier-routier-git-<branch>-…`, the one people share,
 *     since it stays the same across pushes. The branch slug carries hyphens
 *     (`feat-worksite-crud`), hence `git-[a-z0-9-]+`.
 *
 * **What this rests on, and is not verified:** that nobody outside the team
 * can obtain a `*-aellouzes-projects.vercel.app` hostname. A Vercel project
 * gets `<project-name>.vercel.app` by default, so a project *named*
 * `chantier-routier-x-aellouzes-projects` in another team would match —
 * unless Vercel reserves hostnames ending in a team slug. Both shapes share
 * that assumption. The way to stop depending on it is a preview domain we
 * own (Vercel's custom preview deployment suffix), allowed here instead.
 */
const VERCEL_PREVIEW =
  /^https:\/\/chantier-routier-(?:[a-z0-9]+|git-[a-z0-9-]+)-aellouzes-projects\.vercel\.app$/;

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
