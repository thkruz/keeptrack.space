import { SoundNames } from '@app/engine/audio/sounds';
import { ServiceLocator } from '../core/service-locator';
import { html } from '../utils/development/formatter';
import { DraggableModal } from './draggable-modal';

interface ConfirmModalOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  isDestructive?: boolean;
}

export class ModalConfirm extends DraggableModal {
  private static readonly id = 'modal-confirm';
  private static instance_: ModalConfirm | null = null;

  private onConfirm: (() => void) | null = null;
  private options: ConfirmModalOptions = {};
  /** Bound once so close() can actually remove the listener added by open(). */
  private readonly keyDownHandler_ = (event: KeyboardEvent): void => this.handleKeyDown(event);

  private constructor() {
    if (ModalConfirm.instance_) {
      throw new Error('Use getInstance() instead of new.');
    }

    super(ModalConfirm.id, {
      title: 'Confirm Action',
      width: '400px',
    });
  }

  static getInstance(): ModalConfirm {
    this.instance_ ??= new ModalConfirm();

    return this.instance_;
  }

  protected getModalContentHtml(): string {
    const { message = 'Do you really want to proceed with this action?', confirmText = 'Yes', cancelText = 'No', isDestructive = false } = this.options;

    return html`
      <div class="confirm-modal">
        <div class="confirm-modal__content">
          <p class="confirm-modal__message">${message}</p>
        </div>

        <div class="confirm-modal__actions">
          <button
            id="confirm-action-btn"
            type="button"
            class="confirm-modal__btn ${isDestructive ? 'confirm-modal__btn--destructive' : 'confirm-modal__btn--primary'}"
          >
            ${confirmText}
          </button>

          <button
            id="cancel-action-btn"
            type="button"
            class="confirm-modal__btn confirm-modal__btn--secondary"
          >
            ${cancelText}
          </button>
        </div>
      </div>
    `;
  }

  protected onOpen(): void {
    super.onOpen();
    this.initializeEventListeners();
  }

  protected override getInitialFocusElement_(): HTMLElement | null {
    return this.getElement('cancel-action-btn');
  }

  private initializeEventListeners(): void {
    const confirmButton = this.getElement('confirm-action-btn') as HTMLButtonElement;
    const cancelButton = this.getElement('cancel-action-btn') as HTMLButtonElement;

    if (cancelButton) {
      cancelButton.addEventListener('click', () => this.handleCancel());
    }

    if (confirmButton) {
      confirmButton.addEventListener('click', () => this.handleConfirm());
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.boxEl?.isConnected && this.boxEl.style.display !== 'none') {
      // Escape belongs to the confirm while it is up, not to menus or overlays underneath it.
      event.preventDefault();
      event.stopImmediatePropagation();
      this.handleCancel();
    }
  }

  /**
   * The DOM is only built on the first open, so every later open has to write
   * the caller's wording into it. Without this a logout confirm shown after a
   * "Overwrite saved search?" confirm kept the overwrite wording while its
   * button ran the logout callback.
   */
  private renderOptions_(): void {
    const { title = '', message = '', confirmText = '', cancelText = '', isDestructive = false } = this.options;
    const titleEl = this.boxEl?.querySelector('.draggable-box__title h3');
    const messageEl = this.boxEl?.querySelector('.confirm-modal__message');
    const confirmButton = this.getElement('confirm-action-btn');
    const cancelButton = this.getElement('cancel-action-btn');

    if (titleEl) {
      titleEl.innerHTML = title;
    }
    if (messageEl) {
      messageEl.innerHTML = message;
    }
    if (confirmButton) {
      confirmButton.textContent = confirmText;
      confirmButton.classList.toggle('confirm-modal__btn--destructive', isDestructive);
      confirmButton.classList.toggle('confirm-modal__btn--primary', !isDestructive);
    }
    if (cancelButton) {
      cancelButton.textContent = cancelText;
    }
  }

  private handleCancel(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    this.close();
  }

  private handleConfirm(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    if (this.onConfirm) {
      this.onConfirm();
    }

    this.close();
  }

  private getElement(id: string): HTMLElement | null {
    return this.boxEl?.querySelector(`#${id}`) || null;
  }

  /**
   * Opens the confirmation modal with custom options
   */
  open(onConfirm: () => void, options?: ConfirmModalOptions): void {
    this.onConfirm = onConfirm;
    this.options = {
      title: 'Are you sure?',
      message: 'Do you really want to proceed with this action?',
      confirmText: 'Yes',
      cancelText: 'No',
      isDestructive: false,
      ...options,
    };

    this.title = this.options.title ?? '';

    super.open();
    this.renderOptions_();

    // Capture phase so the confirm handles Escape before anything underneath it.
    document.removeEventListener('keydown', this.keyDownHandler_, true);
    document.addEventListener('keydown', this.keyDownHandler_, true);
  }

  /**
   * Convenience method for logout confirmation
   */
  openLogoutConfirm(onConfirm: () => void): void {
    this.open(onConfirm, {
      title: 'Confirm Logout',
      message: 'Are you sure you want to logout? You will need to sign in again to access your account.',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      isDestructive: true,
    });
  }

  /**
   * Convenience method for delete confirmation
   */
  openDeleteConfirm(onConfirm: () => void, itemName?: string): void {
    const message = itemName
      ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
      : 'Are you sure you want to delete this item? This action cannot be undone.';

    this.open(onConfirm, {
      title: 'Confirm Delete',
      message,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
    });
  }

  /**
   * Convenience method for clearing data confirmation
   */
  openClearConfirm(onConfirm: () => void, dataType: string = 'data'): void {
    this.open(onConfirm, {
      title: 'Confirm Clear',
      message: `Are you sure you want to clear all ${dataType}? This action cannot be undone.`,
      confirmText: 'Clear',
      cancelText: 'Cancel',
      isDestructive: true,
    });
  }

  close(): void {
    document.removeEventListener('keydown', this.keyDownHandler_, true);

    super.close();

    // Reset state
    this.onConfirm = null;
    this.options = {};
  }
}
