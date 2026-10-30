import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { DraggableBox } from '@app/engine/ui/draggable-box';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, showEl } from '@app/engine/utils/get-el';
import { getTopChromeBottom } from '@app/engine/utils/top-chrome';
import { t7e } from '@app/locales/keys';
import { TooltipsPlugin } from '@app/plugins/tooltips/tooltips';
import cancelPng from '@public/img/icons/cancel.png';
import { LayersManager } from './layers-manager';
import './layers-popup-box.css';

/** Gap between the legend and the edge of the viewport, in CSS px. */
const EDGE_MARGIN_PX = 16;
/** Right-hand panels the legend must not cover; it docks to the left of whichever is showing. */
const RIGHT_PANEL_IDS = ['sat-infobox', 'search-results'];
/** The legend never shrinks below this height, even on a short screen (it scrolls instead). */
const MIN_LEGEND_HEIGHT_PX = 120;

export class LayersPopupBox extends DraggableBox {
  /** Where the user last left the box; reused on the next open instead of recentring. */
  private lastPosition_: { top: string; left: string } | null = null;

  constructor() {
    super('layers-popup-box', { title: t7e('layersManager.layers'), width: '325px' });
  }

  protected getBoxContentHtml(): string {
    return html`
      <div id="layers-hover-menu-popup">
      </div>
    `.trim();
  }

  open(cb?: () => void): void {
    super.open(cb);

    if (!this.boxEl) {
      return;
    }

    /*
     * The base box opens in the centre of the screen, which put the legend over the globe and
     * swallowed canvas clicks. Dock it in the top-right corner instead (or where it was dragged),
     * always below the top chrome (nav bar plus any docked strip such as the access timeline),
     * and left of the right-hand panels (#sat-infobox, #search-results) when they are showing.
     */
    const chromeBottom = getTopChromeBottom();
    const bottomMenuHeight = LayersPopupBox.readBottomMenuHeight_();
    let top: number;

    if (this.lastPosition_) {
      top = Math.max(chromeBottom + EDGE_MARGIN_PX, Number.parseFloat(this.lastPosition_.top) || 0);
      this.boxEl.style.left = this.lastPosition_.left;
    } else {
      const corner = LayersPopupBox.getCornerPosition(
        this.boxEl.offsetWidth,
        this.boxEl.offsetHeight,
        window.innerWidth,
        window.innerHeight,
        chromeBottom,
        LayersPopupBox.readRightPanelsLeft_()
      );

      top = corner.top;
      this.boxEl.style.left = `${corner.left}px`;
    }

    this.boxEl.style.top = `${top}px`;
    this.boxEl.style.maxHeight = `${LayersPopupBox.getMaxHeight(top, window.innerHeight, bottomMenuHeight)}px`;
    this.boxEl.style.overflowY = 'auto';
  }

  /**
   * Top-right corner placement, clamped so the box always stays on screen and never sits under
   * the top chrome (`topChromeBottom` is the chrome's bottom edge in viewport px). `rightEdge` is
   * the left edge of the right-hand panels when one is showing, so the box docks beside them.
   */
  static getCornerPosition(
    boxWidth: number,
    boxHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    topChromeBottom = 0,
    rightEdge = viewportWidth
  ): { top: number; left: number } {
    const left = Math.max(EDGE_MARGIN_PX, Math.min(viewportWidth, rightEdge) - boxWidth - EDGE_MARGIN_PX);
    const minTop = Math.round(topChromeBottom) + EDGE_MARGIN_PX;
    const maxTop = Math.max(minTop, viewportHeight - boxHeight - EDGE_MARGIN_PX);
    const top = Math.min(minTop, maxTop);

    return { top, left };
  }

  /** Tallest the legend may be when its top edge is at `top`, so it ends above the bottom menu. */
  static getMaxHeight(top: number, viewportHeight: number, bottomMenuHeight = 0): number {
    return Math.max(MIN_LEGEND_HEIGHT_PX, Math.floor(viewportHeight - bottomMenuHeight - EDGE_MARGIN_PX - top));
  }

  /** Leftmost edge of the visible right-hand panels, or the viewport width when none is showing. */
  private static readRightPanelsLeft_(): number {
    let left = window.innerWidth;

    for (const id of RIGHT_PANEL_IDS) {
      const el = getEl(id, true);
      const rect = el?.getBoundingClientRect();

      if (el && rect && rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden') {
        left = Math.min(left, rect.left);
      }
    }

    return left;
  }

  private static readBottomMenuHeight_(): number {
    const px = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bottom-menu-height'));

    return Number.isFinite(px) ? px : 0;
  }

  protected onOpen(): void {
    super.onOpen();

    this.decorateCloseButton_();

    LayersManager.change(settingsManager.currentLayer);

    showEl(getEl('layers-hover-menu-popup')!);

    getEl('layers-hover-menu-popup')?.addEventListener('click', (e: MouseEvent) => {
      const hoverMenuItemClass = (e.target as HTMLElement)?.classList[1];

      if (hoverMenuItemClass) {
        ServiceLocator.getUiManager().layersManager.layersHoverMenuClick(hoverMenuItemClass);
      }
    });
  }

  /** Turns the base box's bare dot into a labelled, keyboard-reachable close button. */
  private decorateCloseButton_(): void {
    const closeBtn = getEl(`${this.boxId}-close`, true);

    if (!closeBtn) {
      return;
    }

    const label = t7e('plugins.ColorMenu.legend.close');

    closeBtn.classList.add('layers-popup-box__close');
    closeBtn.setAttribute('role', 'button');
    closeBtn.setAttribute('tabindex', '0');
    closeBtn.setAttribute('aria-label', label);
    closeBtn.setAttribute('kt-tooltip', label);
    closeBtn.innerHTML = html`<span class="layers-popup-box__close-glyph" style="--layers-close-icon: url('${cancelPng}')"></span>`;
    closeBtn.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.close();
      }
    });

    // The tooltip plugin only scans the DOM once at boot; this box is built later.
    PluginRegistry.getPlugin(TooltipsPlugin)?.createTooltip(closeBtn);
  }

  close(cb?: () => void): void {
    if (this.boxEl && this.boxEl.style.display !== 'none') {
      this.lastPosition_ = { top: this.boxEl.style.top, left: this.boxEl.style.left };
    }

    super.close(cb);
    const layersMenuIconContainer = getEl('layers-menu-icon')!.parentElement!;

    layersMenuIconContainer.classList.remove('bmenu-item-selected');
    layersMenuIconContainer.classList.add('top-menu-icons__blue-img');
    ServiceLocator.getUiManager().layersManager.isLayersMenuOpen = false;
  }
}
