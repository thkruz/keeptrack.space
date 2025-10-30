import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, showEl } from '@app/engine/utils/get-el';
import { SoundNames } from '@app/plugins/sounds/sounds';
import Draggabilly from 'draggabilly';
import { html } from '../utils/development/formatter';
import './engine-ui.css';
import { ServiceLocator } from '../core/service-locator';

interface DraggableBoxOptions {
  width?: string;
  title?: string;
  isDockable?: boolean;
}

export abstract class DraggableBox {
  protected boxId: string;
  protected boxEl: HTMLElement | null = null;
  protected draggie: Draggabilly | null = null;
  protected width: string | null = null;
  protected title: string = '';
  private static zIndexCounter_ = 10000;
  protected isDockable = false;

  static getMaxZIndex(): number {
    return this.zIndexCounter_;
  }

  static increaseMaxZIndex(): number {
    this.zIndexCounter_ += 1;

    return this.zIndexCounter_;
  }

  constructor(boxId: string, opts?: DraggableBoxOptions) {
    this.boxId = boxId;
    this.title = opts?.title ?? '';
    this.width = opts?.width ?? '300px';
    this.isDockable = opts?.isDockable ?? false;
  }

  protected abstract getBoxContentHtml(): string;

  protected onOpen(): void {
    getEl(`${this.boxId}-close`)!.addEventListener('click', () => this.close());

    if (this.isDockable) {
      getEl(`${this.boxId}-dock`)!.addEventListener('click', () => this.dock());
    }

    this.sendToFront();
  }

  open(cb?: () => void) {
    if (!this.boxEl) {
      getEl('canvas-holder')!.insertAdjacentHTML('beforeend', html`
        <div id="${this.boxId}" class="draggable-box" style="pointer-events:auto;">
          <div class="draggable-box__title-bar">
            <div class="draggable-box__title">
              <span>
                ${this.getBoxTitleHtml()}
              </span>
            </div>
            ${this.isDockable ? `<span id="${this.boxId}-dock" class="draggable-box__btn draggable-box__dock-btn"></span>` : ''}
            <span id="${this.boxId}-close" class="draggable-box__btn draggable-box__close-btn"></span>
          </div>
          <div class="draggable-box__content">
            ${this.getBoxContentHtml()}
          </div>
        </div>
      `);
      this.boxEl = getEl(this.boxId) as HTMLElement;
      this.initDraggabilly_();
      this.onOpen();
    }

    if (this.boxEl) {
      showEl(this.boxEl);
      const boxContent = getEl(`${this.boxId}`)!;

      if (this.width) {
        boxContent.style.width = this.width;
      }

      if (cb) {
        cb();
      }

      // Center the box after cb to ensure correct offsetHeight/offsetWidth
      boxContent.style.top = `${(window.innerHeight - boxContent.offsetHeight) / 2}px`;
      boxContent.style.left = `${(window.innerWidth - boxContent.offsetWidth) / 2}px`;
      this.sendToFront();
    } else {
      errorManagerInstance.log(`Failed to open box: ${this.boxId}`);
    }
  }

  protected getBoxTitleHtml(): string {
    return this.title;
  }

  protected initDraggabilly_() {
    const boxContent = getEl(`${this.boxId}`);

    if (boxContent && !this.draggie) {
      this.draggie = new Draggabilly(boxContent, {
        containment: getEl('canvas-holder')!,
      });
      this.draggie.on('dragStart', () => {
        boxContent.style.height = 'fit-content';
        boxContent.style.maxHeight = '80%';
      });
      this.draggie.on('pointerDown', () => {
        this.sendToFront();
      });
      boxContent.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.button === 2) {
          boxContent.style.top = `${(window.innerHeight - boxContent.offsetHeight) / 2}px`;
          boxContent.style.left = `${(window.innerWidth - boxContent.offsetWidth) / 2}px`;
          this.sendToFront();
        }
      });
    }
  }

  private sendToFront() {
    getEl(`${this.boxId}`)!.style.zIndex = DraggableBox.increaseMaxZIndex().toString();
  }

  close(cb?: () => void) {
    if (this.boxEl) {
      this.boxEl.style.display = 'none';
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      if (cb) {
        cb();
      }
    }
  }

  dock(cb?: () => void) {
    if (this.boxEl) {
      this.boxEl.style.display = 'none';
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      if (cb) {
        cb();
      }
    }
  }
}
