/**
 * A person to reach at a client. Part of the `Client` aggregate — never loaded,
 * saved or deleted on its own, because it carries no tenant of its own: it
 * belongs to an organization only through its client.
 */
export class ClientContact {
  constructor(
    public readonly id: string,
    public readonly firstName: string | null,
    public readonly lastName: string,
    public readonly position: string | null,
    public readonly mobilePhone: string | null,
    public readonly landlinePhone: string | null,
    public readonly email: string | null,
    public readonly isPrimary: boolean,
  ) {}

  static create(props: {
    id: string;
    firstName?: string | null;
    lastName: string;
    position?: string | null;
    mobilePhone?: string | null;
    landlinePhone?: string | null;
    email?: string | null;
    isPrimary?: boolean;
  }): ClientContact {
    return new ClientContact(
      props.id,
      props.firstName ?? null,
      props.lastName,
      props.position ?? null,
      props.mobilePhone ?? null,
      props.landlinePhone ?? null,
      props.email ?? null,
      props.isPrimary ?? false,
    );
  }
}
