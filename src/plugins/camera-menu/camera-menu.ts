import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { SettingsManager } from '@app/settings/settings';
import settingsPng from '@public/img/icons/settings.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SoundNames } from '../sounds/sounds';

/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
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

export class CameraMenuPlugin extends KeepTrackPlugin {
  readonly id = 'CameraMenuPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.SETTINGS, MenuMode.ALL];

  bottomIconElementName: string = 'camera-menu-icon';
  bottomIconImg = settingsPng;
  sideMenuElementName: string = 'camera-menu';
  sideMenuElementHtml: string = html`
  <div id="camera-menu" class="side-menu-parent start-hidden text-select">
    <div id="camera-content" class="side-menu">
      <div class="row">
        <form id="camera-form">
          <div class="row center">
            <button id="camera-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Update Camera &#9658;</button>
          </div>
          <div class="row center">
            <button id="camera-reset" class="btn btn-ui waves-effect waves-light" type="button" name="action">Reset to Defaults &#9658;</button>
          </div>

          <h5 class="center-align">View Settings</h5>
          <div class="row">
            <div class="input-field col s12">
              <input value="0.6" id="camera-fieldOfView" type="number" step="0.05" min="0.04" max="1.2" data-position="top" data-delay="50" data-tooltip="Camera field of view (radians)" />
              <label for="camera-fieldOfView" class="active">Field of View</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="0.003" id="camera-movementSpeed" type="number" step="0.001" min="0.001" max="0.1" data-position="top" data-delay="50" data-tooltip="Camera movement speed" />
              <label for="camera-movementSpeed" class="active">Movement Speed</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="5" id="camera-decayFactor" type="number" step="1" min="1" max="20" data-position="top" data-delay="50" data-tooltip="Camera decay factor (lower = more momentum)" />
              <label for="camera-decayFactor" class="active">Decay Factor</label>
            </div>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Disable camera panning">
              <input id="camera-disableControls" type="checkbox"/>
              <span class="lever"></span>
              Disable Camera Controls
            </label>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Zoom Settings</h5>
          <div class="row">
            <div class="input-field col s12">
              <input value="0.005" id="camera-zoomSpeed" type="number" step="0.001" min="0.001" max="0.1" data-position="top" data-delay="50" data-tooltip="Zoom speed" />
              <label for="camera-zoomSpeed" class="active">Zoom Speed</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="1200000" id="camera-maxZoomDistance" type="number" step="100000" min="100000" max="10000000" data-position="top" data-delay="50" data-tooltip="Max zoom distance (km)" />
              <label for="camera-maxZoomDistance" class="active">Max Zoom Distance (km)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="25" id="camera-nearZoomLevel" type="number" step="5" min="1" max="100" data-position="top" data-delay="50" data-tooltip="Near zoom level (km)" />
              <label for="camera-nearZoomLevel" class="active">Near Zoom Level (km)</label>
            </div>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Zooming stops auto rotation">
              <input id="camera-zoomStopsRotation" type="checkbox" checked/>
              <span class="lever"></span>
              Zoom Stops Rotation
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Zooming stops snap to satellite">
              <input id="camera-zoomStopsSnapped" type="checkbox"/>
              <span class="lever"></span>
              Zoom Stops Snap
            </label>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Auto Camera</h5>
          <div class="row">
            <div class="input-field col s12">
              <input value="1" id="camera-autoPanSpeed" type="number" step="0.5" min="0.1" max="10" data-position="top" data-delay="50" data-tooltip="Auto pan speed" />
              <label for="camera-autoPanSpeed" class="active">Auto Pan Speed</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="0.000075" id="camera-autoRotateSpeed" type="number" step="0.00001" min="0.00001" max="0.001" data-position="top" data-delay="50" data-tooltip="Auto rotate speed" />
              <label for="camera-autoRotateSpeed" class="active">Auto Rotate Speed</label>
            </div>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">FPS Mode</h5>
          <div class="row">
            <div class="input-field col s12">
              <input value="3" id="camera-fpsForwardSpeed" type="number" step="1" min="1" max="100" data-position="top" data-delay="50" data-tooltip="FPS forward speed" />
              <label for="camera-fpsForwardSpeed" class="active">Forward Speed</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="3" id="camera-fpsSideSpeed" type="number" step="1" min="1" max="100" data-position="top" data-delay="50" data-tooltip="FPS side speed" />
              <label for="camera-fpsSideSpeed" class="active">Side Speed</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="3" id="camera-fpsVertSpeed" type="number" step="1" min="1" max="100" data-position="top" data-delay="50" data-tooltip="FPS vertical speed" />
              <label for="camera-fpsVertSpeed" class="active">Vertical Speed</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="0.02" id="camera-fpsPitchRate" type="number" step="0.01" min="0.01" max="0.5" data-position="top" data-delay="50" data-tooltip="FPS pitch rate" />
              <label for="camera-fpsPitchRate" class="active">Pitch Rate</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="0.02" id="camera-fpsYawRate" type="number" step="0.01" min="0.01" max="0.5" data-position="top" data-delay="50" data-tooltip="FPS yaw rate" />
              <label for="camera-fpsYawRate" class="active">Yaw Rate</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="0.02" id="camera-fpsRotateRate" type="number" step="0.01" min="0.01" max="0.5" data-position="top" data-delay="50" data-tooltip="FPS rotate rate" />
              <label for="camera-fpsRotateRate" class="active">Rotate Rate</label>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();
    getEl('camera-form')?.addEventListener('change', CameraMenuPlugin.onFormChange_);
    getEl('camera-form')?.addEventListener('submit', CameraMenuPlugin.onSubmit_);
    getEl('camera-reset')?.addEventListener('click', CameraMenuPlugin.resetToDefaults);
  }

  addJs(): void {
    super.addJs();
    setTimeout(() => CameraMenuPlugin.syncOnLoad(), 100);
  }

  static syncOnLoad() {
    const cameraSettings = [
      { id: 'camera-disableControls', setting: 'disableCameraControls' },
      { id: 'camera-zoomStopsRotation', setting: 'isZoomStopsRotation' },
      { id: 'camera-zoomStopsSnapped', setting: 'isZoomStopsSnappedOnSat' },
    ];

    cameraSettings.forEach(({ id, setting }) => {
      const element = <HTMLInputElement>getEl(id);

      if (element) {
        element.checked = settingsManager[setting];
      }
    });

    // Numeric settings
    const fieldOfViewEl = <HTMLInputElement>getEl('camera-fieldOfView');

    if (fieldOfViewEl) {
      fieldOfViewEl.value = settingsManager.fieldOfView.toString();
    }

    const movementSpeedEl = <HTMLInputElement>getEl('camera-movementSpeed');

    if (movementSpeedEl) {
      movementSpeedEl.value = settingsManager.cameraMovementSpeed.toString();
    }

    const decayFactorEl = <HTMLInputElement>getEl('camera-decayFactor');

    if (decayFactorEl) {
      decayFactorEl.value = settingsManager.cameraDecayFactor.toString();
    }

    const zoomSpeedEl = <HTMLInputElement>getEl('camera-zoomSpeed');

    if (zoomSpeedEl) {
      zoomSpeedEl.value = settingsManager.zoomSpeed.toString();
    }

    const maxZoomDistanceEl = <HTMLInputElement>getEl('camera-maxZoomDistance');

    if (maxZoomDistanceEl) {
      maxZoomDistanceEl.value = settingsManager.maxZoomDistance.toString();
    }

    const nearZoomLevelEl = <HTMLInputElement>getEl('camera-nearZoomLevel');

    if (nearZoomLevelEl) {
      nearZoomLevelEl.value = settingsManager.nearZoomLevel.toString();
    }

    const autoPanSpeedEl = <HTMLInputElement>getEl('camera-autoPanSpeed');

    if (autoPanSpeedEl) {
      autoPanSpeedEl.value = settingsManager.autoPanSpeed.toString();
    }

    const autoRotateSpeedEl = <HTMLInputElement>getEl('camera-autoRotateSpeed');

    if (autoRotateSpeedEl) {
      autoRotateSpeedEl.value = settingsManager.autoRotateSpeed.toString();
    }

    const fpsForwardSpeedEl = <HTMLInputElement>getEl('camera-fpsForwardSpeed');

    if (fpsForwardSpeedEl) {
      fpsForwardSpeedEl.value = settingsManager.fpsForwardSpeed.toString();
    }

    const fpsSideSpeedEl = <HTMLInputElement>getEl('camera-fpsSideSpeed');

    if (fpsSideSpeedEl) {
      fpsSideSpeedEl.value = settingsManager.fpsSideSpeed.toString();
    }

    const fpsVertSpeedEl = <HTMLInputElement>getEl('camera-fpsVertSpeed');

    if (fpsVertSpeedEl) {
      fpsVertSpeedEl.value = settingsManager.fpsVertSpeed.toString();
    }

    const fpsPitchRateEl = <HTMLInputElement>getEl('camera-fpsPitchRate');

    if (fpsPitchRateEl) {
      fpsPitchRateEl.value = settingsManager.fpsPitchRate.toString();
    }

    const fpsYawRateEl = <HTMLInputElement>getEl('camera-fpsYawRate');

    if (fpsYawRateEl) {
      fpsYawRateEl.value = settingsManager.fpsYawRate.toString();
    }

    const fpsRotateRateEl = <HTMLInputElement>getEl('camera-fpsRotateRate');

    if (fpsRotateRateEl) {
      fpsRotateRateEl.value = settingsManager.fpsRotateRate.toString();
    }
  }

  private static onFormChange_(e: Event) {
    const toggleIds = ['camera-disableControls', 'camera-zoomStopsRotation', 'camera-zoomStopsSnapped'];

    const targetId = (<HTMLElement>e.target)?.id;

    if (toggleIds.includes(targetId)) {
      const isChecked = (<HTMLInputElement>getEl(targetId))?.checked;

      if (isChecked) {
        ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
      } else {
        ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
      }
    }
  }

  static resetToDefaults() {
    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    settingsManager.fieldOfView = 0.6;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraDecayFactor = 5;
    settingsManager.disableCameraControls = false;
    settingsManager.zoomSpeed = 0.005;
    settingsManager.maxZoomDistance = 1200000;
    settingsManager.nearZoomLevel = 25;
    settingsManager.isZoomStopsRotation = true;
    settingsManager.isZoomStopsSnappedOnSat = false;
    settingsManager.autoPanSpeed = 1;
    settingsManager.autoRotateSpeed = 0.000075;
    settingsManager.fpsForwardSpeed = 3;
    settingsManager.fpsSideSpeed = 3;
    settingsManager.fpsVertSpeed = 3;
    settingsManager.fpsPitchRate = 0.02;
    settingsManager.fpsYawRate = 0.02;
    settingsManager.fpsRotateRate = 0.02;

    SettingsManager.preserveSettings();
    CameraMenuPlugin.syncOnLoad();
  }

  private static onSubmit_(e: SubmitEvent) {
    e.preventDefault();

    const uiManagerInstance = ServiceLocator.getUiManager();

    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    settingsManager.disableCameraControls = (<HTMLInputElement>getEl('camera-disableControls')).checked;
    settingsManager.isZoomStopsRotation = (<HTMLInputElement>getEl('camera-zoomStopsRotation')).checked;
    settingsManager.isZoomStopsSnappedOnSat = (<HTMLInputElement>getEl('camera-zoomStopsSnapped')).checked;

    const fieldOfView = parseFloat((<HTMLInputElement>getEl('camera-fieldOfView')).value);

    if (!isNaN(fieldOfView) && fieldOfView >= 0.04 && fieldOfView <= 1.2) {
      settingsManager.fieldOfView = fieldOfView;
    }

    const movementSpeed = parseFloat((<HTMLInputElement>getEl('camera-movementSpeed')).value);

    if (!isNaN(movementSpeed) && movementSpeed >= 0.001 && movementSpeed <= 0.1) {
      settingsManager.cameraMovementSpeed = movementSpeed;
    }

    const decayFactor = parseFloat((<HTMLInputElement>getEl('camera-decayFactor')).value);

    if (!isNaN(decayFactor) && decayFactor >= 1 && decayFactor <= 20) {
      settingsManager.cameraDecayFactor = decayFactor;
    }

    const zoomSpeed = parseFloat((<HTMLInputElement>getEl('camera-zoomSpeed')).value);

    if (!isNaN(zoomSpeed) && zoomSpeed >= 0.001 && zoomSpeed <= 0.1) {
      settingsManager.zoomSpeed = zoomSpeed;
    }

    const maxZoomDistance = parseFloat((<HTMLInputElement>getEl('camera-maxZoomDistance')).value);

    if (!isNaN(maxZoomDistance) && maxZoomDistance >= 100000 && maxZoomDistance <= 10000000) {
      settingsManager.maxZoomDistance = maxZoomDistance;
    }

    const nearZoomLevel = parseFloat((<HTMLInputElement>getEl('camera-nearZoomLevel')).value);

    if (!isNaN(nearZoomLevel) && nearZoomLevel >= 1 && nearZoomLevel <= 100) {
      settingsManager.nearZoomLevel = nearZoomLevel;
    }

    const autoPanSpeed = parseFloat((<HTMLInputElement>getEl('camera-autoPanSpeed')).value);

    if (!isNaN(autoPanSpeed) && autoPanSpeed >= 0.1 && autoPanSpeed <= 10) {
      settingsManager.autoPanSpeed = autoPanSpeed;
    }

    const autoRotateSpeed = parseFloat((<HTMLInputElement>getEl('camera-autoRotateSpeed')).value);

    if (!isNaN(autoRotateSpeed) && autoRotateSpeed >= 0.00001 && autoRotateSpeed <= 0.001) {
      settingsManager.autoRotateSpeed = autoRotateSpeed;
    }

    const fpsForwardSpeed = parseFloat((<HTMLInputElement>getEl('camera-fpsForwardSpeed')).value);

    if (!isNaN(fpsForwardSpeed) && fpsForwardSpeed >= 1 && fpsForwardSpeed <= 100) {
      settingsManager.fpsForwardSpeed = fpsForwardSpeed;
    }

    const fpsSideSpeed = parseFloat((<HTMLInputElement>getEl('camera-fpsSideSpeed')).value);

    if (!isNaN(fpsSideSpeed) && fpsSideSpeed >= 1 && fpsSideSpeed <= 100) {
      settingsManager.fpsSideSpeed = fpsSideSpeed;
    }

    const fpsVertSpeed = parseFloat((<HTMLInputElement>getEl('camera-fpsVertSpeed')).value);

    if (!isNaN(fpsVertSpeed) && fpsVertSpeed >= 1 && fpsVertSpeed <= 100) {
      settingsManager.fpsVertSpeed = fpsVertSpeed;
    }

    const fpsPitchRate = parseFloat((<HTMLInputElement>getEl('camera-fpsPitchRate')).value);

    if (!isNaN(fpsPitchRate) && fpsPitchRate >= 0.01 && fpsPitchRate <= 0.5) {
      settingsManager.fpsPitchRate = fpsPitchRate;
    }

    const fpsYawRate = parseFloat((<HTMLInputElement>getEl('camera-fpsYawRate')).value);

    if (!isNaN(fpsYawRate) && fpsYawRate >= 0.01 && fpsYawRate <= 0.5) {
      settingsManager.fpsYawRate = fpsYawRate;
    }

    const fpsRotateRate = parseFloat((<HTMLInputElement>getEl('camera-fpsRotateRate')).value);

    if (!isNaN(fpsRotateRate) && fpsRotateRate >= 0.01 && fpsRotateRate <= 0.5) {
      settingsManager.fpsRotateRate = fpsRotateRate;
    }

    SettingsManager.preserveSettings();
    uiManagerInstance.toast('Camera settings updated!', ToastMsgType.normal);
  }
}
