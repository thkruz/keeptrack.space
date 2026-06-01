import { setupStandardEnvironment } from '@test/environment/standard-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('draggabilly');

import { ModalConfirm } from '../modal-confirm';

const resetSingleton = (): void => {
  (ModalConfirm as unknown as { instance_: ModalConfirm | null }).instance_ = null;
};

const query = (sel: string): HTMLElement | null => document.querySelector(sel);

describe('ModalConfirm', () => {
  let modal: ModalConfirm;

  beforeEach(() => {
    resetSingleton();
    setupStandardEnvironment();
    modal = ModalConfirm.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a singleton instance', () => {
    expect(ModalConfirm.getInstance()).toBe(modal);
  });

  it('renders the message and confirm/cancel buttons when opened', () => {
    modal.open(vi.fn(), { message: 'Delete everything?', confirmText: 'Go', cancelText: 'Stop' });

    expect(query('.confirm-modal__message')!.textContent).toContain('Delete everything?');
    expect(query('#confirm-action-btn')!.textContent).toContain('Go');
    expect(query('#cancel-action-btn')!.textContent).toContain('Stop');
  });

  it('uses the destructive button styling when isDestructive is set', () => {
    modal.open(vi.fn(), { isDestructive: true });

    expect(query('#confirm-action-btn')!.className).toContain('confirm-modal__btn--destructive');
  });

  it('uses the primary button styling by default', () => {
    modal.open(vi.fn());

    expect(query('#confirm-action-btn')!.className).toContain('confirm-modal__btn--primary');
  });

  it('invokes the callback and closes when confirm is clicked', () => {
    const onConfirm = vi.fn();

    modal.open(onConfirm);
    (query('#confirm-action-btn') as HTMLButtonElement).click();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect((modal as unknown as { boxEl: HTMLElement }).boxEl.style.display).toBe('none');
  });

  it('closes without invoking the callback when cancel is clicked', () => {
    const onConfirm = vi.fn();

    modal.open(onConfirm);
    (query('#cancel-action-btn') as HTMLButtonElement).click();

    expect(onConfirm).not.toHaveBeenCalled();
    expect((modal as unknown as { boxEl: HTMLElement }).boxEl.style.display).toBe('none');
  });

  it('cancels on the Escape key while the modal is visible', () => {
    const onConfirm = vi.fn();

    modal.open(onConfirm);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect((modal as unknown as { boxEl: HTMLElement }).boxEl.style.display).toBe('none');
  });

  it('ignores non-Escape keys', () => {
    const onConfirm = vi.fn();

    modal.open(onConfirm);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect((modal as unknown as { boxEl: HTMLElement }).boxEl.style.display).not.toBe('none');
  });

  it('resets its callback and options after closing', () => {
    modal.open(vi.fn(), { message: 'something' });
    modal.close();

    const internal = modal as unknown as { onConfirm: unknown; options: Record<string, unknown> };

    expect(internal.onConfirm).toBeNull();
    expect(internal.options).toEqual({});
  });

  describe('convenience presets', () => {
    it('openLogoutConfirm sets logout copy and destructive styling', () => {
      modal.openLogoutConfirm(vi.fn());

      expect(query('.confirm-modal__message')!.textContent).toContain('logout');
      expect(query('#confirm-action-btn')!.textContent).toContain('Logout');
      expect(query('#confirm-action-btn')!.className).toContain('confirm-modal__btn--destructive');
    });

    it('openDeleteConfirm includes the item name in the message', () => {
      modal.openDeleteConfirm(vi.fn(), 'My Satellite');

      expect(query('.confirm-modal__message')!.textContent).toContain('My Satellite');
      expect(query('#confirm-action-btn')!.textContent).toContain('Delete');
    });

    it('openDeleteConfirm falls back to a generic message with no item name', () => {
      modal.openDeleteConfirm(vi.fn());

      expect(query('.confirm-modal__message')!.textContent).toContain('delete this item');
    });

    it('openClearConfirm names the data type being cleared', () => {
      modal.openClearConfirm(vi.fn(), 'watchlists');

      expect(query('.confirm-modal__message')!.textContent).toContain('watchlists');
      expect(query('#confirm-action-btn')!.textContent).toContain('Clear');
    });
  });
});
