import { Locale } from '@chantia/shared';

/** A user changing their own interface language. */
export class UpdatePreferencesCommand {
  constructor(
    public readonly userId: string,
    public readonly locale: Locale,
  ) {}
}
