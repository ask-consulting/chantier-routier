import { UserRole } from '@chantia/shared';

/**
 * Account aggregate root.
 *
 * Immutable: every mutation returns a new instance, so a handler cannot leave a
 * half-updated entity behind when a later step throws.
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: UserRole,
    public readonly active: boolean,
    /** Soft reference to a `Worker` in the business context; no foreign key. */
    public readonly workerId: string | null,
    public readonly lastLoginAt: Date | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(props: {
    id: string;
    organizationId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    active?: boolean;
    workerId?: string | null;
    lastLoginAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): User {
    return new User(
      props.id,
      props.organizationId,
      User.normalizeEmail(props.email),
      props.passwordHash,
      props.firstName.trim(),
      props.lastName.trim(),
      props.role ?? UserRole.WORKER,
      props.active ?? true,
      props.workerId ?? null,
      props.lastLoginAt ?? null,
      props.createdAt,
      props.updatedAt,
    );
  }

  /**
   * Emails are the login identifier, so they are compared case-insensitively.
   * Normalising on the way in keeps lookups a plain indexed equality match.
   */
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /** True when this account may obtain a session. */
  canAuthenticate(): boolean {
    return this.active;
  }

  withPasswordHash(passwordHash: string): User {
    return new User(
      this.id,
      this.organizationId,
      this.email,
      passwordHash,
      this.firstName,
      this.lastName,
      this.role,
      this.active,
      this.workerId,
      this.lastLoginAt,
      this.createdAt,
      this.updatedAt,
    );
  }

  withProfile(changes: {
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    active?: boolean;
    workerId?: string | null;
  }): User {
    return new User(
      this.id,
      this.organizationId,
      this.email,
      this.passwordHash,
      changes.firstName?.trim() ?? this.firstName,
      changes.lastName?.trim() ?? this.lastName,
      changes.role ?? this.role,
      changes.active ?? this.active,
      changes.workerId !== undefined ? changes.workerId : this.workerId,
      this.lastLoginAt,
      this.createdAt,
      this.updatedAt,
    );
  }

  withLastLoginAt(lastLoginAt: Date): User {
    return new User(
      this.id,
      this.organizationId,
      this.email,
      this.passwordHash,
      this.firstName,
      this.lastName,
      this.role,
      this.active,
      this.workerId,
      lastLoginAt,
      this.createdAt,
      this.updatedAt,
    );
  }
}
