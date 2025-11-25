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

export class DataMenuPlugin extends KeepTrackPlugin {
  readonly id = 'DataMenuPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.SETTINGS, MenuMode.ALL];

  bottomIconElementName: string = 'data-menu-icon';
  bottomIconImg = settingsPng;
  sideMenuElementName: string = 'data-menu';
  sideMenuElementHtml: string = html`
  <div id="data-menu" class="side-menu-parent start-hidden text-select">
    <div id="data-content" class="side-menu">
      <div class="row">
        <form id="data-form">
          <div class="row center">
            <button id="data-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Update Data Settings &#9658;</button>
          </div>
          <div class="row center">
            <button id="data-reset" class="btn btn-ui waves-effect waves-light" type="button" name="action">Reset to Defaults &#9658;</button>
          </div>

          <h5 class="center-align">TLE Data Sources</h5>
          <div class="row">
            <div class="input-field col s12">
              <input value="" id="data-externalTLEs" type="text" data-position="top" data-delay="50" data-tooltip="URL for external TLE source" />
              <label for="data-externalTLEs" class="active">External TLE URL</label>
            </div>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Use only external TLEs">
              <input id="data-externalTLEsOnly" type="checkbox"/>
              <span class="lever"></span>
              External TLEs Only
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Supplement external TLEs with default source">
              <input id="data-isSupplementExternal" type="checkbox"/>
              <span class="lever"></span>
              Supplement External TLEs
            </label>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Catalog Selection</h5>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Use debris catalog instead of full catalog">
              <input id="data-useDebrisCatalog" type="checkbox"/>
              <span class="lever"></span>
              Use Debris Catalog
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Enable JSC Vimpel catalog">
              <input id="data-enableJscCatalog" type="checkbox" checked/>
              <span class="lever"></span>
              Enable JSC Catalog
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Disable extra JSON catalog (offline mode)">
              <input id="data-disableExtraCatalog" type="checkbox" checked/>
              <span class="lever"></span>
              Disable Extra Catalog
            </label>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Site Data</h5>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Disable loading of control site data">
              <input id="data-disableControlSites" type="checkbox" checked/>
              <span class="lever"></span>
              Disable Control Sites
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Disable loading of launch site data">
              <input id="data-disableLaunchSites" type="checkbox"/>
              <span class="lever"></span>
              Disable Launch Sites
            </label>
          </div>
          <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Disable loading of sensor data">
              <input id="data-disableSensors" type="checkbox"/>
              <span class="lever"></span>
              Disable Sensors
            </label>
          </div>

          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <h5 class="center-align">Server Configuration</h5>
          <div class="row">
            <div class="input-field col s12">
              <input value="https://telemetry.keeptrack.space" id="data-telemetryServer" type="text" data-position="top" data-delay="50" data-tooltip="Telemetry server URL" />
              <label for="data-telemetryServer" class="active">Telemetry Server</label>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s12">
              <input value="https://user.keeptrack.space" id="data-userServer" type="text" data-position="top" data-delay="50" data-tooltip="User server URL" />
              <label for="data-userServer" class="active">User Server</label>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();
    getEl('data-form')?.addEventListener('change', DataMenuPlugin.onFormChange_);
    getEl('data-form')?.addEventListener('submit', DataMenuPlugin.onSubmit_);
    getEl('data-reset')?.addEventListener('click', DataMenuPlugin.resetToDefaults);
  }

  addJs(): void {
    super.addJs();
    setTimeout(() => DataMenuPlugin.syncOnLoad(), 100);
  }

  static syncOnLoad() {
    const dataSettings = [
      { id: 'data-externalTLEsOnly', setting: 'dataSources.externalTLEsOnly' },
      { id: 'data-isSupplementExternal', setting: 'dataSources.isSupplementExternal' },
      { id: 'data-useDebrisCatalog', setting: 'isUseDebrisCatalog' },
      { id: 'data-enableJscCatalog', setting: 'isEnableJscCatalog' },
      { id: 'data-disableExtraCatalog', setting: 'isDisableExtraCatalog' },
      { id: 'data-disableControlSites', setting: 'isDisableControlSites' },
      { id: 'data-disableLaunchSites', setting: 'isDisableLaunchSites' },
      { id: 'data-disableSensors', setting: 'isDisableSensors' },
    ];

    dataSettings.forEach(({ id, setting }) => {
      const element = <HTMLInputElement>getEl(id);

      if (element) {
        const settingPath = setting.split('.');

        if (settingPath.length === 2) {
          element.checked = settingsManager[settingPath[0]][settingPath[1]];
        } else {
          element.checked = settingsManager[setting];
        }
      }
    });

    // Text settings
    const externalTLEsEl = <HTMLInputElement>getEl('data-externalTLEs');

    if (externalTLEsEl) {
      externalTLEsEl.value = settingsManager.dataSources.externalTLEs;
    }

    const telemetryServerEl = <HTMLInputElement>getEl('data-telemetryServer');

    if (telemetryServerEl) {
      telemetryServerEl.value = settingsManager.telemetryServer;
    }

    const userServerEl = <HTMLInputElement>getEl('data-userServer');

    if (userServerEl) {
      userServerEl.value = settingsManager.userServer;
    }
  }

  private static onFormChange_(e: Event) {
    const toggleIds = [
      'data-externalTLEsOnly',
      'data-isSupplementExternal',
      'data-useDebrisCatalog',
      'data-enableJscCatalog',
      'data-disableExtraCatalog',
      'data-disableControlSites',
      'data-disableLaunchSites',
      'data-disableSensors',
    ];

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

    settingsManager.dataSources.externalTLEs = '';
    settingsManager.dataSources.externalTLEsOnly = false;
    settingsManager.dataSources.isSupplementExternal = false;
    settingsManager.isUseDebrisCatalog = false;
    settingsManager.isEnableJscCatalog = true;
    settingsManager.isDisableExtraCatalog = true;
    settingsManager.isDisableControlSites = true;
    settingsManager.isDisableLaunchSites = false;
    settingsManager.isDisableSensors = false;
    settingsManager.telemetryServer = 'https://telemetry.keeptrack.space';
    settingsManager.userServer = 'https://user.keeptrack.space';

    SettingsManager.preserveSettings();
    DataMenuPlugin.syncOnLoad();
  }

  private static onSubmit_(e: SubmitEvent) {
    e.preventDefault();

    const uiManagerInstance = ServiceLocator.getUiManager();

    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    settingsManager.dataSources.externalTLEs = (<HTMLInputElement>getEl('data-externalTLEs')).value;
    settingsManager.dataSources.externalTLEsOnly = (<HTMLInputElement>getEl('data-externalTLEsOnly')).checked;
    settingsManager.dataSources.isSupplementExternal = (<HTMLInputElement>getEl('data-isSupplementExternal')).checked;
    settingsManager.isUseDebrisCatalog = (<HTMLInputElement>getEl('data-useDebrisCatalog')).checked;
    settingsManager.isEnableJscCatalog = (<HTMLInputElement>getEl('data-enableJscCatalog')).checked;
    settingsManager.isDisableExtraCatalog = (<HTMLInputElement>getEl('data-disableExtraCatalog')).checked;
    settingsManager.isDisableControlSites = (<HTMLInputElement>getEl('data-disableControlSites')).checked;
    settingsManager.isDisableLaunchSites = (<HTMLInputElement>getEl('data-disableLaunchSites')).checked;
    settingsManager.isDisableSensors = (<HTMLInputElement>getEl('data-disableSensors')).checked;
    settingsManager.telemetryServer = (<HTMLInputElement>getEl('data-telemetryServer')).value;
    settingsManager.userServer = (<HTMLInputElement>getEl('data-userServer')).value;

    SettingsManager.preserveSettings();
    uiManagerInstance.toast('Data settings updated! Page refresh required for catalog changes to take effect.', ToastMsgType.normal);
  }
}
