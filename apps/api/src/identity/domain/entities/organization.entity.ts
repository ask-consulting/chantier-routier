/** Tenant aggregate root. Owned by the identity context. */
export class Organization {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly currency: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  static create(props: {
    id: string;
    name: string;
    currency?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Organization {
    return new Organization(
      props.id,
      props.name.trim(),
      props.currency ?? 'EUR',
      props.createdAt,
      props.updatedAt,
    );
  }
}
