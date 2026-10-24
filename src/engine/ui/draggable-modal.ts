import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import Draggabilly from 'draggabilly';
import { ServiceLocator } from '../core/service-locator';
import { html } from '../utils/development/formatter';
import { showEl } from '../utils/get-el';
import { DraggableBox } from './draggable-box';

export abstract class DraggableModal extends DraggableBox {
  private returnFocus_: HTMLElement | null = null;
  private readonly pressedKeys_ = new Set<string>();
  private readonly onKeyDown_ = (event: KeyboardEvent): void => {
    if (!this.ownsInteraction_()) {
      return;
    }
    this.pressedKeys_.add(event.key);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.close();

      return;
    }
    if (event.key === 'Tab') {
      const focusable = this.focusableElements_();
      const index = focusable.indexOf(document.activeElement as HTMLElement);
      const next = index < 0 ? 0 : (index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;

      event.preventDefault();
      event.stopImmediatePropagation();
      (focusable[next] ?? getEl(this.boxId))?.focus();

      return;
    }
    if (!this.boxEl?.contains(event.target as Node)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.getInitialFocusElement_()?.focus();
    }
  };
  private readonly onKeyUp_ = (event: KeyboardEvent): void => {
    if (this.pressedKeys_.delete(event.key) || this.ownsInteraction_()) {
      event.stopImmediatePropagation();
    }
    if (this.boxEl?.style.display === 'none' && this.pressedKeys_.size === 0) {
      window.removeEventListener('keyup', this.onKeyUp_, true);
      window.removeEventListener('blur', this.onBlur_);
    }
  };
  private readonly onBlur_ = (): void => {
    this.pressedKeys_.clear();
    if (this.boxEl?.style.display === 'none') {
      window.removeEventListener('keyup', this.onKeyUp_, true);
      window.removeEventListener('blur', this.onBlur_);
    }
  };
  private readonly onFocusIn_ = (event: FocusEvent): void => {
    if (this.ownsInteraction_() && !this.boxEl?.contains(event.target as Node)) {
      this.getInitialFocusElement_()?.focus();
    }
  };

  protected abstract getModalContentHtml(): string;

  protected getInitialFocusElement_(): HTMLElement | null {
    const focusable = this.focusableElements_();

    return (
      focusable.find((element) => element.hasAttribute('autofocus')) ??
      focusable.find((element) => element.closest('.draggable-box__content') && element.matches('input, select, textarea')) ??
      focusable[0] ??
      getEl(this.boxId, true)
    );
  }

