import { describe, expect, it } from 'vitest';
import { ScryptPasswordHasher } from './scrypt-password-hasher';

/**
 * The real scrypt, not a double: what is under test is the encoded format and
 * the refusals, and both only mean something against the real derivation.
 *
 * Each hash costs ~100 ms by design, so the cases are few and each one earns
 * its place.
 */

const hasher = new ScryptPasswordHasher();
const PASSWORD = 'Correct-Horse-42!';

describe('ScryptPasswordHasher', () => {
  it('verifies the password it hashed, and nothing else', async () => {
    const encoded = await hasher.hash(PASSWORD);

    expect(await hasher.verify(PASSWORD, encoded)).toBe(true);
    expect(await hasher.verify('Correct-Horse-43!', encoded)).toBe(false);
  });

  it('writes a self-describing hash — algorithm and parameters travel with it', async () => {
    const encoded = await hasher.hash(PASSWORD);
    const [algorithm, cost, blockSize, parallelization, salt, key] = encoded.split('$');

    expect(algorithm).toBe('scrypt');
    expect([cost, blockSize, parallelization]).toEqual(['32768', '8', '1']);
    expect(Buffer.from(salt, 'base64url')).toHaveLength(16);
    expect(Buffer.from(key, 'base64url')).toHaveLength(64);
  });

  it('salts every hash, so two accounts sharing a password do not share a hash', async () => {
    const [first, second] = await Promise.all([hasher.hash(PASSWORD), hasher.hash(PASSWORD)]);

    expect(first).not.toBe(second);
  });

  it('verifies against the parameters stored in the hash, not the ones in force', async () => {
    // A hash written with cheaper settings must keep working after the cost is
    // raised — otherwise raising it would lock every existing account out.
    const encoded = await hasher.hash(PASSWORD);
    const cheaper = encoded.replace('$32768$', '$16384$');

    // Same salt and key, different N: the derivation differs, so the stored key
    // no longer matches. Proof that N is read from the hash, not from the code.
    expect(await hasher.verify(PASSWORD, cheaper)).toBe(false);
  });

  it('treats the same password typed in another Unicode form as the same password', async () => {
    // "é" precomposed (U+00E9) and decomposed (e + U+0301) look identical on
    // screen; a phone keyboard and a desktop one may not send the same bytes.
    const encoded = await hasher.hash('Chantier-été-2026');

    expect(await hasher.verify('Chantier-été-2026', encoded)).toBe(true);
  });

  it.each([
    ['an empty string', ''],
    ['another algorithm', 'bcrypt$32768$8$1$c2FsdA$a2V5'],
    ['too few fields', 'scrypt$32768$8$c2FsdA$a2V5'],
    ['a cost that is not a number', 'scrypt$abc$8$1$c2FsdA$a2V5'],
    ['a zero parameter', 'scrypt$32768$0$1$c2FsdA$a2V5'],
    ['an empty salt', 'scrypt$32768$8$1$$a2V5'],
    ['an empty key', 'scrypt$32768$8$1$c2FsdA$'],
  ])('answers false — never throws — for %s', async (_label, encoded) => {
    await expect(hasher.verify(PASSWORD, encoded)).resolves.toBe(false);
  });

  it('refuses a key of the wrong length instead of comparing it', async () => {
    // timingSafeEqual throws on unequal lengths; the guard in front of it must
    // turn that into a plain refusal.
    const encoded = await hasher.hash(PASSWORD);
    const truncated = encoded.slice(0, encoded.lastIndexOf('$') + 1) + 'a2V5';

    await expect(hasher.verify(PASSWORD, truncated)).resolves.toBe(false);
  });

  it('spends the work of a verification without a hash to verify against', async () => {
    // Used on an unknown address, so it costs as much as a wrong password.
    await expect(hasher.simulateVerify()).resolves.toBeUndefined();
  });
});
