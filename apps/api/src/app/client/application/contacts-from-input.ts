import { randomUUID } from 'node:crypto';
import { IClientContactInput } from '@chantia/shared';
import { ClientContact } from '../domain/entities/client-contact.entity';
import { UnknownClientContactException } from '../domain/exceptions/client.exceptions';

/**
 * Turns the contact list a caller sent into domain contacts.
 *
 * No `id` mints a new one. An `id` is accepted only when it is already one of
 * this client's contacts (`ownIds`) — the check that makes up for contacts
 * carrying no tenant of their own. Blank optional fields become `null`.
 */
export function contactsFromInput(
  inputs: readonly IClientContactInput[],
  ownIds: ReadonlySet<string> = new Set(),
): ClientContact[] {
  return inputs.map((input) => {
    if (input.id !== undefined && !ownIds.has(input.id)) {
      throw new UnknownClientContactException(input.id);
    }
    return ClientContact.create({
      id: input.id ?? randomUUID(),
      firstName: blankToNull(input.firstName),
      lastName: input.lastName.trim(),
      position: blankToNull(input.position),
      mobilePhone: blankToNull(input.mobilePhone),
      landlinePhone: blankToNull(input.landlinePhone),
      email: blankToNull(input.email)?.toLowerCase() ?? null,
      isPrimary: input.isPrimary,
    });
  });
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
