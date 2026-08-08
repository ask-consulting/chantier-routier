import { Injectable } from '@nestjs/common';
import { ScryptOptions, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';

/**
 * `scrypt` is overloaded and `promisify` resolves to the parameter-less form,
 * so the signature is pinned before promisifying to keep the options argument.
 */
const scryptAsync = promisify<string, Buffer, number, ScryptOptions, Buffer>(scrypt);

/**
 * Cost parameters. `N=2^15` with `r=8` costs ~32 MB and ~100 ms per hash on a
 * small instance — deliberately slow, that is the whole point of a password
 * hash. Raising them later stays compatible: parameters are stored inside every
 * hash, so old passwords keep verifying against their own settings.
 */
const SCRYPT_COST = 2 ** 15;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
/** scrypt refuses to run above this; 2 × the memory the parameters above need. */
const MAX_MEMORY = 128 * SCRYPT_COST * SCRYPT_BLOCK_SIZE * 2;

const ALGORITHM = 'scrypt';
const FIELD_SEPARATOR = '$';

/**
 * scrypt from Node's standard library — no native module to compile, which
 * keeps the Docker image and the Render free-tier build simple. Memory-hard, so
 * it resists GPU cracking better than PBKDF2.
 *
 * Encoded form: `scrypt$N$r$p$salt$key`, both binary parts in base64url. The
 * hash is self-describing, so nothing outside this class needs to know the
 * parameters in force.
 */
@Injectable()
export class ScryptPasswordHasher implements PasswordHasherPort {
  async hash(plainPassword: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await this.derive(plainPassword, salt);

    return [
      ALGORITHM,
      SCRYPT_COST,
      SCRYPT_BLOCK_SIZE,
      SCRYPT_PARALLELIZATION,
      salt.toString('base64url'),
      key.toString('base64url'),
    ].join(FIELD_SEPARATOR);
  }

  async verify(plainPassword: string, encodedHash: string): Promise<boolean> {
    const parsed = this.parse(encodedHash);
    if (!parsed) {
      // A corrupted or foreign hash is a failed login, not a 500.
      return false;
    }

    const candidate = await this.derive(plainPassword, parsed.salt, parsed);
    return (
      candidate.length === parsed.key.length && timingSafeEqual(candidate, parsed.key)
    );
  }

  async simulateVerify(): Promise<void> {
    await this.derive(randomBytes(16).toString('base64url'), randomBytes(SALT_LENGTH));
  }

  private derive(
    password: string,
    salt: Buffer,
    params: { cost: number; blockSize: number; parallelization: number } = {
      cost: SCRYPT_COST,
      blockSize: SCRYPT_BLOCK_SIZE,
      parallelization: SCRYPT_PARALLELIZATION,
    },
  ): Promise<Buffer> {
    return scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH, {
      N: params.cost,
      r: params.blockSize,
      p: params.parallelization,
      maxmem: MAX_MEMORY,
    });
  }

  private parse(encodedHash: string): {
    cost: number;
    blockSize: number;
    parallelization: number;
    salt: Buffer;
    key: Buffer;
  } | null {
    const parts = encodedHash.split(FIELD_SEPARATOR);
    if (parts.length !== 6 || parts[0] !== ALGORITHM) {
      return null;
    }

    const [, cost, blockSize, parallelization, salt, key] = parts;
    const parsed = {
      cost: Number(cost),
      blockSize: Number(blockSize),
      parallelization: Number(parallelization),
      salt: Buffer.from(salt, 'base64url'),
      key: Buffer.from(key, 'base64url'),
    };

    const validNumbers = [parsed.cost, parsed.blockSize, parsed.parallelization].every(
      (value) => Number.isInteger(value) && value > 0,
    );
    if (!validNumbers || parsed.salt.length === 0 || parsed.key.length === 0) {
      return null;
    }

    return parsed;
  }
}
