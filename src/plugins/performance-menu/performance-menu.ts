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

export class PerformanceMenuPlugin extends KeepTrackPlugin {
  readonly id = 'PerformanceMenuPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.SETTINGS, MenuMode.ALL];

  bottomIconElementName: string = 'performance-menu-icon';
  bottomIconImg = settingsPng;
  sideMenuElementName: string = 'performance-menu';
  sideMenuElementHtml: string = html`
  <div id="performance-menu" class="side-menu-parent start-hidden text-select">
    <div id="performance-content" class="side-menu">
      <div class="row">
        <form id="performance-form">
          <div class="row center">
            <button id="performance-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Update Performance &#9658;</button>
          </div>
          <div class="row center">
            <button id="performance-reset" class="btn btn-ui waves-effect waves-light" type="button" name="action">Reset to Defaults &#9658;</button>
          </div>

          <h5 class="center-align">Performance Mode</h5>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Enable low performance mode">
              <input id="performance-lowPerf" type="checkbox"/>
              <span class="lever"></span>
              Low Performance Mode
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Use reduced-draw mode for better performance">
              <input id="performance-drawLess" type="checkbox"/>
              <span class="lever"></span>
              Draw Less Mode
            </label>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Rendering Limits</h5>
          <div class="row">
            <div class="input-field col s12">
              <input value="500" id="performance-maxMissiles" type="number" step="100" min="100" max="5000" data-position="top" data-delay="50" data-tooltip="Maximum number of missiles to render" />
              <label for="performance-maxMissiles" class="active">Max Missiles</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="1" id="performance-maxFieldOfViewMarkers" type="number" step="1" min="1" max="100" data-position="top" data-delay="50" data-tooltip="Maximum field of view markers" />
              <label for="performance-maxFieldOfViewMarkers" class="active">Max FOV Markers</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="10000" id="performance-maxAnalystSats" type="number" step="1000" min="1000" max="100000" data-position="top" data-delay="50" data-tooltip="Max analyst satellites (breakup scenarios)" />
              <label for="performance-maxAnalystSats" class="active">Max Analyst Satellites</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="10" id="performance-maxOemSatellites" type="number" step="1" min="1" max="100" data-position="top" data-delay="50" data-tooltip="Maximum OEM satellites to load" />
              <label for="performance-maxOemSatellites" class="active">Max OEM Satellites</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="100000" id="performance-maxNotionalDebris" type="number" step="10000" min="10000" max="500000" data-position="top" data-delay="50" data-tooltip="Maximum notional debris objects" />
              <label for="performance-maxNotionalDebris" class="active">Max Notional Debris</label>
            </div>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">FPS Throttling</h5>
          <div class="row">
            <div class="input-field col s12">
              <input value="0" id="performance-minimumDrawDt" type="number" step="5" min="0" max="100" data-position="top" data-delay="50" data-tooltip="Minimum time between draw calls (ms). 0=unlimited, 16.67=60fps, 33.33=30fps" />
              <label for="performance-minimumDrawDt" class="active">Min Draw Delta Time (ms)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="0" id="performance-fpsThrottle1" type="number" step="5" min="0" max="60" data-position="top" data-delay="50" data-tooltip="Min FPS or sun/moon are skipped" />
              <label for="performance-fpsThrottle1" class="active">FPS Throttle 1 (Sun/Moon)</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="10" id="performance-fpsThrottle2" type="number" step="5" min="0" max="60" data-position="top" data-delay="50" data-tooltip="Min FPS or satellite velocities are ignored" />
              <label for="performance-fpsThrottle2" class="active">FPS Throttle 2 (Velocities)</label>
            </div>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Advanced</h5>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Disable canvas rendering (for debugging)">
              <input id="performance-disableCanvas" type="checkbox"/>
              <span class="lever"></span>
              Disable Canvas
            </label>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();
    getEl('performance-form')?.addEventListener('change', PerformanceMenuPlugin.onFormChange_);
    getEl('performance-form')?.addEventListener('submit', PerformanceMenuPlugin.onSubmit_);
    getEl('performance-reset')?.addEventListener('click', PerformanceMenuPlugin.resetToDefaults);
  }

  addJs(): void {
    super.addJs();
    setTimeout(() => PerformanceMenuPlugin.syncOnLoad(), 100);
  }

  static syncOnLoad() {
    const performanceSettings = [
      { id: 'performance-lowPerf', setting: 'lowPerf' },
      { id: 'performance-drawLess', setting: 'isDrawLess' },
      { id: 'performance-disableCanvas', setting: 'isDisableCanvas' },
    ];

    performanceSettings.forEach(({ id, setting }) => {
      const element = <HTMLInputElement>getEl(id);

      if (element) {
        element.checked = settingsManager[setting];
      }
    });

    // Numeric settings
    const maxMissilesEl = <HTMLInputElement>getEl('performance-maxMissiles');

    if (maxMissilesEl) {
      maxMissilesEl.value = settingsManager.maxMissiles.toString();
    }

    const maxFieldOfViewMarkersEl = <HTMLInputElement>getEl('performance-maxFieldOfViewMarkers');

    if (maxFieldOfViewMarkersEl) {
      maxFieldOfViewMarkersEl.value = settingsManager.maxFieldOfViewMarkers.toString();
    }

    const maxAnalystSatsEl = <HTMLInputElement>getEl('performance-maxAnalystSats');

    if (maxAnalystSatsEl) {
      maxAnalystSatsEl.value = settingsManager.maxAnalystSats.toString();
    }

    const maxOemSatellitesEl = <HTMLInputElement>getEl('performance-maxOemSatellites');

    if (maxOemSatellitesEl) {
      maxOemSatellitesEl.value = settingsManager.maxOemSatellites.toString();
    }

    const maxNotionalDebrisEl = <HTMLInputElement>getEl('performance-maxNotionalDebris');

    if (maxNotionalDebrisEl) {
      maxNotionalDebrisEl.value = settingsManager.maxNotionalDebris.toString();
    }

    const minimumDrawDtEl = <HTMLInputElement>getEl('performance-minimumDrawDt');

    if (minimumDrawDtEl) {
      minimumDrawDtEl.value = settingsManager.minimumDrawDt.toString();
    }

    const fpsThrottle1El = <HTMLInputElement>getEl('performance-fpsThrottle1');

    if (fpsThrottle1El) {
      fpsThrottle1El.value = settingsManager.fpsThrottle1.toString();
    }

    const fpsThrottle2El = <HTMLInputElement>getEl('performance-fpsThrottle2');

    if (fpsThrottle2El) {
      fpsThrottle2El.value = settingsManager.fpsThrottle2.toString();
    }
  }

  private static onFormChange_(e: Event) {
    const toggleIds = ['performance-lowPerf', 'performance-drawLess', 'performance-disableCanvas'];

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

    settingsManager.lowPerf = false;
    settingsManager.isDrawLess = false;
    settingsManager.isDisableCanvas = false;
    settingsManager.maxMissiles = 500;
    settingsManager.maxFieldOfViewMarkers = 1;
    settingsManager.maxAnalystSats = 10000;
    settingsManager.maxOemSatellites = 10;
    settingsManager.maxNotionalDebris = 100000;
    settingsManager.minimumDrawDt = 0;
    settingsManager.fpsThrottle1 = 0;
    settingsManager.fpsThrottle2 = 10;

    SettingsManager.preserveSettings();
    PerformanceMenuPlugin.syncOnLoad();
  }

  private static onSubmit_(e: SubmitEvent) {
    e.preventDefault();

    const uiManagerInstance = ServiceLocator.getUiManager();

    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    settingsManager.lowPerf = (<HTMLInputElement>getEl('performance-lowPerf')).checked;
    settingsManager.isDrawLess = (<HTMLInputElement>getEl('performance-drawLess')).checked;
    settingsManager.isDisableCanvas = (<HTMLInputElement>getEl('performance-disableCanvas')).checked;

    const maxMissiles = parseInt((<HTMLInputElement>getEl('performance-maxMissiles')).value);

    if (!isNaN(maxMissiles) && maxMissiles >= 100 && maxMissiles <= 5000) {
      settingsManager.maxMissiles = maxMissiles;
    }

    const maxFieldOfViewMarkers = parseInt((<HTMLInputElement>getEl('performance-maxFieldOfViewMarkers')).value);

    if (!isNaN(maxFieldOfViewMarkers) && maxFieldOfViewMarkers >= 1 && maxFieldOfViewMarkers <= 100) {
      settingsManager.maxFieldOfViewMarkers = maxFieldOfViewMarkers;
    }

    const maxAnalystSats = parseInt((<HTMLInputElement>getEl('performance-maxAnalystSats')).value);

    if (!isNaN(maxAnalystSats) && maxAnalystSats >= 1000 && maxAnalystSats <= 100000) {
      settingsManager.maxAnalystSats = maxAnalystSats;
    }

    const maxOemSatellites = parseInt((<HTMLInputElement>getEl('performance-maxOemSatellites')).value);

    if (!isNaN(maxOemSatellites) && maxOemSatellites >= 1 && maxOemSatellites <= 100) {
      settingsManager.maxOemSatellites = maxOemSatellites;
    }

    const maxNotionalDebris = parseInt((<HTMLInputElement>getEl('performance-maxNotionalDebris')).value);

    if (!isNaN(maxNotionalDebris) && maxNotionalDebris >= 10000 && maxNotionalDebris <= 500000) {
      settingsManager.maxNotionalDebris = maxNotionalDebris;
    }

    const minimumDrawDt = parseFloat((<HTMLInputElement>getEl('performance-minimumDrawDt')).value);

    if (!isNaN(minimumDrawDt) && minimumDrawDt >= 0 && minimumDrawDt <= 100) {
      settingsManager.minimumDrawDt = minimumDrawDt;
    }

    const fpsThrottle1 = parseInt((<HTMLInputElement>getEl('performance-fpsThrottle1')).value);

    if (!isNaN(fpsThrottle1) && fpsThrottle1 >= 0 && fpsThrottle1 <= 60) {
      settingsManager.fpsThrottle1 = fpsThrottle1;
    }

    const fpsThrottle2 = parseInt((<HTMLInputElement>getEl('performance-fpsThrottle2')).value);

    if (!isNaN(fpsThrottle2) && fpsThrottle2 >= 0 && fpsThrottle2 <= 60) {
      settingsManager.fpsThrottle2 = fpsThrottle2;
    }

    SettingsManager.preserveSettings();
    uiManagerInstance.toast('Performance settings updated! Some changes may require a page refresh.', ToastMsgType.normal);
  }
}
