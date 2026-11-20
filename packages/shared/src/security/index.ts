/**
 * `@chantia/shared/security`: the password policy, apart from the main entry.
 *
 * It carries a blocklist of 10,000 common passwords (~85 KB). Exported from
 * the main entry, it went into every page of the web front, which never checks
 * a password itself — the API does, and answers with the rules broken.
 */
export * from './password-policy';