  private focusableElements_(): HTMLElement[] {
    return Array.from(this.boxEl?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]') ?? []).filter((element) => {
      if (element.tabIndex < 0 || (element as HTMLButtonElement).disabled || element.closest('[hidden], [inert]')) {
        return false;
      }
      for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);

        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
      }

      return true;
    });
  }

  private ownsInteraction_(): boolean {
    if (!this.boxEl?.isConnected || this.boxEl.style.display === 'none') {
      return false;
    }
    if (getEl('help-outer-container', true)?.style.display === 'block') {
      return false;
    }
    const visible = Array.from(document.querySelectorAll<HTMLElement>('.draggable-modal-overlay')).filter((element) => element.style.display !== 'none');

    visible.sort(
      (left, right) =>
        Number.parseInt(left.style.zIndex || getComputedStyle(left).zIndex || '0', 10) - Number.parseInt(right.style.zIndex || getComputedStyle(right).zIndex || '0', 10)
    );

    return visible.at(-1) === this.boxEl;
  }

  protected override onOpen(): void {
    super.onOpen();
    const modalContainer = getEl(`${this.boxId}-container`) as HTMLElement;

    if (modalContainer) {
      // Run after target input/button handlers, preserving native Enter and
      // text editing while keeping application shortcuts below the dialog out.
      for (const type of ['keydown', 'keyup']) {
        modalContainer.addEventListener(type, (event) => event.stopPropagation());
      }
      modalContainer.addEventListener('click', (e: MouseEvent) => {
        if (e.target === modalContainer) {
          this.close();
        }
      });
    }
  }

  override open(cb?: () => void) {
    if (!this.boxEl || this.boxEl.style.display === 'none') {
      this.returnFocus_ = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    if (!this.boxEl) {
      // Should it be KeepTrack.getInstance().containerRoot instead of document.body?
      document.body.insertAdjacentHTML(
        'beforeend',
        html`
        <div id="${this.boxId}-container" class="draggable-modal-overlay" style="display:none;">
          <div id="${this.boxId}" class="draggable-box" role="dialog" aria-modal="true" aria-labelledby="${this.boxId}-title" tabindex="-1" style="pointer-events:auto;">
            <div class="draggable-box__title-bar">
              <div class="draggable-box__title">
                <h3 id="${this.boxId}-title" style="margin: 0;">${this.getBoxTitleHtml()}</h3>
              </div>
              <button type="button" id="${this.boxId}-close" aria-label="${t7e('plugins.OnboardingPlugin.hub.close')}" class="draggable-box__btn draggable-box__close-btn" style="padding:0;"></button>
            </div>
            <div class="draggable-box__content">
              ${this.getBoxContentHtml()}
            </div>
          </div>
        </div>
      `
      );
      this.boxEl = getEl(`${this.boxId}-container`) as HTMLElement;
      this.initDraggabilly_();
      this.onOpen();
    }

    if (this.boxEl) {
      showEl(this.boxEl);
      this.raiseAboveOtherModals_();
      const modalContent = getEl(`${this.boxId}`)!;

      if (this.width) {
        modalContent.style.width = this.width;
      }
      modalContent.style.top = `${(window.innerHeight - modalContent.offsetHeight) / 2}px`;
      modalContent.style.left = `${(window.innerWidth - modalContent.offsetWidth) / 2}px`;
      if (cb) {
        cb();
      }
      ServiceLocator.getInputManager()?.keyboard?.keyStates.clear();
      window.addEventListener('keydown', this.onKeyDown_, true);
      window.addEventListener('keyup', this.onKeyUp_, true);
      window.addEventListener('focusin', this.onFocusIn_, true);
      window.addEventListener('blur', this.onBlur_);
      this.getInitialFocusElement_()?.focus();
    } else {
      errorManagerInstance.log(`Failed to open modal: ${this.boxId}`);
    }
  }

  override close(cb?: () => void): void {
    window.removeEventListener('keydown', this.onKeyDown_, true);
    window.removeEventListener('focusin', this.onFocusIn_, true);
    if (this.pressedKeys_.size === 0) {
      window.removeEventListener('keyup', this.onKeyUp_, true);
      window.removeEventListener('blur', this.onBlur_);
    }
    const returnTo = this.returnFocus_;

    this.returnFocus_ = null;
    super.close(cb);
    if (returnTo?.isConnected && returnTo !== document.body) {
      returnTo.focus();
    }
  }

  /**
   * Every modal overlay shares the same CSS z-index, so DOM order decided which
   * one won: a modal built earlier (e.g. the shared confirm) opened from inside
   * one built later (e.g. the profile) rendered behind it. The modal opened most
   * recently always goes on top of every other visible overlay.
   */
  private raiseAboveOtherModals_(): void {
    if (!this.boxEl) {
      return;
    }

    let maxZ = 0;

    for (const overlay of Array.from(document.querySelectorAll<HTMLElement>('.draggable-modal-overlay'))) {
      if (overlay === this.boxEl || overlay.style.display === 'none') {
        continue;
      }
      const z = Number.parseInt(overlay.style.zIndex || getComputedStyle(overlay).zIndex, 10);

      if (Number.isFinite(z) && z > maxZ) {
        maxZ = z;
      }
    }

    this.boxEl.style.zIndex = maxZ > 0 ? (maxZ + 1).toString() : '';
  }

  protected initDraggabilly_() {
    const boxContent = getEl(`${this.boxId}`);

    if (boxContent && !this.draggie) {
      this.draggie = new Draggabilly(boxContent, {
        containment: getEl(`${this.boxId}-container`)!,
      });

      boxContent.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.button === 2) {
          boxContent.style.top = `${(window.innerHeight - boxContent.offsetHeight) / 2}px`;
          boxContent.style.left = `${(window.innerWidth - boxContent.offsetWidth) / 2}px`;
        }
      });
    }
  }

  // getBoxContentHtml delegates to getModalContentHtml for modal
  protected override getBoxContentHtml(): string {
    return this.getModalContentHtml();
  }
}
