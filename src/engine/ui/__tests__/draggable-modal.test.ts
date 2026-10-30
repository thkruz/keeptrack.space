import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeyboardInput } from '@app/engine/input/input-manager/keyboard-input';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DraggableModal } from '../draggable-modal';
import { ModalConfirm } from '../modal-confirm';

vi.mock('draggabilly');

class InputDialog extends DraggableModal {
  constructor() {
    super('qa-input-dialog', { title: 'Input dialog' });
  }

  protected getModalContentHtml(): string {
    return '<input id="qa-dialog-input" /><button id="qa-dialog-action" type="button">Action</button>';
  }
}

describe('DraggableModal keyboard ownership', () => {
  let dialog: InputDialog;
  let confirm: ModalConfirm;
  let opener: HTMLButtonElement;

  beforeEach(() => {
    setupStandardEnvironment();
    (ModalConfirm as unknown as { instance_: ModalConfirm | null }).instance_ = null;
    confirm = ModalConfirm.getInstance();
    dialog = new InputDialog();
    opener = document.createElement('button');
    opener.id = 'createSat-basic-submit';
    document.body.append(opener);
    opener.focus();
    new KeyboardInput().init();
  });

  afterEach(() => {
    confirm.close();
    dialog.close();
    vi.restoreAllMocks();
  });

  it('initially focuses Cancel and real Tab stays in confirmation instead of its opener', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onConfirm = vi.fn();

    confirm.open(onConfirm);
    expect(document.activeElement?.id).toBe('cancel-action-btn');
    expect(document.getElementById('modal-confirm')?.getAttribute('role')).toBe('dialog');
    expect(document.getElementById('modal-confirm')?.getAttribute('aria-modal')).toBe('true');
    for (let count = 0; count < 8; count++) {
      // biome-ignore lint/performance/noAwaitInLoops: Sequential Tab presses reproduce focus traversal.
      await user.tab();
      expect(document.getElementById('modal-confirm')?.contains(document.activeElement)).toBe(true);
    }
    await user.tab({ shift: true });
    expect(document.getElementById('modal-confirm')?.contains(document.activeElement)).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('activates focused confirmation with Enter once and restores the opener', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onConfirm = vi.fn();
    const underlyingClick = vi.fn();
    const leakedRelease = vi.fn();

    EventBus.getInstance().on(EventBusEvent.KeyUp, leakedRelease);
    opener.addEventListener('click', underlyingClick);
    confirm.open(onConfirm);
    document.getElementById('confirm-action-btn')!.focus();
    await user.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(underlyingClick).not.toHaveBeenCalled();
    expect(leakedRelease).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  it('preserves input Enter handlers and contains app keydown and keyup shortcuts', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const leakedDown = vi.fn();
    const leakedUp = vi.fn();
    const entered = vi.fn();

    EventBus.getInstance().on(EventBusEvent.KeyDown, leakedDown);
    EventBus.getInstance().on(EventBusEvent.KeyUp, leakedUp);
    dialog.open();
    const input = document.getElementById('qa-dialog-input')!;

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        entered();
      }
    });
    input.focus();
    await user.keyboard('9{Enter}');
    expect(entered).toHaveBeenCalledOnce();
    expect(leakedDown).not.toHaveBeenCalled();
    expect(leakedUp).not.toHaveBeenCalled();
  });

  it('contains nested modal focus, closes only the top dialog, and restores its parent input', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    dialog.open();
    const input = document.getElementById('qa-dialog-input')!;

    input.focus();
    confirm.open(vi.fn());
    await user.tab();
    expect(document.getElementById('modal-confirm')?.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    expect(document.getElementById('modal-confirm-container')?.style.display).toBe('none');
    expect(document.getElementById('qa-input-dialog-container')?.style.display).not.toBe('none');
    expect(document.activeElement).toBe(input);
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(opener);
  });

  it('redirects programmatic outside focus and stops outside-target shortcuts', () => {
    const leaked = vi.fn();

    confirm.open(vi.fn());
    opener.focus();
    expect(document.getElementById('modal-confirm')?.contains(document.activeElement)).toBe(true);
    window.addEventListener('keydown', leaked);
    opener.dispatchEvent(new KeyboardEvent('keydown', { key: '9', bubbles: true, cancelable: true }));
    expect(leaked).not.toHaveBeenCalled();
    window.removeEventListener('keydown', leaked);
  });
});
