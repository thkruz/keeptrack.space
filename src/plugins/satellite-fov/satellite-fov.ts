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

import { KeepTrackApiEvents, MenuMode, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import satelliteFovPng from '@public/img/icons/satellite-fov.png';
import { BaseObject, Degrees } from 'ootk';
import { ClickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/SoundNames';

export class SatelliteFov extends KeepTrackPlugin {
  readonly id = 'SatelliteFov';
  dependencies_ = [SelectSatManager.name];
  bottomIconImg = satelliteFovPng;

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  dragOptions: ClickDragOptions = {
    isDraggable: false,
    minWidth: 350,
  };

  sideMenuElementName: string = 'satellite-fov-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div>
    <div class="center">
      <button id="reset-sat-fov-cones-button" class="center-align btn btn-ui waves-effect waves-light menu-selectable" type="button"
      style="margin: -10px 0px 10px 0px;">
        Reset All FOV Cones &#9658;
      </button>
    </div>
  <form id="sat-fov-settings-default-form">
    <div class="row">
      ${SatelliteFov.genH5Title_('Default Sensor Design')}
      <div class="row"></div>
      <div class="input-field col s12">
          <input id="sat-fov-default-fov-angle" value="3" type="text" data-position="bottom" data-delay="50" data-tooltip="Field of View of the Sensor"
            style="text-align: center;"
          />
          <label for="sat-fov-default-fov-angle" class="active">Field of View (Degrees)</label>
      </div>
      <div class="input-field col s12">
          <input id="sat-fov-default-range" value="Unlimited" type="text" data-position="bottom" data-delay="50" data-tooltip="Maximum Range of the Sensor" disabled
            style="text-align: center;"
          />
          <label for="sat-fov-default-fov-angle" class="active">Range (Kilometers)</label>
      </div>
    </div>
    <div class="row">
      ${SatelliteFov.genH5Title_('Default Color Settings')}
      <div class="row"></div>
      <div class="input-field col s12">
        <input id="sat-fov-default-red" value="0.2" type="text" data-position="bottom" data-delay="50" data-tooltip="Red Color Value"
          style="text-align: center;"
        />
        <label for="sat-fov-default-red" class="active">Red</label>
      </div>
      <div class="input-field col s12">
        <input id="sat-fov-default-green" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="Green Color Value"
          style="text-align: center;"
        />
        <label for="sat-fov-default-green" class="active">Green</label>
      </div>
      <div class="input-field col s12">
        <input id="sat-fov-default-blue" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="Blue Color Value"
          style="text-align: center;"
        />
        <label for="sat-fov-default-blue" class="active">Blue</label>
      </div>
      <div class="input-field col s12">
        <input id="sat-fov-default-opacity" value="0.15" type="text" data-position="bottom" data-delay="50" data-tooltip="Opacity Value"
          style="text-align: center;"
        />
        <label for="sat-fov-default-opacity" class="active">Opacity</label>
      </div>
    </div>
  </form>
  </div>
  <div class="row">
    ${SatelliteFov.genH5Title_('Active Sensors')}
    <div class="row"></div>
    <div id="sat-fov-active-cones" class="col s12">
    </div>
  </div>`;
  sideMenuSecondaryHtml = keepTrackApi.html`
  <form id="sat-fov-settings-form">
    <div class="row">
      <div class="col s12">
        <h3>Sensor Design</h3>
      </div>
      <div class="input-field col s12">
          <input id="sat-fov-fov-angle" value="3" type="text" data-position="bottom" data-delay="50" data-tooltip="Field of View of the Sensor"
            style="text-align: center;"
          />
          <label for="sat-fov-fov-angle" class="active">Field of View (Degrees)</label>
      </div>
      <div class="input-field col s12">
          <input id="sat-fov-range" value="Unlimited" type="text" data-position="bottom" data-delay="50" data-tooltip="Maximum Range of the Sensor" disabled
            style="text-align: center;"
          />
          <label for="sat-fov-fov-angle" class="active">Range (Kilometers)</label>
      </div>
    </div>
    <div class="divider"></div>
    <div class="row">
      <div class="col s12">
        <h3>Color Settings</h3>
      </div>
      <div class="input-field col s12">
        <input id="sat-fov-red" value="0.2" type="text" data-position="bottom" data-delay="50" data-tooltip="Red Color Value"
          style="text-align: center;"
        />
        <label for="sat-fov-red" class="active">Red</label>
      </div>
      <div class="input-field col s12">
        <input id="sat-fov-green" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="Green Color Value"
          style="text-align: center;"
        />
        <label for="sat-fov-green" class="active">Green</label>
      </div>
      <div class="input-field col s12">
        <input id="sat-fov-blue" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="Blue Color Value"
          style="text-align: center;"
        />
        <label for="sat-fov-blue" class="active">Blue</label>
      </div>
      <div class="input-field col s12">
        <input id="sat-fov-opacity" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="Opacity Value"
          style="text-align: center;"
        />
        <label for="sat-fov-opacity" class="active">Opacity</label>
      </div>
    </div>
  </form>
  `;

  addHtml(): void {

    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        getEl('sat-fov-settings-form').addEventListener('change', this.handleFormChange_.bind(this));
        getEl('sat-fov-settings-form').addEventListener('submit', this.handleFormChange_.bind(this));

        getEl('sat-fov-settings-default-form').addEventListener('change', this.handleDefaultFormChange_.bind(this));
        getEl('sat-fov-settings-default-form').addEventListener('submit', this.handleDefaultFormChange_.bind(this));
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        getEl('reset-sat-fov-cones-button').addEventListener('click', () => {
          keepTrackApi.getScene().coneFactory.clear();
          keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);
          getEl('reset-sat-fov-cones-button').setAttribute('disabled', 'true');
        });
      },
    });
  }

  addJs(): void {
    super.addJs();

    const keyboardManager = keepTrackApi.getInputManager().keyboard;

    keyboardManager.registerKeyEvent({
      key: 'C',
      callback: () => {
        if (keyboardManager.isShiftPressed) {
          const currentSat = keepTrackApi.getPlugin(SelectSatManager).getSelectedSat();

          if (currentSat) {
            const coneFactory = keepTrackApi.getScene().coneFactory;

            // See if it is already in the scene
            const cone = coneFactory.checkCacheForMesh_(currentSat);

            if (cone) {
              keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);
              coneFactory.remove(cone.id);
            } else {
              keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_ON);
              coneFactory.generateMesh(currentSat);
            }
          }
        }
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.ConeMeshUpdate,
      cbName: SatelliteFov.name,
      cb: () => {
        this.updateListOfFovMeshes_();
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: SatelliteFov.name,
      cb: (sat: BaseObject) => {
        this.updateListOfFovMeshes_();

        if (sat?.isSatellite()) {
          this.isSettingsMenuEnabled_ = true;
        } else {
          this.isSettingsMenuEnabled_ = false;
        }
      },
    });
  }

  private handleFormChange_() {
    const coneSettings = {
      fieldOfView: parseFloat((getEl('sat-fov-fov-angle') as HTMLInputElement).value) as Degrees,
      color: [
        parseFloat((getEl('sat-fov-red') as HTMLInputElement).value),
        parseFloat((getEl('sat-fov-green') as HTMLInputElement).value),
        parseFloat((getEl('sat-fov-blue') as HTMLInputElement).value),
        parseFloat((getEl('sat-fov-opacity') as HTMLInputElement).value),
      ] as [number, number, number, number],
    };

    const currentSat = keepTrackApi.getPlugin(SelectSatManager).getSelectedSat();
    const coneFactory = keepTrackApi.getScene().coneFactory;

    if (currentSat) {
      const cone = coneFactory.checkCacheForMesh_(currentSat);

      if (cone) {
        cone.editSettings(coneSettings);
      }
    }
  }

  private handleDefaultFormChange_() {
    const fovAngle = parseFloat((getEl('sat-fov-default-fov-angle') as HTMLInputElement).value);
    const red = parseFloat((getEl('sat-fov-default-red') as HTMLInputElement).value);
    const green = parseFloat((getEl('sat-fov-default-green') as HTMLInputElement).value);
    const blue = parseFloat((getEl('sat-fov-default-blue') as HTMLInputElement).value);
    const opacity = parseFloat((getEl('sat-fov-default-opacity') as HTMLInputElement).value);
    const toast = keepTrackApi.getUiManager().toast.bind(keepTrackApi.getUiManager());

    if (isNaN(fovAngle) || fovAngle <= 0 || fovAngle > 180) {
      toast('Field of View must be a number between 0 and 180 degrees.', ToastMsgType.critical);
      (getEl('sat-fov-default-fov-angle') as HTMLInputElement).value = '3';

      return;
    }

    if (isNaN(red) || red < 0 || red > 1) {
      toast('Red color value must be a number between 0 and 1.', ToastMsgType.critical);
      (getEl('sat-fov-default-red') as HTMLInputElement).value = '0.5';

      return;
    }

    if (isNaN(green) || green < 0 || green > 1) {
      toast('Green color value must be a number between 0 and 1.', ToastMsgType.critical);
      (getEl('sat-fov-default-green') as HTMLInputElement).value = '0.5';

      return;
    }

    if (isNaN(blue) || blue < 0 || blue > 1) {
      toast('Blue color value must be a number between 0 and 1.', ToastMsgType.critical);
      (getEl('sat-fov-default-blue') as HTMLInputElement).value = '0.5';

      return;
    }

    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
      toast('Opacity value must be a number between 0 and 1.', ToastMsgType.critical);
      (getEl('sat-fov-default-opacity') as HTMLInputElement).value = '0.15';

      return;
    }

    const coneSettings = {
      fieldOfView: fovAngle as Degrees,
      color: [red, green, blue, opacity] as [number, number, number, number],
    };

    keepTrackApi.getScene().coneFactory.editSettings(coneSettings);
  }

  private updateListOfFovMeshes_() {
    const meshes = keepTrackApi.getScene().coneFactory.meshes;

    if (meshes.length === 0) {
      getEl('reset-sat-fov-cones-button').setAttribute('disabled', 'true');
    } else {
      getEl('reset-sat-fov-cones-button').removeAttribute('disabled');
    }

    getEl('sat-fov-active-cones').innerHTML = meshes
      .sort((a, b) => a.obj.id - b.obj.id)
      .map((mesh) => {
        const currentSat = keepTrackApi.getPlugin(SelectSatManager).getSelectedSat();
        let nameSpan = '';

        if (currentSat && mesh.obj.id === currentSat.id) {
          nameSpan = keepTrackApi.html`<span style="color: var(--color-dark-text-accent);">${mesh.obj.name}</span>`;
        } else {
          nameSpan = keepTrackApi.html`<span>${mesh.obj.name}</span>`;
        }

        return keepTrackApi.html`
        <div class="link" style="
            display: flex;
            align-items: center;
        ">
            <div class="active-cone-sensor col s10 m10 l10" data-id="${mesh.obj.id.toString()}">
              ${nameSpan}
            </div>
            <div class="col s2 m2 l2 center-align remove-icon" style="display: flex; align-items: center; height: 100%;">
              <img class="remove-sensor" data-id="${mesh.obj.id.toString()}" src="${bookmarkRemovePng}" style="cursor: pointer;"></img>
            </div>
        </div>
        `;
      }).join('');

    const removeIcons = document.querySelectorAll('.remove-sensor');
    const activeCones = document.querySelectorAll('.active-cone-sensor');

    removeIcons.forEach((icon) => {
      icon.addEventListener('click', (e) => {
        const id = parseInt((e.target as HTMLElement).dataset.id, 10);

        keepTrackApi.getScene().coneFactory.removeByObjectId(id);
        keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);
      });
    });

    activeCones.forEach((cone) => {
      cone.addEventListener('click', (e) => {
        let id = parseInt((e.target as HTMLElement).dataset.id);

        // If not found try the parent
        if (!id) {
          id = parseInt((e.target as HTMLElement).parentElement.dataset.id);
        }

        if (!id) {
          return;
        }

        keepTrackApi.getPlugin(SelectSatManager).selectSat(id);
      });
    });
  }
}
