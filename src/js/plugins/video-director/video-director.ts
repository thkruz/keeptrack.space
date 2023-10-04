import settingsPng from '@app/img/icons/settings.png';
import { keepTrackApi, KeepTrackApiMethods } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';

import { mainCameraInstance } from '@app/js/singletons/camera';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

/**
 * /////////////////////////////////////////////////////////////////////////////
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

declare module '@app/js/interfaces' {
  interface UserSettings {
    isBlackEarth: boolean;
    isDrawMilkyWay: boolean;
  }
}

export class VideoDirectorPlugin extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Video Director';
  isRotateL = true;
  isRotateR = false;
  isRotateU = false;
  isRotateD = false;
  constructor() {
    super(VideoDirectorPlugin.PLUGIN_NAME);
  }

  bottomIconElementName: string = 'video-director-icon';
  bottomIconImg = settingsPng;
  bottomIconLabel: string = 'Video Director';

  sideMenuElementName: string = 'video-director-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="video-director-menu" class="side-menu-parent start-hidden text-select">
    <div id="video-director-content" class="side-menu">
      <div class="row">
        <form id="video-director-form">
          <div id="video-director-general">
            <div class="row center"></div>
            </br>
            <div class="row center">
              <button id="video-director-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Update video-director &#9658;</button>
            </div>
            <h5 class="center-align">General video-director</h5>
            <div class="input-field col s12">
              <input value="0.000075" id="video-director-rotateSpeed" type="text" maxlength="9" />
              <label for="video-director-rotateSpeed" class="active">Rotate Speed</label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Rotate Camera to the Left">
                <input id="video-director-rotateL" type="checkbox" checked/>
                <span class="lever"></span>
                Rotate Camera Left
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Rotate Camera to the Right">
                <input id="video-director-rotateR" type="checkbox"/>
                <span class="lever"></span>
                Rotate Camera Right
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Rotate Camera Up">
                <input id="video-director-rotateU" type="checkbox"/>
                <span class="lever"></span>
                Rotate Camera Up
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Rotate Camera Down">
                <input id="video-director-rotateD" type="checkbox"/>
                <span class="lever"></span>
                Rotate Camera Down
              </label>
            </div>
            <div class="input-field col s12">
              <input value="0.05" id="video-director-panSpeed" type="text" maxlength="9" />
              <label for="video-director-panSpeed" class="active">Pan Speed</label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Pan Camera Left">
                <input id="video-director-panL" type="checkbox"/>
                <span class="lever"></span>
                Pan Camera Left
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Pan Camera Right">
                <input id="video-director-panR" type="checkbox"/>
                <span class="lever"></span>
                Pan Camera Right
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Pan Camera Up">
                <input id="video-director-panU" type="checkbox"/>
                <span class="lever"></span>
                Pan Camera Up
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Pan Camera Down">
                <input id="video-director-panD" type="checkbox"/>
                <span class="lever"></span>
                Pan Camera Down
              </label>
            </div>
            <div class="input-field col s12">
              <input value="0.0005" id="video-director-zoomSpeed" type="text" maxlength="9" />
              <label for="video-director-zoomSpeed" class="active">Zoom Speed</label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Zoom Camera In">
                <input id="video-director-zoomIn" type="checkbox"/>
                <span class="lever"></span>
                Zoom Camera In
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Zoom Camera Out">
                <input id="video-director-zoomOut" type="checkbox"/>
                <span class="lever"></span>
                Zoom Camera Out
              </label>
          </div>
          <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable Selected Satellite Dot">
                <input id="video-director-selectedColor" type="checkbox"/>
                <span class="lever"></span>
                Disable Selected Satellite Dot
              </label>
          </div>
          <div class="center-align row">
            <button id="video-director-rotate" class="btn btn-ui waves-effect waves-light" type="button" name="action">Start Auto Rotate &#9658;</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  helpTitle = `Settings Menu`;
  helpBody = keepTrackApi.html`The Settings menu allows you to configure the application.`;

  isNotColorPickerInitialSetup = false;

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      method: KeepTrackApiMethods.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('video-director-form').addEventListener('change', VideoDirectorPlugin.onFormChange);
        getEl('video-director-form').addEventListener('submit', VideoDirectorPlugin.onSubmit);
        getEl('video-director-rotate').addEventListener('click', () => {
          keepTrackApi.getSoundManager()?.play('button');
          mainCameraInstance.autoRotate(true);
        });
      },
    });
  }

  static onFormChange(e: any) {
    if (typeof e === 'undefined' || e === null) throw new Error('e is undefined');

    switch (e.target?.id) {
      case 'video-director-rotateL':
      case 'video-director-rotateR':
      case 'video-director-rotateU':
      case 'video-director-rotateD':
      case 'video-director-panL':
      case 'video-director-panR':
      case 'video-director-panU':
      case 'video-director-panD':
      case 'video-director-zoomIn':
      case 'video-director-zoomOut':
        if ((<HTMLInputElement>getEl(e.target.id)).checked) {
          // Play sound for enabling option
          keepTrackApi.getSoundManager()?.play('toggleOn');
        } else {
          // Play sound for disabling option
          keepTrackApi.getSoundManager()?.play('toggleOff');
        }
        break;
      default:
        break;
    }

    if ((<HTMLInputElement>getEl('video-director-selectedColor')).checked && settingsManager.selectedColor[3] !== 0) {
      settingsManager.selectedColorFallback = settingsManager.selectedColor;
      settingsManager.selectedColor = [0, 0, 0, 0];
    } else {
      settingsManager.selectedColor = settingsManager.selectedColorFallback;
    }

    settingsManager.autoRotateSpeed = parseFloat((<HTMLInputElement>getEl('video-director-rotateSpeed')).value);
    settingsManager.autoPanSpeed = parseFloat((<HTMLInputElement>getEl('video-director-panSpeed')).value);
    settingsManager.autoZoomSpeed = parseFloat((<HTMLInputElement>getEl('video-director-zoomSpeed')).value);

    const isRotateL = (<HTMLInputElement>getEl('video-director-rotateL')).checked;
    const isRotateR = (<HTMLInputElement>getEl('video-director-rotateR')).checked;
    const isRotateU = (<HTMLInputElement>getEl('video-director-rotateU')).checked;
    const isRotateD = (<HTMLInputElement>getEl('video-director-rotateD')).checked;
    const isPanL = (<HTMLInputElement>getEl('video-director-panL')).checked;
    const isPanR = (<HTMLInputElement>getEl('video-director-panR')).checked;
    const isPanU = (<HTMLInputElement>getEl('video-director-panU')).checked;
    const isPanD = (<HTMLInputElement>getEl('video-director-panD')).checked;
    const isZoomIn = (<HTMLInputElement>getEl('video-director-zoomIn')).checked;
    const isZoomOut = (<HTMLInputElement>getEl('video-director-zoomOut')).checked;

    if (isRotateL && !settingsManager.isAutoRotateL) {
      (<HTMLInputElement>getEl('video-director-rotateR')).checked = false;
    }

    if (isRotateR && !settingsManager.isAutoRotateR) {
      (<HTMLInputElement>getEl('video-director-rotateL')).checked = false;
    }

    if (isRotateU && !settingsManager.isAutoRotateU) {
      (<HTMLInputElement>getEl('video-director-rotateD')).checked = false;
    }

    if (isRotateD && !settingsManager.isAutoRotateD) {
      (<HTMLInputElement>getEl('video-director-rotateU')).checked = false;
    }

    if (isPanL && !settingsManager.isAutoPanL) {
      (<HTMLInputElement>getEl('video-director-panR')).checked = false;
    }

    if (isPanR && !settingsManager.isAutoPanR) {
      (<HTMLInputElement>getEl('video-director-panL')).checked = false;
    }

    if (isPanU && !settingsManager.isAutoPanU) {
      (<HTMLInputElement>getEl('video-director-panD')).checked = false;
    }

    if (isPanD && !settingsManager.isAutoPanD) {
      (<HTMLInputElement>getEl('video-director-panU')).checked = false;
    }

    if (isZoomIn && !settingsManager.isAutoZoomIn) {
      (<HTMLInputElement>getEl('video-director-zoomOut')).checked = false;
    }

    if (isZoomOut && !settingsManager.isAutoZoomOut) {
      (<HTMLInputElement>getEl('video-director-zoomIn')).checked = false;
    }
  }

  static onSubmit(e: any) {
    if (typeof e === 'undefined' || e === null) throw new Error('e is undefined');
    e.preventDefault();

    keepTrackApi.getSoundManager()?.play('button');

    settingsManager.isAutoRotateR = (<HTMLInputElement>getEl('video-director-rotateR')).checked;
    settingsManager.isAutoRotateL = (<HTMLInputElement>getEl('video-director-rotateL')).checked;
    settingsManager.isAutoRotateU = (<HTMLInputElement>getEl('video-director-rotateU')).checked;
    settingsManager.isAutoRotateD = (<HTMLInputElement>getEl('video-director-rotateD')).checked;
    settingsManager.isAutoPanR = (<HTMLInputElement>getEl('video-director-panR')).checked;
    settingsManager.isAutoPanL = (<HTMLInputElement>getEl('video-director-panL')).checked;
    settingsManager.isAutoPanU = (<HTMLInputElement>getEl('video-director-panU')).checked;
    settingsManager.isAutoPanD = (<HTMLInputElement>getEl('video-director-panD')).checked;
    settingsManager.isAutoZoomIn = (<HTMLInputElement>getEl('video-director-zoomIn')).checked;
    settingsManager.isAutoZoomOut = (<HTMLInputElement>getEl('video-director-zoomOut')).checked;
  }
}

export const videoDirectorPlugin = new VideoDirectorPlugin();
