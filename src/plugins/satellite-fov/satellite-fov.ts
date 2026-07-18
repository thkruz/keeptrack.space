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
import { IHelpConfig, IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { ConeMesh } from '@app/engine/rendering/draw-manager/cone-mesh';
import { buildSideMenuTabsHtml, initSideMenuTabs, updateSideMenuTabIndicator } from '@app/engine/ui/side-menu-tabs';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, setInnerHtml } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { BaseObject, Degrees } from '@ootk/src/main';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import satelliteFovPng from '@public/img/icons/satellite-fov.png';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.SatelliteFov.${key}` as Parameters<typeof t7e>[0]);

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

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/satellite-fov/satellite-fov-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.tabsHeading'),
          content: l('help.tabs'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2')],
      shortcuts: [
        { keys: ['C'], description: l('help.shortcutToggleCone') },
        { keys: ['V'], description: l('help.shortcutToggleS2s') },
      ],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'C',
        // ctrl:false so Ctrl+Shift+C stays free for other plugins.
        ctrl: false,
        callback: () => this.toggleFovCone_(),
      },
      {
        key: 'V',
        // ctrl:false so Ctrl+Shift+V belongs to Video Director, not this toggle.
        ctrl: false,
        callback: () => this.toggleSatToSatCone_(),
      },
    ];
  }

  sideMenuSecondaryHtml = html`
  <form id="sat-fov-settings-form">
    <section class="kt-section">
      <div class="kt-section-label">${l('labels.sensorDesign')}</div>
      <div class="kt-field-row">
        <div class="input-field col s12">
            <input id="sat-fov-fov-angle" value="3" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.fovOfSensor')}"
              style="text-align: center;"
            />
            <label for="sat-fov-fov-angle" class="active">${l('labels.fovDegrees')}</label>
        </div>
      </div>
    </section>
    <section class="kt-section">
      <div class="kt-section-label">${l('labels.colorSettings')}</div>
      <div class="kt-field-row">
        <div class="input-field col s4">
          <input id="sat-fov-red" value="0.2" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.red')}"
            style="text-align: center;"
          />
          <label for="sat-fov-red" class="active">R</label>
        </div>
        <div class="input-field col s4">
          <input id="sat-fov-green" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.green')}"
            style="text-align: center;"
          />
          <label for="sat-fov-green" class="active">G</label>
        </div>
        <div class="input-field col s4">
          <input id="sat-fov-blue" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.blue')}"
            style="text-align: center;"
          />
          <label for="sat-fov-blue" class="active">B</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <input id="sat-fov-opacity" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.opacity')}"
            style="text-align: center;"
          />
          <label for="sat-fov-opacity" class="active">${l('labels.opacity')}</label>
        </div>
      </div>
    </section>
  </form>
  `;

  protected static buildSideMenuHtml_(): string {
    const earthCenterContent = html`
    <form id="sat-fov-settings-default-form">
      <section class="kt-section">
        <div class="kt-section-label">${l('labels.defaultSensorDesign')}</div>
        <div class="kt-field-row">
          <div class="input-field col s12">
              <input id="sat-fov-default-fov-angle" value="3" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.fovOfSensor')}"
                style="text-align: center;"
              />
              <label for="sat-fov-default-fov-angle" class="active">${l('labels.fovDegrees')}</label>
          </div>
        </div>
      </section>
      <section class="kt-section">
        <div class="kt-section-label">${l('labels.defaultColorSettings')}</div>
        <div class="kt-field-row">
          <div class="input-field col s4">
            <input id="sat-fov-default-red" value="0.2" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.red')}"
              style="text-align: center;"
            />
            <label for="sat-fov-default-red" class="active">R</label>
          </div>
          <div class="input-field col s4">
            <input id="sat-fov-default-green" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.green')}"
              style="text-align: center;"
            />
            <label for="sat-fov-default-green" class="active">G</label>
          </div>
          <div class="input-field col s4">
            <input id="sat-fov-default-blue" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.blue')}"
              style="text-align: center;"
            />
            <label for="sat-fov-default-blue" class="active">B</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input id="sat-fov-default-opacity" value="0.15" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.opacity')}"
              style="text-align: center;"
            />
            <label for="sat-fov-default-opacity" class="active">${l('labels.opacity')}</label>
          </div>
        </div>
      </section>
    </form>
    <section class="kt-section">
      <div class="kt-section-label">${l('labels.activeSensors')}</div>
      <button id="reset-sat-fov-cones-button" class="kt-action waves-effect" type="button">
        <span class="kt-action-label">${l('buttons.resetAllFovCones')}</span>
      </button>
      <div id="sat-fov-active-cones">
      </div>
    </section>`;

    const satToSatContent = html`
    <section class="kt-section">
      <div class="kt-section-label">${l('labels.targetSatellite')}</div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <input id="sat-fov-s2s-target-scc" type="text" placeholder="e.g. 25544"
            style="text-align: center;"
          />
          <label for="sat-fov-s2s-target-scc" class="active">${l('labels.targetCatalogNumber')}</label>
        </div>
      </div>
      <button id="sat-fov-s2s-use-secondary-btn" class="kt-action waves-effect" type="button">
        <span class="kt-action-label">${l('buttons.useSecondarySat')}</span>
      </button>
    </section>
    <form id="sat-fov-s2s-settings-form">
      <section class="kt-section">
        <div class="kt-section-label">${l('labels.fovSettings')}</div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input id="sat-fov-s2s-fov-angle" value="3" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.fovOfSensor')}"
              style="text-align: center;"
            />
            <label for="sat-fov-s2s-fov-angle" class="active">${l('labels.fovDegrees')}</label>
          </div>
        </div>
      </section>
      <section class="kt-section">
        <div class="kt-section-label">${l('labels.colorSettings')}</div>
        <div class="kt-field-row">
          <div class="input-field col s4">
            <input id="sat-fov-s2s-red" value="1.0" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.red')}"
              style="text-align: center;"
            />
            <label for="sat-fov-s2s-red" class="active">R</label>
          </div>
          <div class="input-field col s4">
            <input id="sat-fov-s2s-green" value="0.5" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.green')}"
              style="text-align: center;"
            />
            <label for="sat-fov-s2s-green" class="active">G</label>
          </div>
          <div class="input-field col s4">
            <input id="sat-fov-s2s-blue" value="0.0" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.blue')}"
              style="text-align: center;"
            />
            <label for="sat-fov-s2s-blue" class="active">B</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input id="sat-fov-s2s-opacity" value="0.3" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('tooltips.opacity')}"
              style="text-align: center;"
            />
            <label for="sat-fov-s2s-opacity" class="active">${l('labels.opacity')}</label>
          </div>
        </div>
      </section>
    </form>
    <section class="kt-section">
      <div class="kt-section-label">${l('labels.activeS2sCones')}</div>
      <button id="sat-fov-s2s-create-btn" class="kt-action waves-effect" type="button">
        <span class="kt-action-label">${l('buttons.createS2sCone')}</span>
      </button>
      <button id="reset-sat-fov-s2s-cones-button" class="kt-action waves-effect" type="button">
        <span class="kt-action-label">${l('buttons.resetS2sCones')}</span>
      </button>
      <div id="sat-fov-s2s-active-cones">
      </div>
    </section>`;

    return buildSideMenuTabsHtml(SAT_FOV_TABS_ID, [
      { id: 'sat-fov-earth-center-tab', label: l('tabs.earthCenter'), content: earthCenterContent },
      { id: 'sat-fov-s2s-tab', label: l('tabs.satToSat'), content: satToSatContent },
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
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => this.uiManagerFinal_());
  }

  protected uiManagerFinal_(): void {
    // v13 marker: the wrappers are generated, not authored. (The Pro subclass
    // authors its own root with the marker and overrides this method.)
    getEl('satellite-fov-menu')?.classList.add('kt-ui-v13');
    getEl('satellite-fov-menu-secondary', true)?.classList.add('kt-ui-v13');

    initSideMenuTabs(SAT_FOV_TABS_ID);

    // Earth Center tab listeners
    getEl('sat-fov-settings-form')?.addEventListener('change', this.handleFormChange_.bind(this));
    getEl('sat-fov-settings-form')?.addEventListener('submit', this.handleFormChange_.bind(this));

    getEl('sat-fov-settings-default-form')?.addEventListener('change', this.handleDefaultFormChange_.bind(this));
    getEl('sat-fov-settings-default-form')?.addEventListener('submit', this.handleDefaultFormChange_.bind(this));

    getEl('reset-sat-fov-cones-button')?.addEventListener('click', () => {
      const coneFactory = ServiceLocator.getScene().coneFactory;

      coneFactory.earthCenterMeshes.forEach((mesh) => {
        coneFactory.removeBySourceAndTarget(mesh.obj.id, -1);
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

    this.addMeshEventListeners_();
  }

  /**
   * Registers the mesh-update and selection listeners.
   * Protected so subclasses (e.g. the pro plugin) can replace the wiring
   * without bypassing the KeepTrackPlugin lifecycle.
   */
  protected addMeshEventListeners_(): void {
    EventBus.getInstance().on(EventBusEvent.ConeMeshUpdate, this.updateListOfFovMeshes_.bind(this));

    EventBus.getInstance().on(EventBusEvent.selectSatData, (sat: BaseObject) => {
      if (this.isMenuButtonActive) {
        this.updateListOfFovMeshes_();
      }

      if (sat?.isSatellite()) {
        this.isSettingsMenuEnabled_ = true;
      } else {
        this.isSettingsMenuEnabled_ = false;
      }
    });
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
        fieldOfView: this.readS2sFov_(),
        color: this.readS2sColor_(),
        targetObj: secondarySat,
      });
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    }
  }

  /**
   * Reads the sat-to-sat field of view from the UI.
   * Protected so subclasses with different form layouts can override the source field.
   */
  protected readS2sFov_(): Degrees {
    return parseFloat((getEl('sat-fov-s2s-fov-angle') as HTMLInputElement)?.value || '3') as Degrees;
  }

  private handleUseSecondarySat_() {
    const secondarySat = PluginRegistry.getPlugin(SelectSatManager)?.secondarySatObj;
    const toast = ServiceLocator.getUiManager().toast.bind(ServiceLocator.getUiManager());

    if (!secondarySat) {
      toast(l('errorMsgs.noSecondary'), ToastMsgType.caution);

      return;
    }

    // Display the canonical sccNum. sccNum5 is null for extended (7+ digit) IDs;
    // fall back to sccNum, NOT the internal numeric id which is meaningless to users.
    (getEl('sat-fov-s2s-target-scc') as HTMLInputElement).value = secondarySat.sccNum5 ?? secondarySat.sccNum;
  }

  private handleCreateSatToSat_() {
    const toast = ServiceLocator.getUiManager().toast.bind(ServiceLocator.getUiManager());
    const currentSat = PluginRegistry.getPlugin(SelectSatManager)?.getSelectedSat();

    if (!currentSat) {
      toast(l('errorMsgs.selectSourceFirst'), ToastMsgType.caution);

      return;
    }

    const sccInput = (getEl('sat-fov-s2s-target-scc') as HTMLInputElement).value.trim();

    if (!sccInput) {
      toast(l('errorMsgs.enterTargetNumber'), ToastMsgType.caution);

      return;
    }

    const catalogManager = ServiceLocator.getCatalogManager();
    // sccNum2Id handles numeric / alpha-5 / extended; parseInt would drop alpha-5.
    const targetId = catalogManager.sccNum2Id(sccInput);

    if (targetId === null) {
      toast(l('errorMsgs.targetNotFound'), ToastMsgType.critical);

      return;
    }

    const targetObj = catalogManager.getObject(targetId);

    if (!targetObj) {
      toast(l('errorMsgs.targetNotFound'), ToastMsgType.critical);

      return;
    }

    if (targetObj.id === currentSat.id) {
      toast(l('errorMsgs.targetSameAsSource'), ToastMsgType.caution);

      return;
    }

    const fovAngle = parseFloat((getEl('sat-fov-s2s-fov-angle') as HTMLInputElement).value);

    if (isNaN(fovAngle) || fovAngle <= 0 || fovAngle > 180) {
      toast(l('errorMsgs.fovRange'), ToastMsgType.critical);

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
      toast(l('errorMsgs.fovRange'), ToastMsgType.critical);
      (getEl('sat-fov-default-fov-angle') as HTMLInputElement).value = '3';

      return;
    }

    if (isNaN(red) || red < 0 || red > 1) {
      toast(l('errorMsgs.redRange'), ToastMsgType.critical);
      (getEl('sat-fov-default-red') as HTMLInputElement).value = '0.5';

      return;
    }

    if (isNaN(green) || green < 0 || green > 1) {
      toast(l('errorMsgs.greenRange'), ToastMsgType.critical);
      (getEl('sat-fov-default-green') as HTMLInputElement).value = '0.5';

      return;
    }

    if (isNaN(blue) || blue < 0 || blue > 1) {
      toast(l('errorMsgs.blueRange'), ToastMsgType.critical);
      (getEl('sat-fov-default-blue') as HTMLInputElement).value = '0.5';

      return;
    }

    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
      toast(l('errorMsgs.opacityRange'), ToastMsgType.critical);
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

    setInnerHtml(
      'sat-fov-active-cones',
      meshes
        .sort((a, b) => a.obj.id - b.obj.id)
        .map((mesh) => SatelliteFov.renderEarthCenterConeRow_(mesh))
        .join('')
    );

    SatelliteFov.bindConeListEvents_(
      '#sat-fov-earth-center-tab .remove-sensor',
      '#sat-fov-earth-center-tab .active-cone-sensor',
      // A targetId of -1 matches the earth-center cone exactly, so a satellite with
      // both an earth-center and a sat-to-sat cone never loses the wrong one
      (id) => coneFactory.removeBySourceAndTarget(id, -1)
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

    setInnerHtml(
      'sat-fov-s2s-active-cones',
      meshes
        .sort((a, b) => a.obj.id - b.obj.id)
        .map((mesh) => SatelliteFov.renderSatToSatConeRow_(mesh))
        .join('')
    );

    SatelliteFov.bindConeListEvents_('#sat-fov-s2s-tab .remove-s2s-sensor', '#sat-fov-s2s-tab .active-s2s-cone-sensor', (id, targetId) =>
      coneFactory.removeBySourceAndTarget(id, targetId)
    );
  }

  private static renderEarthCenterConeRow_(mesh: ConeMesh): string {
    const currentSat = PluginRegistry.getPlugin(SelectSatManager)?.getSelectedSat();
    const isSelected = currentSat && mesh.obj.id === currentSat.id;
    const nameSpan = isSelected ? html`<span style="color: var(--color-dark-text-accent);">${mesh.obj.name}</span>` : html`<span>${mesh.obj.name}</span>`;

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
    const targetName = mesh.targetObj?.name ?? t7e('Common.unknown');
    const label = `${sourceName} → ${targetName}`;
    const nameSpan = isSelected ? html`<span style="color: var(--color-dark-text-accent);">${label}</span>` : html`<span>${label}</span>`;

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

  private static bindConeListEvents_(removeSelector: string, coneSelector: string, removeFn: (id: number, targetId: number) => void) {
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
        let id = parseInt((e.target as HTMLElement).dataset.id ?? '', 10);

        if (isNaN(id)) {
          id = parseInt((e.target as HTMLElement).parentElement?.dataset.id ?? '', 10);
        }

        // id 0 is a valid object id, so check the parse explicitly instead of truthiness
        if (isNaN(id) || id < 0) {
          return;
        }

        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(id);
      });
    });
  }
}
