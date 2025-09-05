/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * planetarium.ts is a plugin for showing the satellites above from the perspective
 * of a view on the earth.
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
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { keepTrackApi } from '@app/keepTrackApi';
import cameraPng from '@public/img/icons/camera.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { EventBusEvent } from '@app/engine/events/event-bus-events';

export class Screenshot extends KeepTrackPlugin {
  readonly id = 'Screenshot';
  dependencies_ = [];
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

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = cameraPng;
  rmbCallback = (targetId: string): void => {
    switch (targetId) {
      case 'save-hd-rmb':
        this.saveHiResPhoto('hd');
        break;
      case 'save-4k-rmb':
        this.saveHiResPhoto('4k');
        break;
      case 'save-8k-rmb':
        this.saveHiResPhoto('8k');
        break;
      default:
        break;
    }
  };

  rmbL1ElementName = 'save-rmb';
  rmbL1Html = keepTrackApi.html`<li class="rmb-menu-item" id="${this.rmbL1ElementName}"><a href="#">Save Image &#x27A4;</a></li>`;

  isRmbOnEarth = true;
  isRmbOffEarth = true;
  isRmbOnSat = true;
  rmbMenuOrder = 20;

  rmbL2ElementName = 'save-rmb-menu';
  rmbL2Html = keepTrackApi.html`
    <ul class='dropdown-contents'>
      <li id="save-hd-rmb"><a href="#">HD (1920 x 1080)</a></li>
      <li id="save-4k-rmb"><a href="#">4K (3840 x 2160)</a></li>
      <li id="save-8k-rmb"><a href="#">8K (7680 x 4320)</a></li>
    </ul>
  `;

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
    keepTrackApi.on(
      EventBusEvent.altCanvasResize,
      () => this.queuedScreenshot_,
    );

    keepTrackApi.on(
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
    const canvas = keepTrackApi.getRenderer().domElement;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      errorManagerInstance.warn('Failed to get 2D context for temporary canvas. Unable to create screenshot.');

      return '';
    }


    const cw = tempCanvas.width;
    const ch = tempCanvas.height;

    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    const logoHeight = 200;
    let logoWidth: number; // with will be calculated based on height
    const padding = 50;

    tempCtx.drawImage(canvas, 0, 0);

    if (settingsManager.isShowSecondaryLogo && this.secondaryLogo) {
      // Draw secondary logo on the left
      logoWidth = this.secondaryLogo.width * (logoHeight / this.secondaryLogo.height);
      tempCtx.drawImage(this.secondaryLogo, padding, canvas.height - logoHeight - padding, logoWidth, logoHeight);
      // Draw primary logo to the right of secondary logo
      logoWidth = this.logo.width * (logoHeight / this.logo.height);
      tempCtx.drawImage(this.logo, padding + logoWidth + padding, canvas.height - logoHeight - padding, logoWidth, logoHeight);
    } else {
      // Draw only primary logo on the right
      logoWidth = this.logo.width * (logoHeight / this.logo.height);
      tempCtx.drawImage(this.logo, canvas.width - logoWidth - padding, canvas.height - logoHeight - padding, logoWidth, logoHeight);
    }

    const { classificationstr, classificationColor } = Screenshot.calculateClassificationText_();

    if (classificationstr !== '') {
      tempCtx.font = '24px nasalization';
      tempCtx.globalAlpha = 1.0;

      tempCtx.fillStyle = classificationColor;

      const textWidth = tempCtx.measureText(classificationstr).width;

      tempCtx.fillText(classificationstr, cw / 2 - textWidth, ch - 20);
      tempCtx.fillText(classificationstr, cw / 2 - textWidth, 34);
    }

    keepTrackApi.containerRoot.appendChild(tempCanvas);
    const image = tempCanvas.toDataURL();

    tempCanvas.parentNode!.removeChild(tempCanvas);

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

