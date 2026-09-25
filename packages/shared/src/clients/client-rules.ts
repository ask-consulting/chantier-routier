import { ClientType } from '../enums/client.enums';

/** The country a billing address defaults to. */
export const DEFAULT_BILLING_COUNTRY = 'TN';

/**
 * The one name a client goes by, whatever its type.
 *
 * "Last First" for an individual — a client list is read by family name, the
 * way a phone book is — and the legal name for an entity. Shared so the API
 * stores exactly what the web previews while the form is being filled.
 */
export function clientDisplayName(client: {
  type: ClientType;
  firstName?: string | null;
  lastName?: string | null;
  legalName?: string | null;
}): string {
  if (client.type === ClientType.LEGAL_ENTITY) {
    return (client.legalName ?? '').trim();
  }
  return [client.lastName, client.firstName]
    .map((part) => (part ?? '').trim())
    .filter((part) => part.length > 0)
    .join(' ');
}

/**
 * Which names a client of this type must carry — and may not.
 *
 * A legal entity has no first name; an individual has no legal name. Keeping
 * the other type's fields around after a switch would leave a municipality
 * with a stale "Karim" nobody can see or clear.
 */
export function clientNameIsComplete(client: {
  type: ClientType;
  firstName?: string | null;
  lastName?: string | null;
  legalName?: string | null;
}): boolean {
  if (client.type === ClientType.LEGAL_ENTITY) {
    return (client.legalName ?? '').trim().length > 0;
  }
  return (client.lastName ?? '').trim().length > 0 && (client.firstName ?? '').trim().length > 0;
}

/**
 * Enforces "exactly one primary contact as soon as there is one".
 *
 * Several flagged: the first one flagged wins. None flagged: the first contact
 * becomes primary — a client with contacts but no one to call first would make
 * every screen that shows "the" contact pick one arbitrarily, differently.
 */
export function withSinglePrimary<T extends { isPrimary?: boolean }>(
  contacts: readonly T[],
): (T & { isPrimary: boolean })[] {
  const flagged = contacts.findIndex((contact) => contact.isPrimary === true);
  const primary = flagged === -1 ? 0 : flagged;
  return contacts.map((contact, index) => ({ ...contact, isPrimary: index === primary }));
}
