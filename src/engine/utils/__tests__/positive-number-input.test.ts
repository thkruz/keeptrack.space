import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { readPositiveNumberInput } from '@app/engine/utils/positive-number-input';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('readPositiveNumberInput', () => {
  let input: HTMLInputElement;

  beforeEach(() => {
    setupStandardEnvironment();
    input = document.createElement('input');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['24', '0.5', ' 30 ', '1e2'])('accepts %s', (value) => {
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

    input.value = value;

    expect(readPositiveNumberInput(input, 7, 'bad')).toBe(Number(value));
    expect(toast).not.toHaveBeenCalled();
  });

  it.each(['0', '-5', 'abc', '12abc', '', 'Infinity'])('rejects %j with a toast and restores the previous value', (value) => {
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

    input.value = value;

    expect(readPositiveNumberInput(input, 7, 'Must be positive')).toBeNull();
    expect(toast).toHaveBeenCalledWith('Must be positive', ToastMsgType.caution);
    expect(input.value).toBe('7');
  });
});
