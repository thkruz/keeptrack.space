import { DraggableBox } from '@app/engine/ui/draggable-box';
import { getEl, showEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { LayersManager } from './layers-manager';
import { html } from '@app/engine/utils/development/formatter';


export class LayersPopupBox extends DraggableBox {
  constructor() {
    super('layers-popup-box', { title: 'Layers', width: '325px' });
  }

  protected getBoxContentHtml(): string {
    return html`
      <div id="layers-hover-menu-popup">
      </div>
    `.trim();
  }

  protected onOpen(): void {
    super.onOpen();

    LayersManager.change(settingsManager.currentLayer);

    showEl(getEl('layers-hover-menu-popup')!);

    getEl('layers-hover-menu-popup')?.addEventListener('click', (e: MouseEvent) => {
      const hoverMenuItemClass = (e.target as HTMLElement)?.classList[1];

      if (hoverMenuItemClass) {
        keepTrackApi.getUiManager().layersManager.layersHoverMenuClick(hoverMenuItemClass);
      }
    });
  }

  close(cb?: () => void): void {
    super.close(cb);
    keepTrackApi.getUiManager().layersManager.isLayersMenuOpen = false;
  }
}
