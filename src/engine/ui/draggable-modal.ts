
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import Draggabilly from 'draggabilly';
import { html } from '../utils/development/formatter';
import { showEl } from '../utils/get-el';
import { DraggableBox } from './draggable-box';


export abstract class DraggableModal extends DraggableBox {
  protected abstract getModalContentHtml(): string;

  protected override onOpen(): void {
    super.onOpen();
    const modalContainer = getEl(`${this.boxId}-container`) as HTMLElement;

    if (modalContainer) {
      modalContainer.addEventListener('click', (e: MouseEvent) => {
        if (e.target === modalContainer) {
          this.close();
        }
      });
    }
  }

  override open(cb?: () => void) {
    if (!this.boxEl) {
      // Should it be KeepTrack.getInstance().containerRoot instead of document.body?
      document.body.insertAdjacentHTML('beforeend', html`
        <div id="${this.boxId}-container" class="modal" style="display:none;">
          <div id="${this.boxId}" class="draggable-box" style="pointer-events:auto;">
            <div class="draggable-box__title-bar">
              <div class="draggable-box__title">
                <h3 style="margin: 0;">${this.getBoxTitleHtml()}</h3>
              </div>
              <span id="${this.boxId}-close" class="draggable-box__btn draggable-box__close-btn"></span>
            </div>
            <div class="draggable-box__content">
              ${this.getBoxContentHtml()}
            </div>
          </div>
        </div>
      `);
      this.boxEl = getEl(`${this.boxId}-container`) as HTMLElement;
      this.initDraggabilly_();
      this.onOpen();
    }

    if (this.boxEl) {
      showEl(this.boxEl);
      const modalContent = getEl(`${this.boxId}`)!;

      if (this.width) {
        modalContent.style.width = this.width;
      }
      modalContent.style.top = `${(window.innerHeight - modalContent.offsetHeight) / 2}px`;
      modalContent.style.left = `${(window.innerWidth - modalContent.offsetWidth) / 2}px`;
      if (cb) {
        cb();
      }
    } else {
      errorManagerInstance.log(`Failed to open modal: ${this.boxId}`);
    }
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
