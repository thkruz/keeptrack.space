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

import { KeepTrackApiEvents, MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { Classification } from '@app/static/classification';
import cameraPng from '@public/img/icons/camera.png';
import logoPng from '@public/img/logo-primary.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class Screenshot extends KeepTrackPlugin {
  readonly id = 'Screenshot';
  dependencies_ = [];
  bottomIconCallback = () => {
    this.saveHiResPhoto('4k');
  };

  logo: HTMLImageElement;
  constructor() {
    super();
    this.logo = new Image();
    this.logo.src = logoPng;
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
    keepTrackApi.register({
      event: KeepTrackApiEvents.altCanvasResize,
      cbName: this.id,
      cb: () => this.queuedScreenshot_,
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.endOfDraw,
      cbName: this.id,
      cb: () => {
        if (this.queuedScreenshot_) {
          this.takeScreenShot();
        }
      },
    });
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
    const cw = tempCanvas.width;
    const ch = tempCanvas.height;
    const logoWidth = 200;
    const logoHeight = 200;
    const logoX = canvas.width - logoWidth - 50;
    const logoY = canvas.height - logoHeight - 50;

    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    tempCtx.drawImage(canvas, 0, 0);
    tempCtx.drawImage(this.logo, logoX, logoY, logoWidth, logoHeight);

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

    tempCanvas.parentNode.removeChild(tempCanvas);

    return image;
  }

  private static calculateClassificationText_(): { classificationstr: string; classificationColor: string } {
    if (settingsManager.classificationStr === '') {
      return { classificationstr: '', classificationColor: '' };
    }

    return {
      classificationstr: settingsManager.classificationStr,
      classificationColor: Classification.getColors(settingsManager.classificationStr).backgroundColor,
    };

  }
}

