export interface PasswordHasherPort {
  /** Returns a self-describing encoded hash (algorithm + parameters + salt). */
  hash(plainPassword: string): Promise<string>;
  /** Constant-time comparison; returns false rather than throwing on bad input. */
  verify(plainPassword: string, encodedHash: string): Promise<boolean>;
  /**
   * Burns roughly the same CPU as `verify` without comparing anything.
   * Called when no account matches, so that "unknown email" and "wrong password"
   * take the same time and cannot be told apart by an enumeration probe.
   */
  simulateVerify(): Promise<void>;
}

export const PASSWORD_HASHER_PORT = Symbol('PasswordHasherPort');
