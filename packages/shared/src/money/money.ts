/**
 * Money is a whole number of the currency's smallest unit — millimes for the
 * dinar, cents for the euro — everywhere except on a screen. Sums are then
 * exact, on the server and on the offline mobile app alike.
 *
 * **What an amount means depends on its currency:** 1000 is one dinar but ten
 * euros. An organization's currency therefore never changes once it has data.
 *
 * Only amounts follow this. Hours and quantities stay decimal, and a product
 * of the two is rounded once, on the line's total (`roundMinor`).
 */
export const DEFAULT_CURRENCY = 'TND';

const FRACTION_DIGITS: Readonly<Record<string, number>> = {
  TND: 3,
  EUR: 2,
  USD: 2,
  GBP: 2,
  MAD: 2,
  DZD: 2,
  LYD: 3,
};

/** How many decimals the currency has. Two when it is not listed. */
export function currencyDigits(currency: string): number {
  return FRACTION_DIGITS[currency] ?? 2;
}

/** A whole number of the smallest unit — the one rounding money ever gets. */
export function roundMinor(amount: number): number {
  return Math.round(amount);
}

/**
 * From what a person types to what is stored: 6.5 dinars is 6500. Through the
 * decimal notation, because `1.005 * 1000` is 1004.9999999999999 in binary.
 */
export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(Number(`${amount}e${currencyDigits(currency)}`));
}

/** From what is stored to what a person reads: 6500 is 6.5 dinars. */
export function fromMinorUnits(amount: number, currency: string): number {
  return Number(`${amount}e-${currencyDigits(currency)}`);
}
