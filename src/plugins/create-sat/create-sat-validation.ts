/**
 * Inline (per-keystroke) validation for the Create Satellite Advanced tab.
 *
 * Unlike the submit-time `validateInputs_` (which enforces the exact padded TLE
 * format), this validates the *semantic* value the user is typing — so "51.64"
 * reads as a valid inclination immediately, before the field is normalized. It
 * toggles Materialize's `.valid` / `.invalid` classes for a live green/red
 * underline; an empty field is neutral (no class).
 */
import { getEl } from '@app/engine/utils/get-el';

/** Numeric range rules keyed by the field's element-id suffix. */
const FIELD_RANGES: Record<string, { min: number; max: number }> = {
  scc: { min: 90_000, max: 99_999 },
  inc: { min: 0, max: 180 },
  rasc: { min: 0, max: 360 },
  argPe: { min: 0, max: 360 },
  meana: { min: 0, max: 360 },
  meanmo: { min: 0.01, max: 20 },
  per: { min: 1, max: 100_000 },
};

/** Field-id suffixes that get live validation. */
export const VALIDATED_FIELDS = ['scc', 'inc', 'rasc', 'ecen', 'argPe', 'meana', 'meanmo', 'per'] as const;

/**
 * Evaluate a single field's raw value.
 * @returns true (valid), false (invalid), or null (empty → neutral).
 */
export function evaluateField(key: string, rawValue: string): boolean | null {
  const value = rawValue.trim();

  if (value === '') {
    return null;
  }

  // Eccentricity is entered as the 7-digit TLE integer (e * 1e7); the implied
  // eccentricity must be in [0, 1).
  if (key === 'ecen') {
    const intVal = parseInt(value, 10);

    return !isNaN(intVal) && intVal >= 0 && intVal < 1e7;
  }

  const num = parseFloat(value);

  if (isNaN(num)) {
    return false;
  }

  const range = FIELD_RANGES[key];

  if (range && (num < range.min || num > range.max)) {
    return false;
  }

  return true;
}

/** Apply the valid/invalid/neutral styling to one field element. */
function applyFieldState(el: HTMLInputElement, state: boolean | null): void {
  el.classList.remove('valid', 'invalid');

  if (state === true) {
    el.classList.add('valid');
  } else if (state === false) {
    el.classList.add('invalid');
  }
}

/**
 * Wire live validation onto the Advanced-tab fields. Validates on every input and
 * once immediately so prefilled defaults are marked. Safe to call when fields are
 * absent (e.g. in unit tests) — missing elements are skipped.
 * @param prefix - The element-id prefix (CreateSat.elementPrefix).
 */
export function wireInlineValidation(prefix: string): void {
  for (const key of VALIDATED_FIELDS) {
    const el = getEl(`${prefix}-${key}`, true) as HTMLInputElement | null;

    if (!el) {
      continue;
    }

    const validate = (): void => applyFieldState(el, evaluateField(key, el.value));

    el.addEventListener('input', validate);
    validate();
  }
}
