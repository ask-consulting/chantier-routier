import { ClientType } from '@chantia/shared';

/**
 * How a client reads on screen. Labels live in `messages/*.json` under
 * `clientType.*`; the order a reader expects lives here.
 */

/** Both types, legal entity first — a road works client is rarely a person. */
export const CLIENT_TYPES: readonly ClientType[] = [ClientType.LEGAL_ENTITY, ClientType.INDIVIDUAL];

/** Countries offered for a billing address, Tunisia first; ISO 3166-1 alpha-2. */
export const BILLING_COUNTRIES: readonly string[] = ['TN', 'DZ', 'LY', 'MA', 'FR', 'IT'];

/**
 * A country's name in the reader's language, from the platform rather than a
 * translation file: `Intl` already knows "Tunisie" and "تونس".
 */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
