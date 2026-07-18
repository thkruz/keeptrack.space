import { SoundNames } from '@app/engine/audio/sounds';
import { ServiceLocator } from '../core/service-locator';
import { html } from '../utils/development/formatter';
import { DraggableModal } from './draggable-modal';

interface InputModalOptions {
  title?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  submitText?: string;
  cancelText?: string;
}

export class ModalInput extends DraggableModal {
  private static readonly id = 'modal-input';
  private static instance_: ModalInput | null = null;

  private onSubmit_: ((value: string) => void) | null = null;
  private options_: InputModalOptions = {};

  private constructor() {
    if (ModalInput.instance_) {
      throw new Error('Use getInstance() instead of new.');
    }

    super(ModalInput.id, {
      title: 'Input',
      width: '400px',
    });
  }

  static getInstance(): ModalInput {
    this.instance_ ??= new ModalInput();

    return this.instance_;
  }

  protected getModalContentHtml(): string {
    const { label = '', placeholder = '', defaultValue = '', submitText = 'OK', cancelText = 'Cancel' } = this.options_;

    return html`
      <div class="input-modal">
        <div class="input-modal__content">
          ${label ? `<label class="input-modal__label" for="modal-input-field">${label}</label>` : ''}
          <input
            id="modal-input-field"
            type="text"
            class="input-modal__input keyboard-priority"
            placeholder="${placeholder}"
            value="${defaultValue}"
          />
        </div>

        <div class="confirm-modal__actions">
          <button
            id="modal-input-submit-btn"
            type="button"
            class="confirm-modal__btn confirm-modal__btn--primary"
          >
            ${submitText}
          </button>

          <button
            id="modal-input-cancel-btn"
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
    this.initializeEventListeners_();
  }

  private initializeEventListeners_(): void {
    const submitButton = this.getElement_('modal-input-submit-btn') as HTMLButtonElement;
    const cancelButton = this.getElement_('modal-input-cancel-btn') as HTMLButtonElement;
    const inputField = this.getElement_('modal-input-field') as HTMLInputElement;

    if (cancelButton) {
      cancelButton.addEventListener('click', () => this.handleCancel_());
    }

    if (submitButton) {
      submitButton.addEventListener('click', () => this.handleSubmit_());
    }

    if (inputField) {
      inputField.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleSubmit_();
        }
      });

      // Auto-focus and select all text
      requestAnimationFrame(() => {
        inputField.focus();
        inputField.select();
      });
    }

    document.addEventListener('keydown', this.handleKeyDown_);
  }

  private handleKeyDown_ = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.boxEl?.style.display !== 'none') {
      this.handleCancel_();
    }
  };

  private handleCancel_(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    this.close();
  }

  private handleSubmit_(): void {
    const inputField = this.getElement_('modal-input-field') as HTMLInputElement;
    const value = inputField?.value ?? '';

    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    if (this.onSubmit_) {
      this.onSubmit_(value);
    }

    this.close();
  }

  private getElement_(id: string): HTMLElement | null {
    return this.boxEl?.querySelector(`#${id}`) || null;
  }

  /**
   * Opens the input modal with custom options
   */
  prompt(onSubmit: (value: string) => void, options?: InputModalOptions): void {
    this.onSubmit_ = onSubmit;
    this.options_ = {
      title: 'Input',
      label: '',
      placeholder: '',
      defaultValue: '',
      submitText: 'OK',
      cancelText: 'Cancel',
      ...options,
    };

    if (options?.title) {
      this.title = options.title;
    }

    // Remove old DOM and force HTML regeneration with new options
    if (this.boxEl) {
      this.boxEl.remove();
      this.boxEl = null;
      this.draggie = null;
    }

    super.open();
  }

  close(): void {
    document.removeEventListener('keydown', this.handleKeyDown_);

    super.close();

    this.onSubmit_ = null;
    this.options_ = {};
  }
}
