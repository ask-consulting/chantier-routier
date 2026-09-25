'use client';

import { useCallback, useState } from 'react';
import {
  ClientType,
  DEFAULT_BILLING_COUNTRY,
  clientDisplayName,
  clientNameIsComplete,
  type IClient,
  type IClientContactInput,
} from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import { useCreateClient, useUpdateClient } from '../api/client.queries';

/** Why a client could not be saved, as a key under `clients.error.*`. */
export type ClientErrorKey = 'invalidInput' | 'unknown';

export interface ContactFormValues {
  /** A stable React key — the server id when there is one, a local one otherwise. */
  key: string;
  /** Present for a contact that already exists; sent back so the API keeps it. */
  id?: string;
  firstName: string;
  lastName: string;
  position: string;
  mobilePhone: string;
  landlinePhone: string;
  email: string;
  isPrimary: boolean;
}

export interface ClientFormValues {
  type: ClientType;
  firstName: string;
  lastName: string;
  legalName: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  country: string;
  contacts: ContactFormValues[];
}

type ClientField = Exclude<keyof ClientFormValues, 'contacts'>;
type ContactField = Exclude<keyof ContactFormValues, 'key' | 'id' | 'isPrimary'>;

/** Loose on purpose, like the API: the address is for a person to read. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let nextKey = 0;
function localKey(): string {
  nextKey += 1;
  return `new-${nextKey}`;
}

function emptyContact(isPrimary: boolean): ContactFormValues {
  return {
    key: localKey(),
    firstName: '',
    lastName: '',
    position: '',
    mobilePhone: '',
    landlinePhone: '',
    email: '',
    isPrimary,
  };
}

function valuesOf(client: IClient | null): ClientFormValues {
  if (!client) {
    return {
      type: ClientType.LEGAL_ENTITY,
      firstName: '',
      lastName: '',
      legalName: '',
      line1: '',
      line2: '',
      postalCode: '',
      city: '',
      country: DEFAULT_BILLING_COUNTRY,
      contacts: [],
    };
  }
  return {
    type: client.type,
    firstName: client.firstName ?? '',
    lastName: client.lastName ?? '',
    legalName: client.legalName ?? '',
    line1: client.billingAddress.line1 ?? '',
    line2: client.billingAddress.line2 ?? '',
    postalCode: client.billingAddress.postalCode ?? '',
    city: client.billingAddress.city ?? '',
    country: client.billingAddress.country,
    contacts: client.contacts.map((contact) => ({
      key: contact.id,
      id: contact.id,
      firstName: contact.firstName ?? '',
      lastName: contact.lastName,
      position: contact.position ?? '',
      mobilePhone: contact.mobilePhone ?? '',
      landlinePhone: contact.landlinePhone ?? '',
      email: contact.email ?? '',
      isPrimary: contact.isPrimary,
    })),
  };
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * One form for both doors — create when `client` is `null`, edit otherwise —
 * remounted by a `key` when the target changes, like `useWorksiteForm`.
 *
 * **Contacts are edited as a list and sent whole.** The API treats the list
 * it receives as the new list: an existing contact travels with its `id`, a
 * removed one is simply absent. A primary contact is always designated —
 * adding the first contact makes it primary, and removing the primary one
 * hands the role to the first remaining — so what the form shows is what the
 * API will store.
 *
 * **Only the names of the chosen type are sent.** Switching from a person to
 * a town hall keeps what was typed in the boxes, in case of a mis-click, but
 * sends none of it.
 */
export function useClientForm(client: IClient | null = null) {
  const [values, setValues] = useState<ClientFormValues>(() => valuesOf(client));
  const [error, setError] = useState<ClientErrorKey | null>(null);
  const create = useCreateClient();
  const update = useUpdateClient();
  const pending = create.isPending || update.isPending;
  const isEditing = client !== null;

  const touched = useCallback(() => setError(null), []);

  const setValue = useCallback(
    <K extends ClientField>(field: K, value: ClientFormValues[K]) => {
      setValues((previous) => ({ ...previous, [field]: value }));
      touched();
    },
    [touched],
  );

  const setContactValue = useCallback(
    (key: string, field: ContactField, value: string) => {
      setValues((previous) => ({
        ...previous,
        contacts: previous.contacts.map((contact) =>
          contact.key === key ? { ...contact, [field]: value } : contact,
        ),
      }));
      touched();
    },
    [touched],
  );

  const addContact = useCallback(() => {
    setValues((previous) => ({
      ...previous,
      contacts: [...previous.contacts, emptyContact(previous.contacts.length === 0)],
    }));
    touched();
  }, [touched]);

  const removeContact = useCallback(
    (key: string) => {
      setValues((previous) => {
        const remaining = previous.contacts.filter((contact) => contact.key !== key);
        const hasPrimary = remaining.some((contact) => contact.isPrimary);
        return {
          ...previous,
          contacts: remaining.map((contact, index) => ({
            ...contact,
            isPrimary: hasPrimary ? contact.isPrimary : index === 0,
          })),
        };
      });
      touched();
    },
    [touched],
  );

  const setPrimary = useCallback(
    (key: string) => {
      setValues((previous) => ({
        ...previous,
        contacts: previous.contacts.map((contact) => ({
          ...contact,
          isPrimary: contact.key === key,
        })),
      }));
      touched();
    },
    [touched],
  );

  const reset = useCallback(() => {
    setValues(valuesOf(client));
    setError(null);
    create.reset();
    update.reset();
  }, [client, create, update]);

  const invalidEmails = new Set(
    values.contacts
      .filter((contact) => contact.email.trim() !== '' && !EMAIL.test(contact.email.trim()))
      .map((contact) => contact.key),
  );
  const isComplete =
    clientNameIsComplete(values) &&
    values.contacts.every((contact) => contact.lastName.trim().length > 0) &&
    invalidEmails.size === 0;

  /** What the list will show — the same function the API stores. */
  const displayName = clientDisplayName(values);

  async function submit(event: React.FormEvent): Promise<boolean> {
    event.preventDefault();
    if (!isComplete || pending) {
      return false;
    }
    setError(null);

    const isPerson = values.type === ClientType.INDIVIDUAL;
    const contacts: IClientContactInput[] = values.contacts.map((contact) => ({
      ...(contact.id ? { id: contact.id } : {}),
      firstName: orNull(contact.firstName),
      lastName: contact.lastName.trim(),
      position: orNull(contact.position),
      mobilePhone: orNull(contact.mobilePhone),
      landlinePhone: orNull(contact.landlinePhone),
      email: orNull(contact.email),
      isPrimary: contact.isPrimary,
    }));
    const payload = {
      type: values.type,
      firstName: isPerson ? orNull(values.firstName) : null,
      lastName: isPerson ? orNull(values.lastName) : null,
      legalName: isPerson ? null : orNull(values.legalName),
      billingAddress: {
        line1: orNull(values.line1),
        line2: orNull(values.line2),
        postalCode: orNull(values.postalCode),
        city: orNull(values.city),
        country: values.country,
      },
      contacts,
    };

    try {
      if (isEditing) {
        await update.mutateAsync({ id: client.id, data: payload });
      } else {
        await create.mutateAsync(payload);
      }
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 400 ? 'invalidInput' : 'unknown');
      return false;
    }
  }

  return {
    values,
    setValue,
    setContactValue,
    addContact,
    removeContact,
    setPrimary,
    reset,
    submit,
    isComplete,
    invalidEmails,
    displayName,
    pending,
    error,
    isEditing,
  };
}
