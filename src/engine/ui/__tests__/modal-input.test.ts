import { setupStandardEnvironment } from '@test/environment/standard-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('draggabilly');

import { ModalInput } from '../modal-input';

const resetSingleton = (): void => {
  (ModalInput as unknown as { instance_: ModalInput | null }).instance_ = null;
};

const query = <T extends HTMLElement>(sel: string): T => document.querySelector(sel) as T;
const boxEl = (modal: ModalInput): HTMLElement => (modal as unknown as { boxEl: HTMLElement }).boxEl;

describe('ModalInput', () => {
  let modal: ModalInput;

  beforeEach(() => {
    resetSingleton();
    setupStandardEnvironment();
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    modal = ModalInput.getInstance();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns a singleton instance', () => {
    expect(ModalInput.getInstance()).toBe(modal);
  });

  it('renders the label, placeholder, default value and buttons', () => {
    modal.prompt(vi.fn(), {
      label: 'Name',
      placeholder: 'Type here',
      defaultValue: 'Hubble',
      submitText: 'Save',
      cancelText: 'Back',
    });

    const input = query<HTMLInputElement>('#modal-input-field');

    expect(query('.input-modal__label').textContent).toContain('Name');
    expect(input.getAttribute('placeholder')).toBe('Type here');
    expect(input.getAttribute('value')).toBe('Hubble');
    expect(query('#modal-input-submit-btn').textContent).toContain('Save');
    expect(query('#modal-input-cancel-btn').textContent).toContain('Back');
  });

  it('omits the label element when no label is supplied', () => {
    modal.prompt(vi.fn());

    expect(document.querySelector('.input-modal__label')).toBeNull();
  });

  it('submits the current input value and closes', () => {
    const onSubmit = vi.fn();

    modal.prompt(onSubmit);
    query<HTMLInputElement>('#modal-input-field').value = 'typed value';
    query<HTMLButtonElement>('#modal-input-submit-btn').click();

    expect(onSubmit).toHaveBeenCalledWith('typed value');
    expect(boxEl(modal).style.display).toBe('none');
  });

  it('submits when Enter is pressed inside the input field', () => {
    const onSubmit = vi.fn();

    modal.prompt(onSubmit);
    const input = query<HTMLInputElement>('#modal-input-field');

    input.value = 'enter value';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(onSubmit).toHaveBeenCalledWith('enter value');
  });

  it('closes without submitting when cancel is clicked', () => {
    const onSubmit = vi.fn();

    modal.prompt(onSubmit);
    query<HTMLButtonElement>('#modal-input-cancel-btn').click();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(boxEl(modal).style.display).toBe('none');
  });

  it('cancels on the Escape key while visible', () => {
    const onSubmit = vi.fn();

    modal.prompt(onSubmit);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(boxEl(modal).style.display).toBe('none');
  });

  it('regenerates the DOM with fresh options on a second prompt', () => {
    modal.prompt(vi.fn(), { defaultValue: 'first' });
    expect(query<HTMLInputElement>('#modal-input-field').getAttribute('value')).toBe('first');

    modal.prompt(vi.fn(), { defaultValue: 'second' });
    expect(query<HTMLInputElement>('#modal-input-field').getAttribute('value')).toBe('second');
  });

  it('resets its callback and options after closing', () => {
    modal.prompt(vi.fn(), { label: 'x' });
    modal.close();

    const internal = modal as unknown as { onSubmit_: unknown; options_: Record<string, unknown> };

    expect(internal.onSubmit_).toBeNull();
    expect(internal.options_).toEqual({});
  });
});
