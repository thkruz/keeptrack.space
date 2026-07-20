import { getEl } from '@app/engine/utils/get-el';
import { ScenarioData } from './scenario-management';

/**
 * Validates a date input field against the format YYYY-MM-DD HH:MM:SS.sss.
 * Toggles valid/invalid CSS classes on the input element.
 */
export function validateDateInput(input: HTMLInputElement): boolean {
  const dateStr = input.value;
  const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/u;
  const isValid = regex.test(dateStr);

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
