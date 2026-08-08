import { describe, expect, it } from 'vitest';
import { PasswordRule, checkPasswordPolicy, isPasswordStrongEnough } from './password-policy';

describe('checkPasswordPolicy', () => {
  it('accepts a password meeting every rule', () => {
    expect(checkPasswordPolicy('Kf7#tuileRouge')).toEqual([]);
    expect(isPasswordStrongEnough('Kf7#tuileRouge')).toBe(true);
  });

  it('names every rule that fails, not just the first', () => {
    expect(checkPasswordPolicy('abc')).toEqual([
      PasswordRule.MIN_LENGTH,
      PasswordRule.UPPERCASE,
      PasswordRule.DIGIT,
      PasswordRule.SPECIAL,
    ]);
  });

  it.each([
    ['kf7#tuilerouge', PasswordRule.UPPERCASE],
    ['KF7#TUILEROUGE', PasswordRule.LOWERCASE],
    ['KfTuileRougeuse!', PasswordRule.DIGIT],
    ['Kf7TuileRougeuse', PasswordRule.SPECIAL],
    ['Kf7#tui', PasswordRule.MIN_LENGTH],
  ])('rejects %s for %s', (password, rule) => {
    expect(checkPasswordPolicy(password)).toContain(rule);
  });

  it('honours a configured minimum length', () => {
    expect(checkPasswordPolicy('Ab1!', { minLength: 4 })).toEqual([]);
    expect(checkPasswordPolicy('Ab1!', { minLength: 20 })).toEqual([PasswordRule.MIN_LENGTH]);
  });

  it('does not count whitespace as a special character', () => {
    // Otherwise every passphrase would satisfy the rule for free.
    expect(checkPasswordPolicy('Kf7 tuile Rouge')).toContain(PasswordRule.SPECIAL);
  });

  it('accepts accented capitals and non-ASCII punctuation', () => {
    expect(checkPasswordPolicy('Élévation2026«»')).toEqual([]);
  });

  it('counts code points, so an emoji is one character and not two', () => {
    // Nine characters: eight plus one emoji. Must fail a minimum of ten.
    expect(checkPasswordPolicy('Zx4$mruv🔐', { minLength: 10 })).toContain(PasswordRule.MIN_LENGTH);
    expect(checkPasswordPolicy('Zx4$mruve🔐', { minLength: 10 })).toEqual([]);
  });

  it('treats composed and decomposed accents as the same password', () => {
    const composed = 'Éclairage2026!';
    const decomposed = 'Éclairage2026!';
    expect(checkPasswordPolicy(composed)).toEqual(checkPasswordPolicy(decomposed));
  });

  it('still rejects a short password that satisfies every character class', () => {
    // The point of keeping the length floor next to the composition rules.
    expect(checkPasswordPolicy('Aa1!')).toEqual([PasswordRule.MIN_LENGTH]);
  });
});

describe('common-password blocklist', () => {
  it.each(['Password1:', 'Password1!', 'P@ssw0rd12', 'Qwerty123!', 'Motdepasse1!'])(
    'rejects %s — dressing a common password up is not enough',
    (password) => {
      expect(checkPasswordPolicy(password)).toContain(PasswordRule.COMMON);
    },
  );

  it('does not reject an ordinary strong password', () => {
    expect(checkPasswordPolicy('Kf7#tuileRouge')).toEqual([]);
  });
});

describe('contextual terms', () => {
  const context = {
    forbiddenTerms: ['karim.benali@ellouze-construction.fr', 'Karim', 'Benali', 'ELLOUZE construction'],
  };

  it.each(['Ellouze2026!', 'Benali2026!', 'Karim2026!!', 'Construction1!'])(
    'rejects %s — built from the account’s own words',
    (password) => {
      expect(checkPasswordPolicy(password, context)).toContain(PasswordRule.CONTEXTUAL);
    },
  );

  it('sees through accents and leet-speak', () => {
    expect(checkPasswordPolicy('3llouz3-2026!', context)).toContain(PasswordRule.CONTEXTUAL);
  });

  it('ignores terms shorter than four characters', () => {
    // "Li" must not make every password containing those letters fail.
    expect(checkPasswordPolicy('Kf7#tuileRouge', { forbiddenTerms: ['Li', 'Wu'] })).toEqual([]);
  });

  it('leaves an unrelated password alone', () => {
    expect(checkPasswordPolicy('Kf7#tuileRouge', context)).toEqual([]);
  });
});
