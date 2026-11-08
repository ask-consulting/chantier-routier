import { AccessRequestKind, AccessRequestLocale } from '@chantia/shared';

/** A company that asked for access from the public showcase. */
export class AccessRequest {
  constructor(
    public readonly id: string,
    public readonly company: string,
    public readonly phone: string,
    public readonly kind: AccessRequestKind,
    public readonly locale: AccessRequestLocale,
    public readonly createdAt?: Date,
  ) {}

  static create(props: {
    id: string;
    company: string;
    phone: string;
    kind: AccessRequestKind;
    locale: AccessRequestLocale;
    createdAt?: Date;
  }): AccessRequest {
    return new AccessRequest(
      props.id,
      props.company.trim(),
      props.phone.trim(),
      props.kind,
      props.locale,
      props.createdAt,
    );
  }
}
