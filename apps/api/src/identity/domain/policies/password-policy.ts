/**
 * What counts as an acceptable password.
 *
 * Length only, on purpose: composition rules ("one uppercase, one digit") push
 * users toward `Password1!` while cutting the search space, and every modern
 * guideline (NIST 800-63B, ANSSI) now recommends length over character classes.
 * The minimum itself is configurable — see `IdentityConfig.minPasswordLength`.
 */
export function isPasswordStrongEnough(password: string, minLength: number): boolean {
  return password.normalize('NFKC').length >= minLength;
}
