/**
 * The vocabulary of the module, mirrored from the Prisma enums.
 *
 * Declared here rather than imported from `@prisma/client` so `domain/` keeps
 * depending on nothing (rule 1 of `apps/api/eslint.config.mjs`). The mapping is
 * asserted in the repository, which is the one place allowed to know both.
 */
export enum NotificationSubject {
  INVITATION = 'invitation',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
}

export enum NotificationLocale {
  FR = 'fr',
  AR = 'ar',
}

/** Where a notification goes, in the shape the channel needs. */
export interface NotificationRecipient {
  /** Required for `EMAIL`. */
  email?: string;
  /** Required for `SMS`. Unused today; the channel exists, the sender does not. */
  phone?: string;
  /** Used by channels that address a person by name. */
  name?: string;
}
