/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * screenshots.ts is a plugin that allows users to take high-resolution screenshots
 * of the canvas with optional logos and classification text overlaid.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General License for more details.
 *
 * You should have received a copy of the GNU Affero General License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { Classification } from '@app/app/ui/classification';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ICommandPaletteCommand, IContextMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { KeepTrack } from '@app/keeptrack';
import { t7e } from '@app/locales/keys';
import cameraPng from '@public/img/icons/camera.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';

export class Screenshot extends KeepTrackPlugin {
  readonly id = 'Screenshot';
  dependencies_ = [];

  private t_(key: string): string {
    return t7e(`plugins.Screenshot.${key}` as Parameters<typeof t7e>[0]);
  }

  bottomIconCallback = () => {
    this.saveHiResPhoto('4k');
  };

  logo: HTMLImageElement;
  secondaryLogo: HTMLImageElement;

  constructor() {
    super();
    try {
      this.logo = new Image();
      this.logo.onerror = () => {
        errorManagerInstance.warn('Failed to load primary logo image.');
      };
      this.logo.src = `${settingsManager.installDirectory}img/logo-primary.png`;

      if (settingsManager.isShowSecondaryLogo) {
        this.secondaryLogo = new Image();
        this.secondaryLogo.onerror = () => {
          errorManagerInstance.warn('Failed to load secondary logo image.');
        };
        this.secondaryLogo.src = `${settingsManager.installDirectory}img/logo-secondary.png`;
      }
    } catch {
      // If the logo fails to load, we will still continue without it.
    }
  }

  // This is 'disabled' since it does not turn green after being clicked like other buttons.
  isIconDisabled = true;

  menuMode: MenuMode[] = [MenuMode.TOOLS, MenuMode.ALL];

  bottomIconImg = cameraPng;

  /**
   * Single-action entry: the resolution submenu is redundant with the command
   * palette (HD/4K/8K commands), so right-click just takes the standard shot.
   */
  getContextMenuConfig(): IContextMenuConfig {
    return {
      level1ElementName: 'save-rmb',
      level1Html: html`<li class="rmb-menu-item" id="save-rmb"><a href="#">${this.t_('rmbMenu.title')}</a></li>`,
      order: 20,
      isVisible: () => true,
    };
  }

