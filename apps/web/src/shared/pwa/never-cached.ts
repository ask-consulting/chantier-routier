/**
 * Which requests the service worker must never keep — the rule that stops an
 * installed app from leaving an organization's data in a phone's Cache Storage.
 *
 * Its own module, and pure, so it can be tested: the service worker itself
 * runs where no test does, and this is the one decision in it that is a
 * matter of security rather than speed.
 *
 *   - `/api/*` on this origin: the session handlers — the refresh token's
 *     cookie is set and read there;
 *   - every other origin: the Nest API, whose answers are the data itself,
 *     fetched with the user's token.
 *
 * Everything else is the application's own shell — pages, scripts, styles,
 * fonts, icons — the same for every user, and what makes the app open offline.
 */
export function isNeverCached({ sameOrigin, url }: { sameOrigin: boolean; url: URL }): boolean {
  return !sameOrigin || url.pathname.startsWith('/api/');
}
