import { UiGeolocation } from '@app/app/ui/ui-manager-geolocation';
import { MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl } from '@app/engine/utils/get-el';
import { slideInRight } from '@app/engine/utils/slide';
import { triggerSubmit } from '@app/engine/utils/trigger-submit';
import { waitForCruncher } from '@app/engine/utils/waitForCruncher';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { Degrees, DetailedSensor, Kilometers, SpaceObjectType, ZoomValue } from '@ootk/src/main';
import bookmarkRemovePng from '@public/img/icons/bookmark-remove.png';
import sensorAddPng from '@public/img/icons/sensor-add.png';
import { ClickDragOptions, KeepTrackPlugin, SideMenuSettingsOptions } from '../../engine/plugins/base-plugin';
import { SensorFov } from '../sensor-fov/sensor-fov';
import { SensorSurvFence } from '../sensor-surv/sensor-surv-fence';
import { SoundNames } from '../sounds/sounds';
import { SensorInfoPlugin } from './sensor-info-plugin';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class CustomSensorPlugin extends KeepTrackPlugin {
  readonly id = 'CustomSensorPlugin';
  dependencies_ = [];
  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      const sensorManagerInstance = ServiceLocator.getSensorManager();

      if (sensorManagerInstance.isSensorSelected()) {
        (<HTMLInputElement>getEl('cs-replace')).style.display = '';
        (<HTMLInputElement>getEl('cs-lat')).value = sensorManagerInstance.currentSensors[0].lat.toString();
        (<HTMLInputElement>getEl('cs-lon')).value = sensorManagerInstance.currentSensors[0].lon.toString();
        (<HTMLInputElement>getEl('cs-hei')).value = sensorManagerInstance.currentSensors[0].alt.toString();
      } else {
        (<HTMLInputElement>getEl('cs-replace')).style.display = 'none';
      }
    }
  };

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = sensorAddPng;

  sideMenuElementName: string = 'custom-sensor-menu';
  sideMenuElementHtml: string = html`
    <form id="customSensor">
      <div class="input-field col s12" data-position="top" data-delay="50" data-tooltip="Name of the Sensor">
          <input id="cs-uiName" type="text" value="Custom Sensor" />
          <label for="cs-uiName" class="active">Sensor Name</label>
      </div>
      <div class="input-field col s12" data-position="top" data-delay="50" data-tooltip="Latitude in Decimal Form (ex: 43.283)">
          <input id="cs-lat" type="text" value="0" />
          <label for="cs-lat" class="active">Latitude</label>
      </div>
      <div class="input-field col s12" data-position="top" data-delay="50" data-tooltip="Longitude in Decimal Form (ex: -73.283)">
          <input id="cs-lon" type="text" value="0" />
          <label for="cs-lon" class="active">Longitude</label>
      </div>
      <div class="input-field col s12" data-position="top" data-delay="50" data-tooltip="Elevation in kilometers (ex: 0.645)">
          <input id="cs-hei" type="text" value="0" />
          <label for="cs-hei" class="active">Elevation Above Sea Level (Km)</label>
      </div>
      <div class="input-field col s12">
          <select id="cs-type">
          <option value="Observer">Observer</option>
          <option value="Optical">Optical</option>
          <option value="Phased Array Radar">Phased Array Radar</option>
          <option value="Mechanical">Mechanical</option>
          </select>
          <label>Type of Sensor</label>
      </div>
      <div class="input-field col s12">
        <div class="switch row" data-position="top" data-delay="50" data-tooltip="Is this Sensor a Telescope?">
            <label>
            <input id="cs-telescope" type="checkbox" checked="false" />
            <span class="lever"></span>
            Telescope
            </label>
        </div>
      </div>
      <div id="cs-minaz-div" class="start-hidden input-field col s12" data-position="top" data-delay="50" data-tooltip="Azimuth in degrees (ex: 50)">
          <input id="cs-minaz" type="text" value="0" />
          <label for="cs-minaz" class="active">Minimum Azimuth</label>
      </div>
      <div id="cs-maxaz-div" class="start-hidden input-field col s12" data-position="top" data-delay="50" data-tooltip="Azimuth in degrees (ex: 120)">
          <input id="cs-maxaz" type="text" value="360" />
          <label for="cs-maxaz" class="active">Maximum Azimuth</label>
      </div>
      <div id="cs-minel-div" class="start-hidden input-field col s12" data-position="top" data-delay="50" data-tooltip="Elevation in degrees (ex: 10)">
          <input id="cs-minel" type="text" value="10" />
          <label for="cs-minel" class="active">Minimum Elevation</label>
      </div>
      <div id="cs-maxel-div" class="start-hidden input-field col s12" data-position="top" data-delay="50" data-tooltip="Elevation in degrees (ex: 90)">
          <input id="cs-maxel" type="text" value="90" />
          <label for="cs-maxel" class="active">Maximum Elevation</label>
      </div>
      <div id="cs-minrange-div" class="start-hidden input-field col s12" data-position="top" data-delay="50" data-tooltip="Range in kilometers (ex: 500)">
          <input id="cs-minrange" type="text" value="100" />
          <label for="cs-minrange" class="active">Minimum Range</label>
      </div>
      <div id="cs-maxrange-div" class="start-hidden input-field col s12" data-position="top" data-delay="50" data-tooltip="Range in kilometers (ex: 20000)">
          <input id="cs-maxrange" type="text" value="50000" />
          <label for="cs-maxrange" class="active">Maximum Range</label>
      </div>
    <div class="center-align">
        <button id="cs-replace" class="btn btn-ui waves-effect waves-light" name="action">Replace Sensor &#9658;</button>
        <br />
        <br />
        <button id="cs-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Add Custom Sensor &#9658;</button>
        <br />
        <br />
        <button id="cs-clear" class="btn btn-ui waves-effect waves-light" name="action">Clear Custom Sensors &#9658;</button>
        <br />
        <br />
        <button id="cs-geolocation" class="btn btn-ui waves-effect waves-light" name="search">Use Geolocation &#9658;</button>
    </div>
    </form>
    `;
  sideMenuSecondaryHtml: string = html`
    <div class="row" style="margin: 0 10px;">
      <div id="custom-sensors-sensor-list">
      </div>
    </div>`;
  sideMenuSecondaryOptions: SideMenuSettingsOptions = {
    width: 450,
    leftOffset: null,
    zIndex: 3,
  };

  rmbL1ElementName = 'create-rmb';
  rmbL1Html = html`
  <li class="rmb-menu-item" id=${this.rmbL1ElementName}><a href="#">Create &#x27A4;</a></li>`;

  isRmbOnEarth = true;
  isRmbOffEarth = false;
  isRmbOnSat = false;
  rmbMenuOrder = 10;

  rmbL2ElementName = 'create-rmb-menu';
  rmbL2Html = html`
  <ul class='dropdown-contents'>
    <li id="create-observer-rmb"><a href="#">Create Observer Here</a></li>
    <li id="create-sensor-rmb"><a href="#">Create Sensor Here</a></li>
  </ul>`;

  rmbCallback: (targetId: string, clickedSat?: number) => void = (targetId: string) => {
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const mouseInputInstance = ServiceLocator.getInputManager().mouse;

    switch (targetId) {
      case 'create-observer-rmb':
        slideInRight(getEl('custom-sensor-menu'), 1000);
        this.setBottomIconToSelected();
        sensorManagerInstance.isCustomSensorMenuOpen = true;
        if (!(<HTMLInputElement>getEl('cs-telescope')).checked) {
          getEl('cs-telescope')?.click();
        }
        (<HTMLInputElement>getEl('cs-uiName')).value = 'Observer';
        (<HTMLInputElement>getEl('cs-lat')).value = mouseInputInstance.latLon.lat.toString();
        (<HTMLInputElement>getEl('cs-lon')).value = mouseInputInstance.latLon.lon.toString();
        (<HTMLInputElement>getEl('cs-hei')).value = '0';
        (<HTMLInputElement>getEl('cs-type')).value = 'Observer';
        triggerSubmit(<HTMLFormElement>getEl('customSensor'));
        catalogManagerInstance.satCruncher.postMessage({
          isSunlightView: true,
          typ: CruncerMessageTypes.SUNLIGHT_VIEW,
        });
        waitForCruncher({
          cruncher: catalogManagerInstance.satCruncher,
          cb: () => {
            colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.colorSchemeInstances.SunlightColorScheme, true);
          },
          validationFunc: (data: PositionCruncherOutgoingMsg) => data.satInSun,
        });
        break;
      case 'create-sensor-rmb':
        {
          slideInRight(getEl('custom-sensor-menu'), 1000);
          this.setBottomIconToSelected();
          sensorManagerInstance.isCustomSensorMenuOpen = true;
          if ((<HTMLInputElement>getEl('cs-telescope')).checked) {
            getEl('cs-telescope')!.click();
          }
          (<HTMLInputElement>getEl('cs-uiName')).value = 'Custom Sensor';
          (<HTMLInputElement>getEl('cs-lat')).value = mouseInputInstance.latLon.lat.toString();
          (<HTMLInputElement>getEl('cs-lon')).value = mouseInputInstance.latLon.lon.toString();
          (<HTMLInputElement>getEl('cs-hei')).value = '0';
          (<HTMLInputElement>getEl('cs-type')).value = 'Phased Array Radar';
          (<HTMLInputElement>getEl('cs-minaz')).value = '0';
          (<HTMLInputElement>getEl('cs-maxaz')).value = '360';
          (<HTMLInputElement>getEl('cs-minel')).value = '10';
          (<HTMLInputElement>getEl('cs-maxel')).value = '90';
          (<HTMLInputElement>getEl('cs-minrange')).value = '0';
          (<HTMLInputElement>getEl('cs-maxrange')).value = '5556';
          triggerSubmit(<HTMLFormElement>getEl('customSensor'));
          const defaultColorScheme = colorSchemeManagerInstance.colorSchemeInstances[settingsManager.defaultColorScheme] ??
            Object.values(colorSchemeManagerInstance.colorSchemeInstances)[0];

          colorSchemeManagerInstance.setColorScheme(defaultColorScheme, true);
          catalogManagerInstance.satCruncher.postMessage({
            isSunlightView: false,
            typ: CruncerMessageTypes.SUNLIGHT_VIEW,
          });
        }
        break;
      case 'colors-confidence-rmb':
      case 'colors-rcs-rmb':
      case 'colors-density-rmb':
      case 'colors-starlink-rmb':
      case 'colors-sunlight-rmb':
      case 'colors-country-rmb':
      case 'colors-velocity-rmb':
      case 'colors-default-rmb':
        break;
      default:
        // errorManagerInstance.info(`Unknown RMB target: ${targetId}`);
        break;
    }
  };

  dragOptions: ClickDragOptions = {
    minWidth: 350,
    isDraggable: true,
  };

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        CustomSensorPlugin.httpsCheck_();
        CustomSensorPlugin.addCustomSensorFormSubmitListener();
        CustomSensorPlugin.addTelescopeClickListener_();
        CustomSensorPlugin.addCustomSensorBtnCLickListener_();
        CustomSensorPlugin.addClearCustomSensorListener_();
      },
    );
  }

  private static httpsCheck_() {
    if (location.protocol !== 'https:') {
      hideEl('cs-geolocation');
    } else {
      CustomSensorPlugin.addUseGeolocationListener_();
    }
  }

  private static addCustomSensorFormSubmitListener() {
    getEl('customSensor')!.addEventListener('submit', (e: Event) => {
      // Prevent the form from submitting
      e.preventDefault();
    });
  }

  private static addUseGeolocationListener_() {
    getEl('cs-geolocation')!.addEventListener('click', UiGeolocation.useCurrentGeolocationAsSensor);
    ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
  }

  private static addClearCustomSensorListener_() {
    getEl('cs-clear')!.addEventListener('click', () => {
      ServiceLocator.getSensorManager().clearSecondarySensors();
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      CustomSensorPlugin.updateCustomSensorListDom();
    });
  }

  private static addCustomSensorBtnCLickListener_() {
    getEl('cs-submit')!.addEventListener('click', () => {
      CustomSensorPlugin.processCustomSensorSubmit_();
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    });
    getEl('cs-replace')!.addEventListener('click', () => {
      CustomSensorPlugin.processCustomSensorSubmit_(true);
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
    });
  }

  private static processCustomSensorSubmit_(isReplaceSensor = false) {
    PluginRegistry.getPlugin(SensorInfoPlugin)?.setBottomIconToUnselected();
    PluginRegistry.getPlugin(SensorFov)?.setBottomIconToUnselected();
    PluginRegistry.getPlugin(SensorSurvFence)?.setBottomIconToUnselected();
    PluginRegistry.getPluginByName('Planetarium')?.setBottomIconToUnselected();
    PluginRegistry.getPluginByName('Astronomy')?.setBottomIconToUnselected();

    (<HTMLInputElement>getEl('sensor-type')).value = (<HTMLInputElement>getEl('cs-type')).value.replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
    getEl('sensor-info-title')!.innerHTML = 'Custom Sensor';
    getEl('sensor-country')!.innerHTML = 'Custom Sensor';

    const uiName = (<HTMLInputElement>getEl('cs-uiName')).value;
    const lon = CustomSensorPlugin.str2Deg((<HTMLInputElement>getEl('cs-lon')).value);
    const lat = CustomSensorPlugin.str2Deg((<HTMLInputElement>getEl('cs-lat')).value);
    const alt = (<HTMLInputElement>getEl('cs-hei')).value;
    const sensorType = <'Observer' | 'Optical' | 'Mechanical' | 'Phased Array Radar'>(<HTMLInputElement>getEl('cs-type')).value;
    const minaz = (<HTMLInputElement>getEl('cs-minaz')).value;
    const maxaz = (<HTMLInputElement>getEl('cs-maxaz')).value;
    const minel = (<HTMLInputElement>getEl('cs-minel')).value;
    const maxel = (<HTMLInputElement>getEl('cs-maxel')).value;
    const minrange = (<HTMLInputElement>getEl('cs-minrange')).value;
    const maxrange = (<HTMLInputElement>getEl('cs-maxrange')).value;

    if (lat > 90 || lat < -90) {
      errorManagerInstance.warn('Custom Sensor Latitude must be between -90 and 90 degrees.');

      return;
    }

    if (lon > 180 || lon < -180) {
      errorManagerInstance.warn('Custom Sensor Longitude must be between -180 and 180 degrees.');

      return;
    }

    if (parseFloat(alt) < 0) {
      errorManagerInstance.warn('Custom Sensor Altitude must be greater than or equal to 0 km.');

      return;
    }

    if (parseFloat(minaz) < -360 || parseFloat(minaz) > 360) {
      errorManagerInstance.warn('Custom Sensor Minimum Azimuth must be between -360 and 360 degrees.');

      return;
    }

    if (parseFloat(maxaz) < -360 || parseFloat(maxaz) > 360) {
      errorManagerInstance.warn('Custom Sensor Maximum Azimuth must be between -360 and 360 degrees.');

      return;
    }

    if (parseFloat(minel) < -90 || parseFloat(minel) > 90) {
      errorManagerInstance.warn('Custom Sensor Minimum Elevation must be between -90 and 90 degrees.');

      return;
    }

    if (parseFloat(maxel) < -90 || parseFloat(maxel) > 90) {
      errorManagerInstance.warn('Custom Sensor Maximum Elevation must be between -90 and 90 degrees.');

      return;
    }

    if (parseFloat(minrange) < 0) {
      errorManagerInstance.warn('Custom Sensor Minimum Range must be greater than or equal to 0 km.');

      return;
    }
    if (parseFloat(maxrange) < 0) {
      errorManagerInstance.warn('Custom Sensor Maximum Range must be greater than or equal to 0 km.');

      return;
    }

    let type = SpaceObjectType.OBSERVER;

    switch (sensorType) {
      case 'Observer':
        type = SpaceObjectType.OBSERVER;
        break;
      case 'Optical':
        type = SpaceObjectType.OPTICAL;
        break;
      case 'Mechanical':
        type = SpaceObjectType.MECHANICAL;
        break;
      case 'Phased Array Radar':
        type = SpaceObjectType.PHASED_ARRAY_RADAR;
        break;
      default:
        errorManagerInstance.info(`Unknown sensor type: ${sensorType}`);
        type = SpaceObjectType.OBSERVER;
        break;
    }

    const randomUUID = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    ServiceLocator.getSensorManager().addSecondarySensor(
      new DetailedSensor({
        lat,
        lon,
        alt: CustomSensorPlugin.str2Km(alt),
        minAz: CustomSensorPlugin.str2Deg(minaz),
        maxAz: CustomSensorPlugin.str2Deg(maxaz),
        minEl: CustomSensorPlugin.str2Deg(minel),
        maxEl: CustomSensorPlugin.str2Deg(maxel),
        minRng: CustomSensorPlugin.str2Km(minrange),
        maxRng: CustomSensorPlugin.str2Km(maxrange),
        type,
        name: 'Custom Sensor',
        uiName,
        system: 'Custom Sensor',
        country: 'Custom Sensor',
        objName: `Custom Sensor-${randomUUID}`,
        operator: 'Custom Sensor',
        zoom: CustomSensorPlugin.str2Km(maxrange) > 6000 ? ZoomValue.GEO : ZoomValue.LEO,
        volume: false,
      }),
      isReplaceSensor,
    );

    CustomSensorPlugin.updateCustomSensorListDom();
  }

  private static updateCustomSensorListDom() {
    const primarySensor = ServiceLocator.getSensorManager().currentSensors[0]?.objName?.startsWith('Custom Sensor')
      ? [ServiceLocator.getSensorManager().currentSensors[0]]
      : [] as DetailedSensor[];
    const sensors = primarySensor.concat(ServiceLocator.getSensorManager().secondarySensors);

    getEl('custom-sensors-sensor-list')!.innerHTML = sensors.map((sensor) => `
      <div class="row" style="height: 100%; display: flex; align-items: center; margin: 20px 0px;">
        <div class="col s10 m10 l10">
          <div><strong>Sensor Name:</strong> ${sensor.uiName}</div>
          <div><strong>Latitude:</strong> ${sensor.lat.toFixed(0)}°</div>
          <div><strong>Longitude:</strong> ${sensor.lon.toFixed(0)}°</div>
          <div><strong>Elevation:</strong> ${sensor.alt.toFixed(0)} km</div>
          <div><strong>Azimuth:</strong> ${sensor.minAz.toFixed(0)}° - ${sensor.maxAz.toFixed(0)}°</div>
          <div><strong>Elevation:</strong> ${sensor.minEl.toFixed(0)}° - ${sensor.maxEl.toFixed(0)}°</div>
          <div><strong>Range:</strong> ${sensor.minRng.toFixed(0)} km - ${sensor.maxRng.toFixed(0)} km</div>
        </div>
        <div class="col s2 m2 l2 center-align remove-icon" style="display: flex; align-items: center; height: 100%;">
          <img class="remove-sensor" data-id="${sensor.objName}" src="${bookmarkRemovePng}" style="cursor: pointer;"></img>
        </div>
      </div>
      <div class="divider"></div>
      `).join('');

    document.querySelectorAll('.remove-sensor').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
        const objName = (<HTMLElement>e.target).dataset.id;
        const sensor = ServiceLocator.getSensorManager().getSensorByObjName(objName);

        ServiceLocator.getSensorManager().removeSensor(sensor);
        CustomSensorPlugin.updateCustomSensorListDom();
      });
    });
  }

  private static addTelescopeClickListener_() {
    getEl('cs-telescope')!.addEventListener('click', () => {
      // If it is checked
      if ((<HTMLInputElement>getEl('cs-telescope')).checked) {
        getEl('cs-minaz-div')!.style.display = 'none';
        getEl('cs-maxaz-div')!.style.display = 'none';
        getEl('cs-minel-div')!.style.display = 'none';
        getEl('cs-maxel-div')!.style.display = 'none';
        getEl('cs-minrange-div')!.style.display = 'none';
        getEl('cs-maxrange-div')!.style.display = 'none';
        (<HTMLInputElement>getEl('cs-minaz')).value = '0';
        (<HTMLInputElement>getEl('cs-maxaz')).value = '360';
        (<HTMLInputElement>getEl('cs-minel')).value = '10';
        (<HTMLInputElement>getEl('cs-maxel')).value = '90';
        (<HTMLInputElement>getEl('cs-minrange')).value = '100';
        (<HTMLInputElement>getEl('cs-maxrange')).value = '1000000';
      } else {
        getEl('cs-minaz-div')!.style.display = 'block';
        getEl('cs-maxaz-div')!.style.display = 'block';
        getEl('cs-minel-div')!.style.display = 'block';
        getEl('cs-maxel-div')!.style.display = 'block';
        getEl('cs-minrange-div')!.style.display = 'block';
        getEl('cs-maxrange-div')!.style.display = 'block';

        const sensorManagerInstance = ServiceLocator.getSensorManager();

        if (sensorManagerInstance.isSensorSelected()) {
          (<HTMLInputElement>getEl('cs-minaz')).value = sensorManagerInstance.currentSensors[0].minAz.toString();
          (<HTMLInputElement>getEl('cs-maxaz')).value = sensorManagerInstance.currentSensors[0].maxAz.toString();
          (<HTMLInputElement>getEl('cs-minel')).value = sensorManagerInstance.currentSensors[0].minEl.toString();
          (<HTMLInputElement>getEl('cs-maxel')).value = sensorManagerInstance.currentSensors[0].maxEl.toString();
          (<HTMLInputElement>getEl('cs-minrange')).value = sensorManagerInstance.currentSensors[0].minRng.toString();
          (<HTMLInputElement>getEl('cs-maxrange')).value = sensorManagerInstance.currentSensors[0].maxRng.toString();
        }
      }
    });
  }

  static str2Km(str: string): Kilometers {
    return <Kilometers>parseFloat(str);
  }

  static str2Deg(str: string): Degrees {
    return <Degrees>parseFloat(str);
  }
}