  onContextMenuAction(targetId: string): void {
    if (targetId === 'save-rmb') {
      this.saveHiResPhoto('4k');
    }
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'Screenshot.take4k',
        label: this.t_('commands.take4k'),
        category: 'Export',
        callback: () => this.saveHiResPhoto('4k'),
      },
      {
        id: 'Screenshot.takeHd',
        label: this.t_('commands.takeHd'),
        category: 'Export',
        callback: () => this.saveHiResPhoto('hd'),
      },
      {
        id: 'Screenshot.take8k',
        label: this.t_('commands.take8k'),
        category: 'Export',
        callback: () => this.saveHiResPhoto('8k'),
      },
    ];
  }

  saveHiResPhoto = (resolution: string) => {
    switch (resolution) {
      case 'hd':
        settingsManager.hiResWidth = 1920;
        settingsManager.hiResHeight = 1080;
        break;
      case '4k':
        settingsManager.hiResWidth = 3840;
        settingsManager.hiResHeight = 2160;
        break;
      case '8k':
        settingsManager.hiResWidth = 7680;
        settingsManager.hiResHeight = 4320;
        break;
      default:
        break;
    }

    this.queuedScreenshot_ = true;
  };

  addJs(): void {
    super.addJs();
    // Re-assert after addHtml() resets it from isIconDisabledOnLoad
    this.isIconDisabled = true;
    EventBus.getInstance().on(
      EventBusEvent.altCanvasResize,
      () => this.queuedScreenshot_,
    );

    EventBus.getInstance().on(
      EventBusEvent.endOfDraw,
      () => {
        if (this.queuedScreenshot_) {
          this.takeScreenShot();
        }
      },
    );
  }

  private queuedScreenshot_ = false;

  /**
   * Take a screenshot of the current canvas
   *
   * Canvas is autoresized if queuedScreenshot_ is true at the start of the draw loop.
   * Screenshot is then taken at the end of the draw loop
   */
  takeScreenShot() {
    const link = document.createElement('a');

    link.download = 'keeptrack.png';

    link.href = this.watermarkedDataUrl_();
    link.click();
    this.queuedScreenshot_ = false;
  }

  private watermarkedDataUrl_() {
    const canvas = ServiceLocator.getRenderer().domElement;

    // Stage 1: Composite WebGL + plugin overlays onto a source canvas
    const srcCanvas = document.createElement('canvas');

    srcCanvas.width = canvas.width;
    srcCanvas.height = canvas.height;
    const srcCtx = srcCanvas.getContext('2d');

    if (!srcCtx) {
      errorManagerInstance.warn('Failed to get 2D context for temporary canvas. Unable to create screenshot.');

      return '';
    }

    srcCtx.drawImage(canvas, 0, 0);

    // Allow plugins to draw overlays (e.g. polar view labels) onto the screenshot
    EventBus.getInstance().emit(EventBusEvent.screenshotComposite, srcCtx, srcCanvas.width, srcCanvas.height);

    // Stage 2: Optionally crop to 1:1 square
    const shouldCrop = EventBus.getInstance().methods.screenshotShouldCropSquare();
    let outCanvas: HTMLCanvasElement;
    let outCtx: CanvasRenderingContext2D;

    if (shouldCrop && srcCanvas.width !== srcCanvas.height) {
      const size = Math.min(srcCanvas.width, srcCanvas.height);
      const sx = Math.round((srcCanvas.width - size) / 2);
      const sy = Math.round((srcCanvas.height - size) / 2);

      outCanvas = document.createElement('canvas');
      outCanvas.width = size;
      outCanvas.height = size;
      outCtx = outCanvas.getContext('2d')!;
      outCtx.drawImage(srcCanvas, sx, sy, size, size, 0, 0, size, size);
    } else {
      outCanvas = srcCanvas;
      outCtx = srcCtx;
    }

    const ow = outCanvas.width;
    const oh = outCanvas.height;

    // Stage 3: Draw logos onto the final output canvas
    const logoHeight = 200 * (settingsManager.hiResWidth ?? 3840) / 3840;
    let logoWidth: number;
    const padding = shouldCrop ? 100 : 50;

    if (settingsManager.isShowSecondaryLogo && this.secondaryLogo) {
      // Draw secondary logo on the left
      logoWidth = this.secondaryLogo.width * (logoHeight / this.secondaryLogo.height);
      outCtx.drawImage(this.secondaryLogo, padding, oh - logoHeight - padding, logoWidth, logoHeight);
      // Draw primary logo to the right of secondary logo
      logoWidth = this.logo.width * (logoHeight / this.logo.height);
      outCtx.drawImage(this.logo, padding + logoWidth + padding, oh - logoHeight - padding, logoWidth, logoHeight);
    } else {
      // Draw only primary logo on the right
      logoWidth = this.logo.width * (logoHeight / this.logo.height);
      outCtx.drawImage(this.logo, ow - logoWidth - padding, oh - logoHeight - padding, logoWidth, logoHeight);
    }

    // Stage 4: Draw classification text
    const { classificationstr, classificationColor } = Screenshot.calculateClassificationText_();

    if (classificationstr !== '') {
      outCtx.font = '24px nasalization';
      outCtx.globalAlpha = 1.0;
      outCtx.fillStyle = classificationColor;

      const textWidth = outCtx.measureText(classificationstr).width;

      outCtx.fillText(classificationstr, ow / 2 - textWidth, oh - 20);
      outCtx.fillText(classificationstr, ow / 2 - textWidth, 34);
    }

    KeepTrack.getInstance().containerRoot.appendChild(outCanvas);
    const image = outCanvas.toDataURL();

    outCanvas.parentNode!.removeChild(outCanvas);

    return image;
  }

  private static calculateClassificationText_(): { classificationstr: string; classificationColor: string } {
    if (settingsManager.classificationStr === '') {
      return { classificationstr: '', classificationColor: '' };
    }

    return {
      classificationstr: settingsManager.classificationStr ?? '',
      classificationColor: Classification.getColors(settingsManager.classificationStr).backgroundColor,
    };

  }
}

