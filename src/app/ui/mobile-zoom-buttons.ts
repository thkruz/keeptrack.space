import { ServiceLocator } from '@app/engine/core/service-locator';
import { t7e } from '@app/locales/keys';
import './mobile-zoom-buttons.css';

/**
 * On-screen zoom in / zoom out buttons for the phone layout (pro issue #173).
 * Desktop keeps wheel and keyboard zoom; this is only created when mobile mode is on.
 */
export class MobileZoomButtons {
  static readonly CONTAINER_ID = 'mobile-zoom-buttons';

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
    (document.getElementById('keeptrack-root') ?? document.body).appendChild(container);
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
