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

import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ConeMesh } from '@app/engine/rendering/draw-manager/cone-mesh';
import { buildSideMenuTabsHtml, initSideMenuTabs, updateSideMenuTabIndicator } from '@app/engine/ui/side-menu-tabs';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, setInnerHtml } from '@app/engine/utils/get-el';
import { BaseObject, Degrees } from '@ootk/src/main';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import satelliteFovPng from '@public/img/icons/satellite-fov.png';
import { IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './satellite-fov.css';

const SAT_FOV_TABS_ID = 'sat-fov-tabs';

export class SatelliteFov extends KeepTrackPlugin {
  readonly id = 'SatelliteFov';
  dependencies_ = [SelectSatManager.name];
  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  bottomIconImg = satelliteFovPng;

  menuMode: MenuMode[] = [MenuMode.DISPLAY, MenuMode.ALL];

  dragOptions: ClickDragOptions = {
    isDraggable: false,
    minWidth: 350,
  };

  sideMenuElementName: string = 'satellite-fov-menu';
  sideMenuElementHtml: string = SatelliteFov.buildSideMenuHtml_();

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'C',
        callback: () => this.toggleFovCone_(),
      },
      {
        key: 'V',
        callback: () => this.toggleSatToSatCone_(),
      },
    ];
  }

  sideMenuSecondaryHtml = html`
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
    </div>
    <div class="divider"></div>
    <div class="row">
      <div class="col s12">
        <h3>Color Settings</h3>
      </div>
      <div class="input-field col s4">
        <input id="sat-fov-red" value="0.2" type="text" data-position="bottom" data-delay="50" data-tooltip="Red Color Value"
          style="text-align: center;"
        />
        <label for="sat-fov-red" class="active">R</label>
      </div>
      <div class="input-field col s4">
        <input id="sat-fov-green" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="Green Color Value"
          style="text-align: center;"
        />
        <label for="sat-fov-green" class="active">G</label>
      </div>
      <div class="input-field col s4">
        <input id="sat-fov-blue" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="Blue Color Value"
          style="text-align: center;"
        />
        <label for="sat-fov-blue" class="active">B</label>
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

  protected static buildSideMenuHtml_(): string {
    const earthCenterContent = html`
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
        <div class="input-field col s12">
            <input id="sat-fov-default-fov-angle" value="3" type="text" data-position="bottom" data-delay="50" data-tooltip="Field of View of the Sensor"
              style="text-align: center;"
            />
            <label for="sat-fov-default-fov-angle" class="active">Field of View (Degrees)</label>
        </div>
      </div>
      <div class="row">
        ${SatelliteFov.genH5Title_('Default Color Settings')}
        <div class="input-field col s4">
          <input id="sat-fov-default-red" value="0.2" type="text" data-position="bottom" data-delay="50" data-tooltip="Red Color Value"
            style="text-align: center;"
          />
          <label for="sat-fov-default-red" class="active">R</label>
        </div>
        <div class="input-field col s4">
          <input id="sat-fov-default-green" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="Green Color Value"
            style="text-align: center;"
          />
          <label for="sat-fov-default-green" class="active">G</label>
        </div>
        <div class="input-field col s4">
          <input id="sat-fov-default-blue" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="Blue Color Value"
            style="text-align: center;"
          />
          <label for="sat-fov-default-blue" class="active">B</label>
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
      <div id="sat-fov-active-cones" class="col s12">
      </div>
    </div>`;

    const satToSatContent = html`
    <div>
      <div class="row">
        ${SatelliteFov.genH5Title_('Target Satellite')}
        <div class="input-field col s12">
          <input id="sat-fov-s2s-target-scc" type="text" placeholder="e.g. 25544"
            style="text-align: center;"
          />
          <label for="sat-fov-s2s-target-scc" class="active">Target Catalog Number</label>
        </div>
        <div class="center" style="margin-bottom: 10px;">
          <button id="sat-fov-s2s-use-secondary-btn" class="btn btn-ui waves-effect waves-light btn-small menu-selectable" type="button">
            Use Secondary Sat &#9658;
          </button>
        </div>
      </div>
      <form id="sat-fov-s2s-settings-form">
        <div class="row">
          ${SatelliteFov.genH5Title_('FOV Settings')}
          <div class="input-field col s12">
            <input id="sat-fov-s2s-fov-angle" value="3" type="text" data-position="bottom" data-delay="50" data-tooltip="Field of View of the Sensor"
              style="text-align: center;"
            />
            <label for="sat-fov-s2s-fov-angle" class="active">Field of View (Degrees)</label>
          </div>
        </div>
        <div class="row">
          ${SatelliteFov.genH5Title_('Color Settings')}
          <div class="input-field col s4">
            <input id="sat-fov-s2s-red" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="Red Color Value"
              style="text-align: center;"
            />
            <label for="sat-fov-s2s-red" class="active">R</label>
          </div>
          <div class="input-field col s4">
            <input id="sat-fov-s2s-green" value="0.5" type="text" data-position="bottom" data-delay="50" data-tooltip="Green Color Value"
              style="text-align: center;"
            />
            <label for="sat-fov-s2s-green" class="active">G</label>
          </div>
          <div class="input-field col s4">
            <input id="sat-fov-s2s-blue" value="0.0" type="text" data-position="bottom" data-delay="50" data-tooltip="Blue Color Value"
              style="text-align: center;"
            />
            <label for="sat-fov-s2s-blue" class="active">B</label>
          </div>
          <div class="input-field col s12">
            <input id="sat-fov-s2s-opacity" value="0.3" type="text" data-position="bottom" data-delay="50" data-tooltip="Opacity Value"
              style="text-align: center;"
            />
            <label for="sat-fov-s2s-opacity" class="active">Opacity</label>
          </div>
        </div>
      </form>
      <div class="center" style="margin-bottom: 10px;">
        <button id="sat-fov-s2s-create-btn" class="btn btn-ui waves-effect waves-light menu-selectable" type="button">
          Create Sat-to-Sat Cone &#9658;
        </button>
      </div>
      <div class="center">
        <button id="reset-sat-fov-s2s-cones-button" class="center-align btn btn-ui waves-effect waves-light menu-selectable" type="button"
        style="margin: -10px 0px 10px 0px;">
          Reset Sat-to-Sat Cones &#9658;
        </button>
      </div>
      <div class="row">
        ${SatelliteFov.genH5Title_('Active Sat-to-Sat Cones')}
        <div id="sat-fov-s2s-active-cones" class="col s12">
        </div>
      </div>
    </div>`;

    return buildSideMenuTabsHtml(SAT_FOV_TABS_ID, [
      { id: 'sat-fov-earth-center-tab', label: 'Earth Center', content: earthCenterContent },
      { id: 'sat-fov-s2s-tab', label: 'Sat-to-Sat', content: satToSatContent },
    ]);
  }

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  onBottomIconClick(): void {
    updateSideMenuTabIndicator(SAT_FOV_TABS_ID);
  }

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => this.uiManagerFinal_(),
    );
  }

  protected uiManagerFinal_(): void {
    initSideMenuTabs(SAT_FOV_TABS_ID);

    // Earth Center tab listeners
    getEl('sat-fov-settings-form')?.addEventListener('change', this.handleFormChange_.bind(this));
    getEl('sat-fov-settings-form')?.addEventListener('submit', this.handleFormChange_.bind(this));

    getEl('sat-fov-settings-default-form')?.addEventListener('change', this.handleDefaultFormChange_.bind(this));
    getEl('sat-fov-settings-default-form')?.addEventListener('submit', this.handleDefaultFormChange_.bind(this));

    getEl('reset-sat-fov-cones-button')?.addEventListener('click', () => {
      const coneFactory = ServiceLocator.getScene().coneFactory;

      coneFactory.earthCenterMeshes.forEach((mesh) => {
        coneFactory.removeByObjectId(mesh.obj.id);
      });
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    });

    // Sat-to-Sat tab listeners
    getEl('sat-fov-s2s-use-secondary-btn')?.addEventListener('click', this.handleUseSecondarySat_.bind(this));
    getEl('sat-fov-s2s-create-btn')?.addEventListener('click', this.handleCreateSatToSat_.bind(this));

    getEl('reset-sat-fov-s2s-cones-button')?.addEventListener('click', () => {
      const coneFactory = ServiceLocator.getScene().coneFactory;

      coneFactory.satToSatMeshes.forEach((mesh) => {
        coneFactory.removeBySourceAndTarget(mesh.obj.id, mesh.targetObj!.id);
      });
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    });
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.ConeMeshUpdate, this.updateListOfFovMeshes_.bind(this));

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (sat: BaseObject) => {
        if (this.isMenuButtonActive) {
          this.updateListOfFovMeshes_();
        }

        if (sat?.isSatellite()) {
          this.isSettingsMenuEnabled_ = true;
        } else {
          this.isSettingsMenuEnabled_ = false;
        }
      },
    );
  }

  private toggleFovCone_() {
    const currentSat = PluginRegistry.getPlugin(SelectSatManager)?.getSelectedSat();

    if (currentSat) {
      const coneFactory = ServiceLocator.getScene().coneFactory;
      const cone = coneFactory.checkCacheForMesh_(currentSat);

      if (cone) {
        ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
        coneFactory.remove(cone.id);
      } else {
        ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
        coneFactory.generateMesh(currentSat);
      }
    }
  }

  private toggleSatToSatCone_() {
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);
    const currentSat = selectSatManager?.getSelectedSat();
    const secondarySat = selectSatManager?.secondarySatObj;

    if (!currentSat || !secondarySat) {
      return;
    }

    const coneFactory = ServiceLocator.getScene().coneFactory;
    const existing = coneFactory.checkCacheForMesh_(currentSat, secondarySat);

    if (existing) {
      coneFactory.removeBySourceAndTarget(currentSat.id, secondarySat.id);
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    } else {
      coneFactory.generateMesh(currentSat, {
        fieldOfView: parseFloat((getEl('sat-fov-s2s-fov-angle') as HTMLInputElement)?.value || '3') as Degrees,
        color: this.readS2sColor_(),
        targetObj: secondarySat,
      });
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    }
  }

  private handleUseSecondarySat_() {
    const secondarySat = PluginRegistry.getPlugin(SelectSatManager)?.secondarySatObj;
    const toast = ServiceLocator.getUiManager().toast.bind(ServiceLocator.getUiManager());

    if (!secondarySat) {
      toast('No secondary satellite selected. Right-click a satellite or use [ ] keys.', ToastMsgType.caution);

      return;
    }

    (getEl('sat-fov-s2s-target-scc') as HTMLInputElement).value = secondarySat.sccNum5 ?? secondarySat.id.toString();
  }

  private handleCreateSatToSat_() {
    const toast = ServiceLocator.getUiManager().toast.bind(ServiceLocator.getUiManager());
    const currentSat = PluginRegistry.getPlugin(SelectSatManager)?.getSelectedSat();

    if (!currentSat) {
      toast('Select a source satellite first.', ToastMsgType.caution);

      return;
    }

    const sccInput = (getEl('sat-fov-s2s-target-scc') as HTMLInputElement).value.trim();

    if (!sccInput) {
      toast('Enter a target catalog number.', ToastMsgType.caution);

      return;
    }

    const catalogManager = ServiceLocator.getCatalogManager();
    const targetId = catalogManager.sccNum2Id(parseInt(sccInput));

    if (targetId === null) {
      toast('Target satellite not found in catalog.', ToastMsgType.critical);

      return;
    }

    const targetObj = catalogManager.getObject(targetId);

    if (!targetObj) {
      toast('Target satellite not found in catalog.', ToastMsgType.critical);

      return;
    }

    if (targetObj.id === currentSat.id) {
      toast('Target satellite cannot be the same as source.', ToastMsgType.caution);

      return;
    }

    const fovAngle = parseFloat((getEl('sat-fov-s2s-fov-angle') as HTMLInputElement).value);

    if (isNaN(fovAngle) || fovAngle <= 0 || fovAngle > 180) {
      toast('Field of View must be a number between 0 and 180 degrees.', ToastMsgType.critical);

      return;
    }

    const coneFactory = ServiceLocator.getScene().coneFactory;

    coneFactory.generateMesh(currentSat, {
      fieldOfView: fovAngle as Degrees,
      color: this.readS2sColor_(),
      targetObj,
    });

    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
  }

  protected readS2sColor_(): [number, number, number, number] {
    return [
      parseFloat((getEl('sat-fov-s2s-red') as HTMLInputElement)?.value || '1.0'),
      parseFloat((getEl('sat-fov-s2s-green') as HTMLInputElement)?.value || '0.5'),
      parseFloat((getEl('sat-fov-s2s-blue') as HTMLInputElement)?.value || '0.0'),
      parseFloat((getEl('sat-fov-s2s-opacity') as HTMLInputElement)?.value || '0.3'),
    ];
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

    const currentSat = PluginRegistry.getPlugin(SelectSatManager)?.getSelectedSat();
    const coneFactory = ServiceLocator.getScene().coneFactory;

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
    const toast = ServiceLocator.getUiManager().toast.bind(ServiceLocator.getUiManager());

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

    ServiceLocator.getScene().coneFactory.editSettings(coneSettings);
  }

  private updateListOfFovMeshes_() {
    this.updateEarthCenterConesList_();
    this.updateSatToSatConesList_();
  }

  private updateEarthCenterConesList_() {
    const coneFactory = ServiceLocator.getScene().coneFactory;
    const meshes = coneFactory.earthCenterMeshes;

    if (meshes.length === 0) {
      getEl('reset-sat-fov-cones-button')!.setAttribute('disabled', 'true');
    } else {
      getEl('reset-sat-fov-cones-button')!.removeAttribute('disabled');
    }

    setInnerHtml('sat-fov-active-cones', meshes
      .sort((a, b) => a.obj.id - b.obj.id)
      .map((mesh) => SatelliteFov.renderEarthCenterConeRow_(mesh))
      .join(''));

    SatelliteFov.bindConeListEvents_(
      '#sat-fov-earth-center-tab .remove-sensor',
      '#sat-fov-earth-center-tab .active-cone-sensor',
      (id) => coneFactory.removeByObjectId(id),
    );
  }

  private updateSatToSatConesList_() {
    const coneFactory = ServiceLocator.getScene().coneFactory;
    const meshes = coneFactory.satToSatMeshes;

    if (meshes.length === 0) {
      getEl('reset-sat-fov-s2s-cones-button')!.setAttribute('disabled', 'true');
    } else {
      getEl('reset-sat-fov-s2s-cones-button')!.removeAttribute('disabled');
    }

    setInnerHtml('sat-fov-s2s-active-cones', meshes
      .sort((a, b) => a.obj.id - b.obj.id)
      .map((mesh) => SatelliteFov.renderSatToSatConeRow_(mesh))
      .join(''));

    SatelliteFov.bindConeListEvents_(
      '#sat-fov-s2s-tab .remove-s2s-sensor',
      '#sat-fov-s2s-tab .active-s2s-cone-sensor',
      (id, targetId) => coneFactory.removeBySourceAndTarget(id, targetId),
    );
  }

  private static renderEarthCenterConeRow_(mesh: ConeMesh): string {
    const currentSat = PluginRegistry.getPlugin(SelectSatManager)?.getSelectedSat();
    const isSelected = currentSat && mesh.obj.id === currentSat.id;
    const nameSpan = isSelected
      ? html`<span style="color: var(--color-dark-text-accent);">${mesh.obj.name}</span>`
      : html`<span>${mesh.obj.name}</span>`;

    return html`
    <div class="link" style="display: flex; align-items: center;margin: 0rem 1rem;justify-content: space-around;">
        <div class="active-cone-sensor col s10 m10 l10" data-id="${mesh.obj.id.toString()}">
          ${nameSpan}
        </div>
        <div class="col s2 m2 l2 center-align remove-icon" style="display: flex; align-items: center; height: 100%;">
          <img class="remove-sensor" data-id="${mesh.obj.id.toString()}" src="${bookmarkRemovePng}" style="cursor: pointer;"></img>
        </div>
    </div>
    `;
  }

  private static renderSatToSatConeRow_(mesh: ConeMesh): string {
    const currentSat = PluginRegistry.getPlugin(SelectSatManager)?.getSelectedSat();
    const isSelected = currentSat && mesh.obj.id === currentSat.id;
    const sourceName = mesh.obj.name;
    const targetName = mesh.targetObj?.name ?? 'Unknown';
    const label = `${sourceName} → ${targetName}`;
    const nameSpan = isSelected
      ? html`<span style="color: var(--color-dark-text-accent);">${label}</span>`
      : html`<span>${label}</span>`;

    return html`
    <div class="link" style="display: flex; align-items: center;margin: 0rem 1rem;justify-content: space-around;">
        <div class="active-s2s-cone-sensor col s10 m10 l10"
          data-id="${mesh.obj.id.toString()}"
          data-target-id="${(mesh.targetObj?.id ?? -1).toString()}">
          ${nameSpan}
        </div>
        <div class="col s2 m2 l2 center-align remove-icon" style="display: flex; align-items: center; height: 100%;">
          <img class="remove-s2s-sensor" data-id="${mesh.obj.id.toString()}"
            data-target-id="${(mesh.targetObj?.id ?? -1).toString()}"
            src="${bookmarkRemovePng}" style="cursor: pointer;"></img>
        </div>
    </div>
    `;
  }

  private static bindConeListEvents_(
    removeSelector: string,
    coneSelector: string,
    removeFn: (id: number, targetId: number) => void,
  ) {
    document.querySelectorAll(removeSelector).forEach((icon) => {
      icon.addEventListener('click', (e) => {
        const el = e.target as HTMLElement;
        const id = parseInt(el.dataset.id ?? '-1', 10);
        const targetId = parseInt(el.dataset.targetId ?? '-1', 10);

        removeFn(id, targetId);
        ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
      });
    });

    document.querySelectorAll(coneSelector).forEach((cone) => {
      cone.addEventListener('click', (e) => {
        let id = parseInt((e.target as HTMLElement).dataset.id ?? '-1', 10);

        if (!id) {
          id = parseInt((e.target as HTMLElement).parentElement?.dataset.id ?? '-1', 10);
        }

        if (!id) {
          return;
        }

        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(id);
      });
    });
  }
}
