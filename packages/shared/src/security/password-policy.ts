import { COMMON_PASSWORDS } from './common-passwords';

/** Default floor when no configuration says otherwise. */
export const DEFAULT_MIN_PASSWORD_LENGTH = 10;

/**
 * The rules a password must satisfy. The value doubles as the suffix of the
 * client-facing error code (`form.errors.password.<rule>`), so the web and mobile
 * forms can translate each failure without a mapping table of their own.
 */
export enum PasswordRule {
  MIN_LENGTH = 'minLength',
  UPPERCASE = 'uppercase',
  LOWERCASE = 'lowercase',
  DIGIT = 'digit',
  SPECIAL = 'special',
  /** Built on one of the 10 000 most-used passwords. */
  COMMON = 'common',
  /** Contains the account's own email, name, or the organisation's. */
  CONTEXTUAL = 'contextual',
}

export interface PasswordPolicyOptions {
  minLength?: number;
  /**
   * Words the password must not be built around — the user's email, first and
   * last name, the organisation name. Terms shorter than 4 characters are
   * ignored, as they would reject far more good passwords than bad.
   */
  forbiddenTerms?: readonly (string | null | undefined)[];
}

// Unicode-aware: an accented capital counts as an uppercase letter, and any
// punctuation or symbol counts as special — not just the ASCII shortlist.
const HAS_UPPERCASE = /\p{Lu}/u;
const HAS_LOWERCASE = /\p{Ll}/u;
const HAS_DIGIT = /\p{Nd}/u;
/**
 * Special = printable, not a letter, not a digit, not whitespace.
 * Whitespace is excluded on purpose: counting a space would let any passphrase
 * satisfy the rule for free, which is not what the rule is asking for.
 */
const HAS_SPECIAL = /[^\p{L}\p{Nd}\s]/u;

/** Substitutions that fool a literal comparison but not a human reader. */
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '!': 'i',
};

const MIN_TERM_LENGTH = 4;

/** Lower-cases and strips accents. Leet-folding is deliberately NOT done here. */
function plain(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Undoes leet-speak, so `p@ssw0rd` reads `password`. */
function unleet(value: string): string {
  return value.replace(/[013457@$!]/g, (char) => LEET[char] ?? char);
}

/**
 * The core, with the ends trimmed: `password1!` becomes `password`.
 *
 * Only the ends, never the middle — appending a digit and a symbol is exactly
 * how a weak password is dressed up to satisfy composition rules, and it must
 * not be enough to escape the blocklist.
 */
function root(value: string): string {
  return value.replace(/^[^a-z]+/, '').replace(/[^a-z]+$/, '');
}

/**
 * The forms of a password worth looking up in the blocklist.
 *
 * Trimming runs *before* leet-folding, and both orders are kept: folding first
 * would turn the `1` of `password1!` into an `i`, making the trailing digits
 * un-trimmable and the stem unrecognisable.
 */
function blocklistCandidates(normalized: string): string[] {
  const lowered = plain(normalized);
  const stem = root(lowered);
  return [lowered, stem, unleet(lowered), unleet(stem), root(unleet(lowered))];
}

/**
 * Returns the rules this password fails — empty means it is acceptable.
 *
 * Composition rules (one uppercase, one lowercase, one digit, one special) are a
 * product decision. On their own they are weak: they nudge people toward
 * `Password1!`, which satisfies all four. They are therefore paired with a length
 * floor, a blocklist of the most-used passwords, and a check against the
 * account's own words — the three things that actually reject the passwords
 * people really pick.
 *
 * Known limitation: a password written entirely in a caseless script (Arabic,
 * Chinese, Hebrew) can never satisfy the uppercase and lowercase rules. It only
 * bites someone who types their password in that script — rare, but real.
 */
export function checkPasswordPolicy(
  password: string,
  options: PasswordPolicyOptions = {},
): PasswordRule[] {
  const { minLength = DEFAULT_MIN_PASSWORD_LENGTH, forbiddenTerms = [] } = options;

  // NFKC first, so a composed and a decomposed "é" are the same password, and
  // so the length below counts what the user actually typed.
  const normalized = password.normalize('NFKC');
  const violations: PasswordRule[] = [];

  // Counts code points, not UTF-16 units: an emoji is one character, not two.
  if ([...normalized].length < minLength) {
    violations.push(PasswordRule.MIN_LENGTH);
  }
  if (!HAS_UPPERCASE.test(normalized)) {
    violations.push(PasswordRule.UPPERCASE);
  }
  if (!HAS_LOWERCASE.test(normalized)) {
    violations.push(PasswordRule.LOWERCASE);
  }
  if (!HAS_DIGIT.test(normalized)) {
    violations.push(PasswordRule.DIGIT);
  }
  if (!HAS_SPECIAL.test(normalized)) {
    violations.push(PasswordRule.SPECIAL);
  }

  const isCommon = blocklistCandidates(normalized).some(
    (candidate) => candidate.length >= MIN_TERM_LENGTH && COMMON_PASSWORDS.has(candidate),
  );
  if (isCommon) {
    violations.push(PasswordRule.COMMON);
  }

  if (containsForbiddenTerm(unleet(plain(normalized)), forbiddenTerms)) {
    violations.push(PasswordRule.CONTEXTUAL);
  }

  return violations;
}

/**
 * True when the password is built around one of the caller's own words.
 *
 * `Ellouze2026!` and `Chantier2026!` satisfy every structural rule, and are the
 * first two guesses anyone makes against a named target. No blocklist can know
 * them; only the account's own context can.
 */
function containsForbiddenTerm(
  folded: string,
  forbiddenTerms: readonly (string | null | undefined)[],
): boolean {
  for (const term of forbiddenTerms) {
    if (!term) {
      continue;
    }
    // An email yields both the whole address and its local part; a full name
    // yields each of its words.
    for (const part of unleet(plain(term)).split(/[^a-z0-9]+/)) {
      if (part.length >= MIN_TERM_LENGTH && folded.includes(part)) {
        return true;
      }
    }
  }
  return false;
}

/** Convenience for a caller that only needs a yes/no. */
export function isPasswordStrongEnough(
  password: string,
  options: PasswordPolicyOptions = {},
): boolean {
  return checkPasswordPolicy(password, options).length === 0;
}
