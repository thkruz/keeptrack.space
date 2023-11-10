/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * planetarium.ts is a plugin for showing the satellites above from the perspective
 * of a view on the earth.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import cameraPng from '@app/img/icons/camera.png';
import { keepTrackApi, KeepTrackApiEvents } from '@app/js/keepTrackApi';
import { Classification, ClassificationString } from '@app/js/static/classification';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class Screenshot extends KeepTrackPlugin {
  bottomIconCallback = () => {
    this.saveHiResPhoto('4k');
  };

  // This is 'disabled' since it does not turn green after being clicked like other buttons.
  isIconDisabled = true;

  bottomIconElementName = 'menu-screenshot';
  bottomIconImg = cameraPng;
  bottomIconLabel = 'Take Photo';
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
    }
  };

  rmbL1ElementName = 'save-rmb';
  rmbL1Html = keepTrackApi.html`
    <li class="rmb-menu-item" id=${this.rmbL1ElementName}><a href="#">Save Image &#x27A4;</a></li>
  `;

  isRmbOnEarth = true;
  isRmbOffEarth = true;
  isRmbOnSat = true;

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
    }

    this.queuedScreenshot_ = true;
  };

  constructor() {
    const PLUGIN_NAME = 'Screenshot';
    super(PLUGIN_NAME);
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.altCanvasResize,
      cbName: this.PLUGIN_NAME,
      cb: () => this.queuedScreenshot_,
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.endOfDraw,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        if (this.queuedScreenshot_) this.takeScreenShot();
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
  public takeScreenShot() {
    let link = document.createElement('a');
    link.download = 'keeptrack.png';

    let d = new Date();
    let n = d.getUTCFullYear();
    let copyrightStr = !settingsManager.copyrightOveride ? `©${n} KEEPTRACK.SPACE` : '';

    link.href = Screenshot.watermarkedDataUrl(copyrightStr);
    link.click();
    this.queuedScreenshot_ = false;
  }

  private static watermarkedDataUrl(text: string) {
    const drawManagerInstance = keepTrackApi.getDrawManager();
    const canvas = drawManagerInstance.canvas;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    let cw = (tempCanvas.width = canvas.width);
    let ch = (tempCanvas.height = canvas.height);
    tempCtx.drawImage(canvas, 0, 0);
    tempCtx.font = '24px nasalization';
    let textWidth = tempCtx.measureText(text).width;
    tempCtx.globalAlpha = 1.0;
    tempCtx.fillStyle = 'white';
    tempCtx.fillText(text, cw - textWidth - 30, ch - 30);

    const { classificationstr, classificationColor } = Screenshot.calculateClassificationText();
    if (classificationstr !== '') {
      tempCtx.font = '24px nasalization';
      tempCtx.globalAlpha = 1.0;

      tempCtx.fillStyle = classificationColor;

      textWidth = tempCtx.measureText(classificationstr).width;
      tempCtx.fillText(classificationstr, cw / 2 - textWidth, ch - 20);
      tempCtx.fillText(classificationstr, cw / 2 - textWidth, 34);
    }

    document.body.appendChild(tempCanvas);
    let image = tempCanvas.toDataURL();
    tempCanvas.parentNode.removeChild(tempCanvas);
    return image;
  }

  private static calculateClassificationText(): { classificationstr: string; classificationColor: string } {
    if (settingsManager.classificationStr === '') {
      return { classificationstr: '', classificationColor: '' };
    } else {
      return {
        classificationstr: settingsManager.classificationStr,
        classificationColor: Classification.getColors(settingsManager.classificationStr).backgroundColor,
      };
    }
  }
}

declare module '@app/js/interfaces' {
  interface UserSettings {
    classificationStr: ClassificationString;
    /**
     * If true, the copywrite will be hidden.
     */
    copyrightOveride?: boolean;
  }
}

export const screenshotPlugin = new Screenshot();
