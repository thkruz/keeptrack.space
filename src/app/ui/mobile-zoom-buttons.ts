import { ServiceLocator } from '@app/engine/core/service-locator';
import { t7e } from '@app/locales/keys';
import './mobile-zoom-buttons.css';

/**
 * On-screen zoom in / zoom out buttons for the phone layout (pro issue #173).
 * Desktop keeps wheel and keyboard zoom; this is only created when mobile mode is on.
 */
export class MobileZoomButtons {
  static readonly CONTAINER_ID = 'mobile-zoom-buttons';
  static readonly HIDDEN_CLASS = 'mobile-zoom-hidden';

  static init(): void {
    if (!settingsManager.isMobileModeEnabled || document.getElementById(MobileZoomButtons.CONTAINER_ID)) {
      return;
    }

    const container = document.createElement('div');

    container.id = MobileZoomButtons.CONTAINER_ID;
    container.append(
      MobileZoomButtons.makeButton_('mobile-zoom-in', '+', t7e('mobileZoom.zoomIn'), () => ServiceLocator.getMainCamera().zoomIn()),
      MobileZoomButtons.makeButton_('mobile-zoom-out', '\u2212', t7e('mobileZoom.zoomOut'), () => ServiceLocator.getMainCamera().zoomOut())
    );
    const root = document.getElementById('keeptrack-root') ?? document.body;

    root.appendChild(container);
    MobileZoomButtons.watchSideMenus_(root, container);
  }

  /**
   * Pro issue #182: the buttons sit at the right edge and covered form fields in long panes.
   * Hide them while any side menu is open. Plugins open/close menus by setting inline
   * `display` on `.side-menu-parent` (slide helpers), so watch style/class changes.
   */
  private static watchSideMenus_(root: HTMLElement, container: HTMLElement): void {
    const sync = () => container.classList.toggle(MobileZoomButtons.HIDDEN_CLASS, MobileZoomButtons.isSideMenuOpen_());

    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['style', 'class'], subtree: true });
    sync();
  }

  private static isSideMenuOpen_(): boolean {
    return Array.from(document.querySelectorAll<HTMLElement>('.side-menu-parent')).some((el) => el.style.display === 'block' && !MobileZoomButtons.isSlidOut_(el));
  }

  /** `slideOutLeft` closes a menu by translating it off-screen and leaves `display:block`, so a non-zero translate means closed. */
  private static isSlidOut_(el: HTMLElement): boolean {
    const match = /translate[XY]\((-?[\d.]+)/u.exec(el.style.transform);

    return match !== null && Number(match[1]) !== 0;
  }

  private static makeButton_(id: string, glyph: string, label: string, onPress: () => void): HTMLButtonElement {
    const btn = document.createElement('button');

    btn.id = id;
    btn.type = 'button';
    btn.textContent = glyph;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', (evt) => {
      evt.stopPropagation();
      onPress();
    });

    return btn;
  }
}
