import { MenuMode } from '@app/engine/core/interfaces';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { slideInRight, slideOutLeft } from '@app/engine/utils/slide';
import wifiFindPng from '@public/img/icons/wifi-find.png';

import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { BaseObject, DEG2RAD, Degrees, DetailedSensor, EpochUTC, Kilometers, RAE, Radians, SpaceObjectType, ZoomValue, eci2rae } from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/sounds';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class ShortTermFences extends KeepTrackPlugin {
  readonly id = 'ShortTermFences';
  dependencies_: string[] = [SatInfoBox.name, SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  bottomIconImg = wifiFindPng;
  isRequireSensorSelected = true;
  isAddStfLinksOnce = false;

  dragOptions: ClickDragOptions = {
    minWidth: 600,
    maxWidth: 1000,
    isDraggable: true,
  };

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  sideMenuElementName = 'stf-menu';
  sideMenuElementHtml: string = html`
  <div id="stf-menu" class="side-menu-parent start-hidden text-select">
    <div id="stf-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Short Term Fence</h5>
        <form id="stfForm">
          <div class="row">
            <div id="stf-az-div" class=" input-field col s4" data-position="top" data-delay="50" data-tooltip="Search Center Azimuth Point in degrees (ex: 50)">
              <input id="stf-az" type="text" value="50" />
              <label for="stf-az" class="active">Center Azimuth</label>
            </div>
            <div id="stf-azExt-div" class=" input-field col s4" data-position="top" data-delay="50" data-tooltip="Total Extent Outside of Center Azimuth in degrees (ex: 4)">
              <input id="stf-azExt" type="text" value="4" />
              <label for="stf-azExt" class="active">Azimuth Extent (deg)</label>
            </div>
            <div id="stf-azExtKm-div" class=" input-field col s4" data-position="top" data-delay="50"
            data-tooltip="Total Extent Outside of Center Azimuth in kilometers (ex: 120)">
              <input id="stf-azExtKm" type="text" value="4" disabled/>
              <label for="stf-azExtKm" class="active">Azimuth Extent (km)</label>
            </div>
          </div>
          <div class="row">
            <div id="stf-el-div" class=" input-field col s4" data-position="top" data-delay="50" data-tooltip="Search Center Elevation Point in degrees (ex: 20)">
              <input id="stf-el" type="text" value="20" />
              <label for="stf-el" class="active">Center Elevation</label>
            </div>
            <div id="stf-elExt-div" class=" input-field col s4" data-position="top" data-delay="50" data-tooltip="Total Extent Outside of Center Elevation in degrees (ex: 4)">
              <input id="stf-elExt" type="text" value="4" />
              <label for="stf-elExt" class="active">Elevation Extent (deg)</label>
            </div>
            <div id="stf-elExtKm-div" class=" input-field col s4" data-position="top" data-delay="50"
              data-tooltip="Total Extent Outside of Center Elevation in kilometers (ex: 120)">
              <input id="stf-elExtKm" type="text" value="4" disabled/>
              <label for="stf-elExtKm" class="active">Elevation Extent (km)</label>
            </div>
          </div>
          <div class="row">
            <div id="stf-rng-div" class=" input-field col s4" data-position="top" data-delay="50" data-tooltip="Search Center Range Point in kilometers (ex: 1000)">
              <input id="stf-rng" type="text" value="1000" />
              <label for="stf-rng" class="active">Center Range</label>
            </div>
            <div id="stf-rngExt-div" class=" input-field col s4" data-position="top" data-delay="50" data-tooltip="Total Extent Outside of Center Range in kilometers (ex: 100)">
              <input id="stf-rngExt" type="text" value="100" />
              <label for="stf-rngExt" class="active">Range Extent</label>
            </div>
          </div>
          <div class="row" style="display: flex; justify-content: space-evenly;">
            <button id="stf-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Create New STF &#9658;</button>
            <button id="stf-remove-last" class="btn btn-ui waves-effect waves-light" type="button" name="action">Remove Last &#9658;</button>
            <button id="stf-clear-all" class="btn btn-ui waves-effect waves-light" type="button" name="action">Clear All STFs &#9658;</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (!obj?.isSatellite()) {
          hideEl('stf-on-object-link');

          return;
        }
        showEl('stf-on-object-link');

        if (PluginRegistry.getPlugin(SatInfoBox) && !this.isAddStfLinksOnce) {
          getEl('actions-section')?.insertAdjacentHTML(
            'beforeend',
            html`
            <div id="stf-on-object-link" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
                  data-tooltip="Visualize Sensor Search Capability">Build Short Term Fence on this object...</div>
            `,
          );
          getEl('stf-on-object-link')?.addEventListener('click', this.stfOnObjectLinkClick_.bind(this));
          this.isAddStfLinksOnce = true;
        }
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('stfForm')?.addEventListener('submit', (e: Event) => {
          e.preventDefault();
          ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
          this.onSubmit_.bind(this)();
        });
        getEl('stf-remove-last')?.addEventListener('click', () => {
          ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
          ServiceLocator.getSensorManager().removeStf();
        });
        getEl('stf-clear-all')?.addEventListener('click', () => {
          ServiceLocator.getSoundManager()?.play(SoundNames.MENU_BUTTON);
          ServiceLocator.getSensorManager().clearStf();
        });

        getEl('stf-azExt')?.addEventListener('blur', () => {
          const centerAz = parseFloat((<HTMLInputElement>getEl('stf-az')).value);
          const centerEl = parseFloat((<HTMLInputElement>getEl('stf-el')).value);
          const rng = parseFloat((<HTMLInputElement>getEl('stf-rng')).value);

          let azExtDeg = parseFloat((<HTMLInputElement>getEl('stf-azExt')).value);

          if (azExtDeg > 80) {
            azExtDeg = 80;
            (<HTMLInputElement>getEl('stf-azExt')).value = azExtDeg.toFixed(1);
          }

          const epoch = EpochUTC.fromDateTime(ServiceLocator.getTimeManager().simulationTimeObj);
          const siteJ2000 = ServiceLocator.getSensorManager().currentSensors[0].toGeodetic().toITRF(epoch).toJ2000();
          const pt1 = new RAE(epoch, rng as Kilometers, ((centerAz - azExtDeg / 2) * DEG2RAD) as Radians, (centerEl * DEG2RAD) as Radians).position(siteJ2000);
          const pt2 = new RAE(
            EpochUTC.fromDateTime(ServiceLocator.getTimeManager().simulationTimeObj),
            rng as Kilometers,
            ((centerAz + azExtDeg / 2) * DEG2RAD) as Radians,
            (centerEl * DEG2RAD) as Radians,
          ).position(siteJ2000);

          // Calculate the distance between the two points
          const azKm = Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2 + (pt1.z - pt2.z) ** 2);

          (<HTMLInputElement>getEl('stf-azExtKm')).value = azKm.toFixed(1);
        });
        getEl('stf-elExt')?.addEventListener('blur', () => {
          const centerAz = parseFloat((<HTMLInputElement>getEl('stf-az')).value);
          const centerEl = parseFloat((<HTMLInputElement>getEl('stf-el')).value);
          const rng = parseFloat((<HTMLInputElement>getEl('stf-rng')).value);

          let elExtDeg = parseFloat((<HTMLInputElement>getEl('stf-elExt')).value);

          if (elExtDeg > 80) {
            elExtDeg = 80;
            (<HTMLInputElement>getEl('stf-elExt')).value = elExtDeg.toFixed(1);
          }

          const epoch = EpochUTC.fromDateTime(ServiceLocator.getTimeManager().simulationTimeObj);
          const siteJ2000 = ServiceLocator.getSensorManager().currentSensors[0].toGeodetic().toITRF(epoch).toJ2000();
          const pt1 = new RAE(epoch, rng as Kilometers, (centerAz * DEG2RAD) as Radians, ((centerEl - elExtDeg / 2) * DEG2RAD) as Radians).position(siteJ2000);
          const pt2 = new RAE(
            EpochUTC.fromDateTime(ServiceLocator.getTimeManager().simulationTimeObj),
            rng as Kilometers,
            (centerAz * DEG2RAD) as Radians,
            ((centerEl + elExtDeg / 2) * DEG2RAD) as Radians,
          ).position(siteJ2000);

          // Calculate the distance between the two points
          const elKm = Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2 + (pt1.z - pt2.z) ** 2);

          (<HTMLInputElement>getEl('stf-elExtKm')).value = elKm.toFixed(1);
        });
      },
    );

    EventBus.getInstance().on(EventBusEvent.resetSensor, this.closeAndDisable_.bind(this));

    EventBus.getInstance().on(
      EventBusEvent.setSensor,
      (sensor, id): void => {
        if (sensor === null && id === null) {
          this.closeAndDisable_();
          slideOutLeft(getEl(this.sideMenuElementName), 1000);
        } else {
          this.setBottomIconToEnabled();
        }
      },
    );
  }

  private closeAndDisable_(): void {
    this.isMenuButtonActive = false;
    this.setBottomIconToUnselected();
    this.setBottomIconToDisabled();
    ServiceLocator.getUiManager().hideSideMenus();
  }

  private onSubmit_() {
    if (!this.verifySensorSelected()) {
      return;
    }

    // Multiply everything by 1 to convert string to number
    const az = parseFloat((<HTMLInputElement>getEl('stf-az')).value);
    const azExt = parseFloat((<HTMLInputElement>getEl('stf-azExt')).value);
    const el = parseFloat((<HTMLInputElement>getEl('stf-el')).value);
    const elExt = parseFloat((<HTMLInputElement>getEl('stf-elExt')).value);
    const rng = parseFloat((<HTMLInputElement>getEl('stf-rng')).value);
    const rngExt = parseFloat((<HTMLInputElement>getEl('stf-rngExt')).value);

    const minaz = az - azExt / 2 < 0 ? ((az - azExt / 2 + 360) as Degrees) : ((az - azExt / 2) as Degrees);
    const maxaz = az + azExt / 2 > 360 ? ((az + azExt / 2 - 360) as Degrees) : ((az + azExt / 2) as Degrees);
    const minel = (el - elExt / 2) as Degrees;
    const maxel = (el + elExt / 2) as Degrees;
    const minrange = (rng - rngExt / 2) as Kilometers;
    const maxrange = (rng + rngExt / 2) as Kilometers;

    const curSensor = ServiceLocator.getSensorManager().currentSensors[0];
    const randomUUID = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const stfSensor = new DetailedSensor({
      objName: `STF-${randomUUID}`,
      lat: curSensor.lat,
      lon: curSensor.lon,
      alt: curSensor.alt,
      minAz: minaz,
      maxAz: maxaz,
      minEl: minel,
      maxEl: maxel,
      minRng: minrange,
      maxRng: maxrange,
      type: SpaceObjectType.SHORT_TERM_FENCE,
      name: 'STF',
      uiName: 'STF',
      zoom: maxrange > 6000 ? ZoomValue.GEO : ZoomValue.LEO,
      volume: true,
    });

    if (
      !curSensor.isRaeInFov({
        az: minaz,
        el: minel,
        rng: minrange,
      }) ||
      !curSensor.isRaeInFov({
        az: maxaz,
        el: maxel,
        rng: maxrange,
      })
    ) {
      errorManagerInstance.warn('STF is not in view of the sensor!');

      return;
    }

    ServiceLocator.getSensorManager().addStf(stfSensor);
  }

  private stfOnObjectLinkClick_() {
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    if (!this.verifySensorSelected()) {
      return;
    }
    if (!this.verifySatelliteSelected()) {
      return;
    }

    const now = ServiceLocator.getTimeManager().simulationTimeObj;

    if (!this.selectSatManager_) {
      errorManagerInstance.warn('No selectSatManager instance found');

      return;
    }

    const rae = eci2rae(now, this.selectSatManager_.primarySatObj.position, sensorManagerInstance.currentSensors[0]);

    (<HTMLInputElement>getEl('stf-az')).value = rae.az.toFixed(1);
    (<HTMLInputElement>getEl('stf-el')).value = rae.el.toFixed(1);
    (<HTMLInputElement>getEl('stf-rng')).value = rae.rng.toFixed(1);

    ServiceLocator.getUiManager().hideSideMenus();
    slideInRight(getEl('stf-menu'), 1000);
    this.isMenuButtonActive = true;
    this.setBottomIconToSelected();
  }
}
