import { ILoginRequest } from '@chantia/shared';

export class LoginCommand {
  constructor(
    public readonly data: ILoginRequest,
    public readonly userAgent: string | null,
  ) {}
}
