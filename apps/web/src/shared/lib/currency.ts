import { DEFAULT_CURRENCY, fromMinorUnits, toMinorUnits } from '@chantia/shared';

/**
 * The currency of the signed-in organization, set from the session like the
 * access token in `http-client.ts`. It is the same for a whole browser tab, and
 * every amount on the screen depends on it, so it does not travel by props.
 */
let currency: string = DEFAULT_CURRENCY;

export function setCurrency(next: string | null | undefined): void {
  currency = next ?? DEFAULT_CURRENCY;
}

export function getCurrency(): string {
  return currency;
}

/** What is typed in a form, as the API stores it: 6.5 dinars is 6500. */
export function toStoredAmount(amount: number): number {
  return toMinorUnits(amount, currency);
}

/** What the API stores, as a form shows it: 6500 is 6.5 dinars. */
export function fromStoredAmount(amount: number): number {
  return fromMinorUnits(amount, currency);
}
