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

describe('ModalConfirm reuse across callers', () => {
  beforeEach(() => {
    resetSingleton();
    setupStandardEnvironment();
  });

  it('shows the second caller wording, not the first, on a later open', () => {
    const modal = ModalConfirm.getInstance();
    const onOverwrite = vi.fn();
    const onLogout = vi.fn();

    modal.open(onOverwrite, { title: 'Overwrite saved search?', message: 'Replace it?', confirmText: 'Overwrite', cancelText: 'Cancel', isDestructive: true });
    (query('#cancel-action-btn') as HTMLButtonElement).click();

    modal.open(onLogout, { title: 'Confirm Logout', message: 'Log out now?', confirmText: 'Logout', cancelText: 'Stay', isDestructive: false });

    expect(query('#modal-confirm .draggable-box__title h3')!.textContent).toBe('Confirm Logout');
    expect(query('.confirm-modal__message')!.textContent).toBe('Log out now?');
    expect(query('#confirm-action-btn')!.textContent).toBe('Logout');
    expect(query('#cancel-action-btn')!.textContent).toBe('Stay');
    expect(query('#confirm-action-btn')!.className).toContain('confirm-modal__btn--primary');
    expect(query('#confirm-action-btn')!.className).not.toContain('confirm-modal__btn--destructive');

    (query('#confirm-action-btn') as HTMLButtonElement).click();
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onOverwrite).not.toHaveBeenCalled();
  });

  it('opens above another modal overlay that is already visible', () => {
    const other = document.createElement('div');

    other.className = 'draggable-modal-overlay';
    other.style.zIndex = '1000';
    document.body.appendChild(other);

    ModalConfirm.getInstance().open(vi.fn());

    expect(Number(query('#modal-confirm-container')!.style.zIndex)).toBeGreaterThan(1000);
  });

  it('closes on Escape after several opens, and Escape only cancels once per open', () => {
    const modal = ModalConfirm.getInstance();
    const first = vi.fn();
    const second = vi.fn();

    modal.open(first);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    modal.open(second);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect((modal as unknown as { boxEl: HTMLElement }).boxEl.style.display).toBe('none');
  });
});
