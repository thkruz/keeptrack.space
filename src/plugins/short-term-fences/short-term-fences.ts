import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { slideInRight, slideOutLeft } from '@app/lib/slide';
import searchPng from '@public/img/icons/search.png';

import { ZoomValue } from '@app/singletons/camera';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { BaseObject, Degrees, DetailedSensor, Kilometers, SpaceObjectType, eci2rae } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SatInfoBox } from '../select-sat-manager/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SensorFov } from '../sensor-fov/sensor-fov';
import { SoundNames } from '../sounds/SoundNames';

export class ShortTermFences extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Short Term Fences';
  dependencies: string[] = [SatInfoBox.PLUGIN_NAME, SelectSatManager.PLUGIN_NAME];
  private selectSatManager_: SelectSatManager;

  constructor() {
    super(ShortTermFences.PLUGIN_NAME);
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  bottomIconElementName = 'stf-bottom-icon';
  bottomIconLabel = 'Short Term Fence';
  bottomIconImg = searchPng;
  isRequireSensorSelected = true;
  // isIconDisabledOnLoad = true;
  isAddStfLinksOnce = false;

  helpTitle = `Short Term Fences (STF) Menu`;
  helpBody = keepTrackApi.html`The Short Term Fences (STF) Menu is used for visualizing sensor search boxes.
  <br><br>
  This is unlikely to be very helpful unless you own/operate a sensor with a search box functionality.`;

  sideMenuElementName = 'stf-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="stf-menu" class="side-menu-parent start-hidden text-select">
    <div id="stf-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Short Term Fence</h5>
        <form id="stfForm">
          <div id="stf-az-div" class=" input-field col s12" data-position="top" data-delay="50" data-tooltip="Search Center Azimuth Point in degrees (ex: 50)">
            <input id="stf-az" type="text" value="50" />
            <label for="stf-az" class="active">Center Azimuth</label>
          </div>
          <div id="stf-azExt-div" class=" input-field col s12" data-position="top" data-delay="50" data-tooltip="Total Extent Outside of Center Azimuth in degrees (ex: 4)">
            <input id="stf-azExt" type="text" value="4" />
            <label for="stf-azExt" class="active">Azimuth Extent</label>
          </div>
          <div id="stf-el-div" class=" input-field col s12" data-position="top" data-delay="50" data-tooltip="Search Center Elevation Point in degrees (ex: 20)">
            <input id="stf-el" type="text" value="20" />
            <label for="stf-el" class="active">Center Elevation</label>
          </div>
          <div id="stf-elExt-div" class=" input-field col s12" data-position="top" data-delay="50" data-tooltip="Total Extent Outside of Center Elevation in degrees (ex: 4)">
            <input id="stf-elExt" type="text" value="4" />
            <label for="stf-elExt" class="active">Elevation Extent</label>
          </div>
          <div id="stf-rng-div" class=" input-field col s12" data-position="top" data-delay="50" data-tooltip="Search Center Range Point in kilometers (ex: 1000)">
            <input id="stf-rng" type="text" value="1000" />
            <label for="stf-rng" class="active">Center Range</label>
          </div>
          <div id="stf-rngExt-div" class=" input-field col s12" data-position="top" data-delay="50" data-tooltip="Total Extent Outside of Center Range in kilometers (ex: 100)">
            <input id="stf-rngExt" type="text" value="100" />
            <label for="stf-rngExt" class="active">Range Extent</label>
          </div>
          <div class="center-align">
            <button id="stf-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Create New STF &#9658;</button>
          </div>
        </form>
        <br>
        <div class="center-align">
          <button id="stf-remove-last" class="btn btn-ui waves-effect waves-light" type="button" name="action">Remove Last &#9658;</button>
        </div>
        <br>
        <div class="center-align">
          <button id="stf-clear-all" class="btn btn-ui waves-effect waves-light" type="button" name="action">Clear All STFs &#9658;</button>
        </div>
      </div>
    </div>
  </div>`;

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (obj: BaseObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (obj === null || typeof obj === 'undefined') {
          return;
        }

        if (keepTrackApi.getPlugin(SatInfoBox) && !this.isAddStfLinksOnce) {
          getEl('sat-info-top-links').insertAdjacentHTML(
            'beforeend',
            keepTrackApi.html`
            <div id="stf-on-object-link" class="link sat-infobox-links" data-position="top" data-delay="50"
                  data-tooltip="Visualize Sensor Search Capability">Build Short Term Fence on this object...</div>
            `
          );
          getEl('stf-on-object-link').addEventListener('click', this.stfOnObjectLinkClick.bind(this));
          this.isAddStfLinksOnce = true;
        }
      },
    });
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('stfForm').addEventListener('submit', (e: Event) => {
          e.preventDefault();
          keepTrackApi.getSoundManager().play(SoundNames.MENU_BUTTON);
          this.onSubmit.bind(this)();
        });
        getEl('stf-remove-last').addEventListener('click', () => {
          keepTrackApi.getSoundManager().play(SoundNames.MENU_BUTTON);
          keepTrackApi.getSensorManager().removeStf();
        });
        getEl('stf-clear-all').addEventListener('click', () => {
          keepTrackApi.getSoundManager().play(SoundNames.MENU_BUTTON);
          keepTrackApi.getSensorManager().clearStf();
        });
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.resetSensor,
      cbName: 'shortTermFences',
      cb: this.closeAndDisable.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.setSensor,
      cbName: 'shortTermFences',
      cb: (sensor: any, id: number): void => {
        if (sensor == null && id == null) {
          this.closeAndDisable();
          slideOutLeft(getEl(this.sideMenuElementName), 1000);
        } else {
          this.setBottomIconToEnabled();
        }
      },
    });
  }

  closeAndDisable(): void {
    this.isMenuButtonActive = false;
    this.setBottomIconToUnselected();
    this.setBottomIconToDisabled();
    keepTrackApi.getUiManager().hideSideMenus();
  }

  onSubmit() {
    if (!this.verifySensorSelected()) return;

    // Multiply everything by 1 to convert string to number
    const az = parseFloat((<HTMLInputElement>getEl('stf-az')).value);
    const azExt = parseFloat((<HTMLInputElement>getEl('stf-azExt')).value);
    const el = parseFloat((<HTMLInputElement>getEl('stf-el')).value);
    const elExt = parseFloat((<HTMLInputElement>getEl('stf-elExt')).value);
    const rng = parseFloat((<HTMLInputElement>getEl('stf-rng')).value);
    const rngExt = parseFloat((<HTMLInputElement>getEl('stf-rngExt')).value);

    const minaz = az - azExt < 0 ? ((az - azExt + 360) as Degrees) : ((az - azExt / 2) as Degrees);
    const maxaz = az + azExt > 360 ? ((az + azExt - 360) as Degrees) : ((az + azExt / 2) as Degrees);
    const minel = (el - elExt / 2) as Degrees;
    const maxel = (el + elExt / 2) as Degrees;
    const minrange = (rng - rngExt / 2) as Kilometers;
    const maxrange = (rng + rngExt / 2) as Kilometers;

    const curSensor = keepTrackApi.getSensorManager().currentSensors[0];
    const stfSensor = new DetailedSensor({
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
      country: 'STF',
      name: 'STF',
      id: -2,
      uiName: 'STF',
      zoom: ZoomValue.GEO,
      objName: 'STF',
      system: 'STF',
      operator: 'STF',
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

    keepTrackApi.getSensorManager().addStf(stfSensor);
    keepTrackApi.getPlugin(SensorFov)?.enableFovView();
  }

  stfOnObjectLinkClick() {
    const sensorManagerInstance = keepTrackApi.getSensorManager();
    if (!this.verifySensorSelected()) return;
    if (!this.verifySatelliteSelected()) return;

    const now = keepTrackApi.getTimeManager().simulationTimeObj;
    const rae = eci2rae(now, this.selectSatManager_.primarySatObj.position, sensorManagerInstance.currentSensors[0]);

    (<HTMLInputElement>getEl('stf-az')).value = rae.az.toFixed(1);
    (<HTMLInputElement>getEl('stf-el')).value = rae.el.toFixed(1);
    (<HTMLInputElement>getEl('stf-rng')).value = rae.rng.toFixed(1);

    keepTrackApi.getUiManager().hideSideMenus();
    slideInRight(getEl('stf-menu'), 1000);
    this.isMenuButtonActive = true;
    this.setBottomIconToSelected();
  }
}
