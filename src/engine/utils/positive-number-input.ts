import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';

/**
 * Read a settings text field that must hold a number greater than zero.
 *
 * On a valid entry it returns the number. On anything else (empty, non-numeric such as "12abc", zero, negative,
 * Infinity) it shows `invalidMsg` as a caution toast, writes `previous` back into the field and returns null, so the
 * caller keeps its old value and skips the recalculation.
 * @param input The settings field.
 * @param previous The value currently in use; restored into the field on a bad entry.
 * @param invalidMsg The translated toast text.
 * @returns The new value, or null when the entry was rejected.
 */
export function readPositiveNumberInput(input: HTMLInputElement, previous: number, invalidMsg: string): number | null {
  const raw = input.value.trim();
  const value = raw === '' ? Number.NaN : Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    ServiceLocator.getUiManager().toast(invalidMsg, ToastMsgType.caution);
    input.value = previous.toString();

    return null;
  }

  return value;
}
