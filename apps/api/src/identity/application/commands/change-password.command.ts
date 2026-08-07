import { IChangePassword } from '@chantia/shared';

/** A user changing their own password — never an admin resetting someone else's. */
export class ChangePasswordCommand {
  constructor(
    public readonly userId: string,
    public readonly data: IChangePassword,
  ) {}
}
