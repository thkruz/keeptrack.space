import { triggerSubmit } from '@app/engine/utils/trigger-submit';
import { vi } from 'vitest';

describe('triggerSubmit', () => {
  it('runs the native submit handlers that plugins wire (right-click "Create Sensor Here")', () => {
    const form = document.createElement('form');
    const onSubmit = vi.fn((e: Event) => e.preventDefault());

    document.body.appendChild(form);
    form.addEventListener('submit', onSubmit);

    triggerSubmit(form);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].defaultPrevented).toBe(true);
    form.remove();
  });

  it('bubbles so a delegated listener on an ancestor also sees it', () => {
    const wrapper = document.createElement('div');
    const form = document.createElement('form');
    const onSubmit = vi.fn();

    wrapper.appendChild(form);
    wrapper.addEventListener('submit', onSubmit);
    triggerSubmit(form);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('ignores a missing form', () => {
    expect(() => triggerSubmit(null)).not.toThrow();
  });
});
