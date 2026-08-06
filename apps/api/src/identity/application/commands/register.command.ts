import { IRegisterRequest } from '@chantia/shared';

/** Self-service sign-up: provisions an organization and its first admin. */
export class RegisterCommand {
  constructor(
    public readonly data: IRegisterRequest,
    public readonly userAgent: string | null,
  ) {}
}
