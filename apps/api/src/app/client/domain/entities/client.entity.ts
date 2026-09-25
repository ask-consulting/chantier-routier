import {
  ClientType,
  DEFAULT_BILLING_COUNTRY,
  clientDisplayName,
  clientNameIsComplete,
  withSinglePrimary,
} from '@chantia/shared';
import { InvalidClientNameException } from '../exceptions/client.exceptions';
import { ClientContact } from './client-contact.entity';

/** Where invoices go. A value: two equal addresses are the same address. */
export interface BillingAddress {
  line1: string | null;
  line2: string | null;
  postalCode: string | null;
  city: string | null;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

export interface ClientNames {
  type: ClientType;
  firstName: string | null;
  lastName: string | null;
  legalName: string | null;
}

/**
 * Client aggregate root — who a worksite is built for, and who to call there.
 *
 * Two invariants live here and nowhere else, so that no write path can skip
 * them:
 *
 *   - **The names match the type.** An individual has a first and a last name
 *     and no legal name; a legal entity the reverse. Switching type clears the
 *     other side's fields rather than keeping a stale "Karim" on a town hall.
 *   - **Exactly one primary contact** as soon as there is one.
 *
 * `displayName` is derived from the names, never set: see `clientDisplayName`.
 */
export class Client {
  private constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly type: ClientType,
    public readonly firstName: string | null,
    public readonly lastName: string | null,
    public readonly legalName: string | null,
    public readonly billingAddress: BillingAddress,
    public readonly contacts: readonly ClientContact[],
    /**
     * When this client was removed, or `null` while current. Worksites point
     * here, so the row is kept — the same arrangement as `workers` and
     * `worksites`. The repository's reads filter it out.
     */
    public readonly deletedAt: Date | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  /**
   * The only way in, for a new client and for a row read back alike.
   *
   * @throws InvalidClientNameException when the names do not fit the type.
   */
  static create(props: {
    id: string;
    organizationId: string;
    type: ClientType;
    firstName?: string | null;
    lastName?: string | null;
    legalName?: string | null;
    billingAddress?: Partial<BillingAddress>;
    contacts?: readonly ClientContact[];
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Client {
    const names = Client.namesFor(props);
    if (!clientNameIsComplete(names)) {
      throw new InvalidClientNameException(names.type);
    }

    return new Client(
      props.id,
      props.organizationId,
      names.type,
      names.firstName,
      names.lastName,
      names.legalName,
      {
        line1: clean(props.billingAddress?.line1),
        line2: clean(props.billingAddress?.line2),
        postalCode: clean(props.billingAddress?.postalCode),
        city: clean(props.billingAddress?.city),
        country: (props.billingAddress?.country ?? DEFAULT_BILLING_COUNTRY).toUpperCase(),
      },
      withSinglePrimary(props.contacts ?? []).map(
        (contact) =>
          new ClientContact(
            contact.id,
            contact.firstName,
            contact.lastName,
            contact.position,
            contact.mobilePhone,
            contact.landlinePhone,
            contact.email,
            contact.isPrimary,
          ),
      ),
      props.deletedAt ?? null,
      props.createdAt,
      props.updatedAt,
    );
  }

  /** Keeps only the names that belong to the type — trimmed, blanks as `null`. */
  private static namesFor(props: {
    type: ClientType;
    firstName?: string | null;
    lastName?: string | null;
    legalName?: string | null;
  }): ClientNames {
    const isPerson = props.type === ClientType.INDIVIDUAL;
    return {
      type: props.type,
      firstName: isPerson ? clean(props.firstName) : null,
      lastName: isPerson ? clean(props.lastName) : null,
      legalName: isPerson ? null : clean(props.legalName),
    };
  }

  get displayName(): string {
    return clientDisplayName(this);
  }

  get primaryContact(): ClientContact | null {
    return this.contacts.find((contact) => contact.isPrimary) ?? null;
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  /**
   * A changed copy, re-validated.
   *
   * `undefined` leaves a field; `null` clears it. `contacts`, when given, is
   * the whole new list. The address merges field by field, so changing the
   * city alone does not wipe the street.
   */
  with(changes: {
    type?: ClientType;
    firstName?: string | null;
    lastName?: string | null;
    legalName?: string | null;
    billingAddress?: Partial<BillingAddress>;
    contacts?: readonly ClientContact[];
  }): Client {
    const pick = <T>(next: T | undefined, current: T): T => (next === undefined ? current : next);

    return Client.create({
      id: this.id,
      organizationId: this.organizationId,
      type: changes.type ?? this.type,
      firstName: pick(changes.firstName, this.firstName),
      lastName: pick(changes.lastName, this.lastName),
      legalName: pick(changes.legalName, this.legalName),
      billingAddress: {
        line1: pick(changes.billingAddress?.line1, this.billingAddress.line1),
        line2: pick(changes.billingAddress?.line2, this.billingAddress.line2),
        postalCode: pick(changes.billingAddress?.postalCode, this.billingAddress.postalCode),
        city: pick(changes.billingAddress?.city, this.billingAddress.city),
        country: pick(changes.billingAddress?.country, this.billingAddress.country),
      },
      contacts: changes.contacts ?? this.contacts,
      deletedAt: this.deletedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }

  /** Marks this client removed, without discarding it. */
  deleted(at: Date = new Date()): Client {
    return new Client(
      this.id,
      this.organizationId,
      this.type,
      this.firstName,
      this.lastName,
      this.legalName,
      this.billingAddress,
      this.contacts,
      at,
      this.createdAt,
      this.updatedAt,
    );
  }
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
