/**
 * Locale-aware number parsing.
 * This should be used for user input where the decimal separator may be a comma or a period,
 * depending on the user's locale. It normalizes the input by replacing commas with periods before parsing.
 * This allows users to enter numbers in their familiar format (e.g., "5943,5" for 5943.5) without causing parsing errors.
 *
 * @param value - String value to parse (e.g., "5943,5" or "5943.5")
 * @returns Parsed number, or NaN if invalid
 */
export function parseLocalizedNumber(value: string): number {
  // Normalize: replace comma with period for parsing
  const normalized = value.replace(',', '.');

  return parseFloat(normalized);
}
