import { Locale } from '@chantia/shared';

/**
 * Somebody has been invited into the organization.
 *
 * The seam between *issuing* an invitation and *delivering* it. Nothing
 * subscribes today: the admin copies the link and passes it on by whatever
 * channel suits. When a notification module arrives — email, SMS, in-app — it
 * subscribes here, and the identity context does not change.
 *
 * That is the whole reason this exists rather than a `mailer.send()` call inside
 * the handler: delivery is a different concern, with different failure modes,
 * and it must not be able to fail the creation of an account.
 *
 * The event carries what a message needs, and nothing more — never the token
 * itself, which is why `invitationPath` is passed rather than the raw secret.
 */
export class UserInvitedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    /** The recipient's language — a notification must be written in it. */
    public readonly locale: Locale,
    public readonly organizationName: string,
    /** Where the invitee sets their password, e.g. `/invitation/aB3x…`. */
    public readonly invitationPath: string,
    public readonly expiresAt: Date,
    public readonly invitedById: string,
  ) {}
}
