import { ClientType } from '../enums/client.enums';

/**
 * Where invoices go. Structured rather than free text, so a printed invoice can
 * lay it out and a list can be filtered by city.
 *
 * `country` is an ISO 3166-1 alpha-2 code — `TN` unless said otherwise.
 */
export interface IBillingAddress {
  line1: string | null;
  line2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
}

/** A person to call at the client — site contact, accountant, mayor's office. */
export interface IClientContact {
  id: string;
  firstName: string | null;
  lastName: string;
  /** Their role at the client — "Directeur technique", "Secrétaire général"… */
  position: string | null;
  mobilePhone: string | null;
  landlinePhone: string | null;
  email: string | null;
  /** Exactly one contact is primary as soon as there is one at all. */
  isPrimary: boolean;
}

/** Transport representation of a client (API response, web/mobile cache). */
export interface IClient {
  id: string;
  organizationId: string;
  type: ClientType;
  /** Individuals only; `null` for a legal entity. */
  firstName: string | null;
  /** Individuals only; `null` for a legal entity. */
  lastName: string | null;
  /** Legal entities only — the raison sociale; `null` for an individual. */
  legalName: string | null;
  /**
   * The one name to show and sort by, whatever the type — see
   * `clientDisplayName`. Computed on write, never sent by a caller.
   */
  displayName: string;
  billingAddress: IBillingAddress;
  contacts: IClientContact[];
  createdAt?: string;
  updatedAt?: string;
}

/** A contact as a caller sends it. No `id` creates one; an `id` keeps that one. */
export interface IClientContactInput {
  id?: string;
  firstName?: string | null;
  lastName: string;
  position?: string | null;
  mobilePhone?: string | null;
  landlinePhone?: string | null;
  email?: string | null;
  isPrimary?: boolean;
}

export interface IBillingAddressInput {
  line1?: string | null;
  line2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string;
}

/** Payload to create a client. */
export interface ICreateClient {
  type: ClientType;
  firstName?: string | null;
  lastName?: string | null;
  legalName?: string | null;
  billingAddress?: IBillingAddressInput;
  contacts?: IClientContactInput[];
}

/**
 * Payload to change a client. Every field optional; `contacts`, when present,
 * is the **whole** new list — a contact left out is removed.
 */
export interface IUpdateClient {
  type?: ClientType;
  firstName?: string | null;
  lastName?: string | null;
  legalName?: string | null;
  billingAddress?: IBillingAddressInput;
  contacts?: IClientContactInput[];
}

/** The part of a client a worksite shows — enough to name it, nothing more. */
export interface IClientSummary {
  id: string;
  displayName: string;
}
