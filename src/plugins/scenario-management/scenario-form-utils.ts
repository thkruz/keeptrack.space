import { getEl } from '@app/engine/utils/get-el';
import { ScenarioData } from './scenario-management';

/**
 * True when the text is YYYY-MM-DD HH:MM:SS(.sss) AND names a real UTC calendar
 * date and time (month 1-12, a day that exists in that month, 00-23:00-59:00-59).
 * A pattern match alone would accept "2026-13-45 99:99:99".
 */
export function isValidScenarioDateString(dateStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?$/u.exec(dateStr);

  if (!match) {
    return false;
  }

  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);

  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) {
    return false;
  }

  // Day 0 of the next month is the last day of this month (handles leap years).
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return day <= daysInMonth;
}

/**
 * Validates a date input field: format YYYY-MM-DD HH:MM:SS.sss and a real
 * calendar date. Toggles valid/invalid CSS classes on the input element.
 */
export function validateDateInput(input: HTMLInputElement): boolean {
  const isValid = isValidScenarioDateString(input.value);

  if (!isValid) {
    input.classList.remove('valid');
    input.classList.add('invalid');
  } else {
    input.classList.remove('invalid');
    input.classList.add('valid');
  }

  return isValid;
}

/**
 * Syncs side-menu form fields with the current scenario data.
 * Tolerates missing DOM elements (menu may not be open).
 */
export function syncFormFields(formPrefix: string, scenario: ScenarioData): void {
  const nameEl = getEl(`${formPrefix}-name`, true) as HTMLInputElement | null;

  if (nameEl) {
    nameEl.value = scenario.name;
  }

  const descEl = getEl(`${formPrefix}-description`, true) as HTMLInputElement | null;

  if (descEl) {
    descEl.value = scenario.description;
  }

  const startEl = getEl(`${formPrefix}-start-date`, true) as HTMLInputElement | null;

  if (startEl) {
    startEl.value = scenario.startTime ? scenario.startTime.toISOString().replace('T', ' ').replace('Z', '') : '';
  }

  const endEl = getEl(`${formPrefix}-end-date`, true) as HTMLInputElement | null;

  if (endEl) {
    endEl.value = scenario.endTime ? scenario.endTime.toISOString().replace('T', ' ').replace('Z', '') : '';
  }
}
