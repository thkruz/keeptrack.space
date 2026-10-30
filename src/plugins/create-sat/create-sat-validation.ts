/**
 * Validation for the Create Satellite forms, in two layers:
 *
 * - Inline (per-keystroke) styling: `wireInlineValidation` toggles Materialize's
 *   `.valid` / `.invalid` classes for a live green/red underline (also reused by
 *   Edit Satellite). An empty field is neutral (no class).
 * - Submit-time reporting: `validateBasicFields` / `validateAdvancedFields`
 *   return every failed rule at once and `FormErrorReporter` lists them, marks
 *   the fields, and clears each message as its field is fixed.
 *
 * Both check the semantic value ("51.64" is a valid inclination), not the padded
 * TLE layout the submit writes back.
 */
import { AnalystSlotReservations } from '@app/app/data/analyst-slot-reservations';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';

type T7eKey = Parameters<typeof t7e>[0];

/** Numeric range rules keyed by the field's element-id suffix. */
const FIELD_RANGES: Record<string, { min: number; max: number }> = {
  scc: { min: 90_000, max: 99_999 },
  inc: { min: 0, max: 180 },
  rasc: { min: 0, max: 360 },
  argPe: { min: 0, max: 360 },
  meana: { min: 0, max: 360 },
  // SGP4 TLEs (and ootk's parser) accept mean motion up to 18 rev/day.
  meanmo: { min: 0.01, max: 18 },
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
 * Wire live validation onto a form's element fields. Validates on every input and
 * once immediately so prefilled defaults are marked. Safe to call when fields are
 * absent (e.g. in unit tests) — missing elements are skipped.
 * @param prefix - The element-id prefix (e.g. CreateSat/EditSat.elementPrefix).
 * @param fields - Field-id suffixes to validate (defaults to VALIDATED_FIELDS).
 *   Pass a subset when a menu reuses a field id for a different purpose (e.g. Edit
 *   Satellite's read-only `scc` carries a real catalog number, not a 90000-range
 *   analyst slot).
 */
export function wireInlineValidation(prefix: string, fields: readonly string[] = VALIDATED_FIELDS): void {
  for (const key of fields) {
    const el = getEl(`${prefix}-${key}`, true) as HTMLInputElement | null;

    if (!el) {
      continue;
    }

    const validate = (): void => applyFieldState(el, evaluateField(key, el.value));

    el.addEventListener('input', validate);
    validate();
  }
}

// ===========================================================================
// Submit-time validation: every invalid field at once, cleared as it is fixed
// ===========================================================================

/** Raw Advanced-tab values, keyed like the TLE composer expects them. */
export interface TleInputParams {
  scc: string;
  type: string;
  country: string;
  inc: string;
  meanmo: string;
  rasc: string;
  ecen: string;
  argPe: string;
  meana: string;
  epochyr: string;
  epochday: string;
  source: string;
  name: string;
  period: string;
}

/** Raw Basic-tab values. */
export interface BasicInputValues {
  scc: string;
  inc: string;
  apogee: string;
  perigee: string;
}

/**
 * One failed rule. `id` names the rule's primary field so a field keeps (and
 * updates) its message while it stays wrong; `fields` are every element-id
 * suffix the rule marks invalid (a cross-field rule marks both fields).
 */
export interface FormFieldError {
  id: string;
  fields: string[];
  message: string;
}

/** Valid range per Advanced field, matching ootk's TLE parser limits. */
const ADVANCED_RANGES: Record<string, { min: number; max: number; label: string; unit: 'deg' | 'none' }> = {
  inc: { min: 0, max: 180, label: 'inclination', unit: 'deg' },
  rasc: { min: 0, max: 360, label: 'rightAscension', unit: 'deg' },
  argPe: { min: 0, max: 360, label: 'argOfPerigee', unit: 'deg' },
  meana: { min: 0, max: 360, label: 'meanAnomaly', unit: 'deg' },
  day: { min: 1, max: 366.99999999, label: 'epochDay', unit: 'none' },
};

/** Largest mean motion (rev/day) a TLE can carry. */
export const MAX_MEAN_MOTION = 18;

const errMsg = (key: string): string => t7e(`plugins.CreateSat.errorMsgs.${key}` as T7eKey);
const label = (key: string): string => t7e(`plugins.CreateSat.labels.${key}` as T7eKey);

/** Strict number parse: empty or partly numeric text is NaN. */
function toNumber(raw: string): number {
  const value = raw.trim();

  return value === '' ? Number.NaN : Number(value);
}

/** True when a raw value is a number inside the field's range (inclusive). */
function isInRange(key: string, raw: string): boolean {
  const num = toNumber(raw);
  const range = ADVANCED_RANGES[key];

  return num >= range.min && num <= range.max;
}

/** The friendly message for one Advanced field: which field and its valid range. */
export function advancedFieldMessage(key: string): string {
  const range = ADVANCED_RANGES[key];

  if (range) {
    return errMsg(range.unit === 'deg' ? 'rangeErrorDeg' : 'rangeError')
      .replace('{field}', label(range.label))
      .replace('{min}', String(range.min))
      .replace('{max}', String(range.max));
  }

  switch (key) {
    case 'meanmo':
      return errMsg('meanMotionRange').replace('{field}', label('meanMotion')).replace('{max}', String(MAX_MEAN_MOTION));
    case 'per':
      return errMsg('periodPositive').replace('{field}', label('period'));
    case 'ecen':
      return errMsg('invalidEccentricity');
    case 'year':
      return errMsg('invalidEpochYear');
    case 'scc':
      return errMsg('invalidNoradId');
    default:
      return errMsg('invalidInputParams');
  }
}

/** The slot's NORAD id is held by another object (a New Launch trajectory), so filling it would collide. */
function reservedSccMessage(scc: string): string {
  return errMsg('noradIdReserved').replace('{id}', scc.trim());
}

/** True when a 1-5 digit id falls in the analyst range 90000-99999. */
function isAnalystScc(raw: string): boolean {
  const value = raw.trim();

  if (!/^\d{1,5}$/u.test(value)) {
    return false;
  }
  const num = Number.parseInt(value, 10);

  return num >= 90_000 && num <= 99_999;
}

/**
 * Validate the Advanced form semantically (numbers and ranges, not the padded
 * TLE layout), so it gives the same answer for "51.6" while typing and for
 * "051.6000" after the submit normalizes it.
 * @returns every failed rule, in form order.
 */
export function validateAdvancedFields(v: TleInputParams): FormFieldError[] {
  const errors: FormFieldError[] = [];
  const add = (key: string, message = advancedFieldMessage(key)): void => {
    errors.push({ id: key, fields: [key], message });
  };

  if (!isAnalystScc(v.scc)) {
    add('scc');
  } else if (AnalystSlotReservations.isReserved(v.scc)) {
    add('scc', reservedSccMessage(v.scc));
  }
  if (!['1', '2', '3', '4'].includes(v.type)) {
    add('type', errMsg('invalidType'));
  }
  if (!v.country) {
    add('country', errMsg('invalidCountry'));
  }
  if (!v.name || v.name.trim() === '') {
    add('name', errMsg('invalidName'));
  }
  if (!v.source || v.source.trim() === '') {
    add('src', errMsg('invalidSource'));
  }
  if (!/^\d{1,2}$/u.test(v.epochyr.trim())) {
    add('year');
  }
  if (!isInRange('day', v.epochday)) {
    add('day');
  }
  if (!isInRange('inc', v.inc)) {
    add('inc');
  }
  if (!isInRange('rasc', v.rasc)) {
    add('rasc');
  }
  if (!/^\d{1,7}$/u.test(v.ecen.trim())) {
    add('ecen');
  }
  if (!isInRange('argPe', v.argPe)) {
    add('argPe');
  }
  if (!isInRange('meana', v.meana)) {
    add('meana');
  }

  const meanmo = toNumber(v.meanmo);

  if (!(meanmo > 0 && meanmo <= MAX_MEAN_MOTION)) {
    add('meanmo');
  }
  if (!(toNumber(v.period) > 0)) {
    add('per');
  }

  return errors;
}

/**
 * Validate the Basic form. Every rule is checked (no early return) so the user
 * sees all problems from one submit.
 */
export function validateBasicFields(v: BasicInputValues): FormFieldError[] {
  const errors: FormFieldError[] = [];
  const inc = toNumber(v.inc);
  const apogee = toNumber(v.apogee);
  const perigee = toNumber(v.perigee);
  const numberRequired = (labelKey: string): string => errMsg('numberRequired').replace('{field}', label(labelKey));

  if (!isAnalystScc(v.scc)) {
    errors.push({ id: 'basic-scc', fields: ['basic-scc'], message: errMsg('invalidNoradId') });
  } else if (AnalystSlotReservations.isReserved(v.scc)) {
    errors.push({ id: 'basic-scc', fields: ['basic-scc'], message: reservedSccMessage(v.scc) });
  }
  if (!(inc >= 0 && inc <= 180)) {
    errors.push({ id: 'basic-inc', fields: ['basic-inc'], message: errMsg('inclinationRange') });
  }
  if (!Number.isFinite(apogee)) {
    errors.push({ id: 'basic-apogee', fields: ['basic-apogee'], message: numberRequired('apogeeAltKm') });
  }
  if (!Number.isFinite(perigee)) {
    errors.push({ id: 'basic-perigee', fields: ['basic-perigee'], message: numberRequired('perigeeAltKm') });
  } else if (perigee < 100) {
    errors.push({ id: 'basic-perigee', fields: ['basic-perigee'], message: errMsg('perigeeTooLow') });
  }
  if (Number.isFinite(apogee) && Number.isFinite(perigee) && apogee < perigee) {
    errors.push({ id: 'basic-apogee-order', fields: ['basic-apogee', 'basic-perigee'], message: errMsg('apogeeMustBeGtePerigee') });
  }

  return errors;
}

/** ootk ParseError wording ("Invalid inclination: 181") mapped to Advanced field ids. */
const OOTK_FIELD_PATTERNS: [RegExp, string][] = [
  [/invalid inclination/iu, 'inc'],
  [/invalid right ascension/iu, 'rasc'],
  [/invalid argument of perigee/iu, 'argPe'],
  [/invalid eccentricity/iu, 'ecen'],
  [/invalid mean anomaly/iu, 'meana'],
  [/invalid mean motion/iu, 'meanmo'],
  [/invalid epoch day/iu, 'day'],
  [/invalid epoch year/iu, 'year'],
];

/**
 * Translate an error thrown while composing or parsing the TLE into a field
 * error with the friendly range message, or null when it names no field.
 */
export function fieldErrorFromException(error: unknown): FormFieldError | null {
  const text = error instanceof Error ? error.message : String(error);
  const match = OOTK_FIELD_PATTERNS.find(([pattern]) => pattern.test(text));

  if (!match) {
    return null;
  }
  const key = match[1];

  return { id: key, fields: [key], message: advancedFieldMessage(key) };
}

/**
 * Shows a form's submit-time errors: all messages in one alert region plus
 * aria-invalid on each failing field. After a submit, typing into a field
 * re-checks only the errors already shown and removes each one once it is
 * fixed; it never adds new errors before the next submit.
 */
export class FormErrorReporter {
  private active_: FormFieldError[] = [];

  /**
   * @param prefix - Element-id prefix (e.g. 'createSat').
   * @param summaryId - Id of the alert region that lists the messages.
   * @param fieldKeys - Element-id suffixes this form owns.
   * @param evaluate - Re-reads the form and returns the current errors.
   */
  constructor(
    private readonly prefix: string,
    private readonly summaryId: string,
    private readonly fieldKeys: readonly string[],
    private readonly evaluate: () => FormFieldError[]
  ) {}

  /** Listen for edits on every owned field. Missing elements are skipped. */
  wire(): void {
    for (const key of this.fieldKeys) {
      const el = getEl(`${this.prefix}-${key}`, true);

      el?.addEventListener('input', () => this.refresh());
      el?.addEventListener('change', () => this.refresh());
    }
  }

  /** The errors currently on screen. */
  get errors(): readonly FormFieldError[] {
    return this.active_;
  }

  /** Replace the shown errors (an empty list clears the form). */
  report(errors: FormFieldError[]): void {
    this.active_ = errors;
    this.render_();
  }

  /** Drop every shown error that has been fixed; keep (and update) the rest. */
  refresh(): void {
    if (this.active_.length === 0) {
      return;
    }
    const current = this.evaluate();

    this.active_ = current.filter((error) => this.active_.some((shown) => shown.id === error.id));
    this.render_();
  }

  private render_(): void {
    const summary = getEl(this.summaryId, true);

    if (summary) {
      summary.replaceChildren(
        ...this.active_.map((error) => {
          const item = document.createElement('div');

          item.className = 'create-sat-error-item';
          item.textContent = error.message;

          return item;
        })
      );
      summary.hidden = this.active_.length === 0;
    }

    const flagged = new Set(this.active_.flatMap((error) => error.fields));

    for (const key of this.fieldKeys) {
      const el = getEl(`${this.prefix}-${key}`, true);

      if (!el) {
        continue;
      }
      const isInvalid = flagged.has(key);

      el.setAttribute('aria-invalid', String(isInvalid));
      if (isInvalid) {
        el.setAttribute('aria-describedby', this.summaryId);
      }
    }
  }
}
