import { AccessRequestKind, AccessRequestLocale } from '../enums/access-request.enums';

/** What the public showcase sends when a company asks for access. */
export interface ICreateAccessRequest {
  company: string;
  phone: string;
  kind: AccessRequestKind;
  locale: AccessRequestLocale;
  /** Hidden from people on the form; only a bot fills it in. */
  website?: string;
}
