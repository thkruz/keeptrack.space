import customPng from '@app/img/icons/custom.png';
import { KeepTrackApiEvents, keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { errorManagerInstance } from '@app/js/singletons/errorManager';
import { UiGeolocation } from '@app/js/static/ui-manager-geolocation';
import { Degrees, Kilometers, SpaceObjectType } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { MultiSiteLookAnglesPlugin } from './multi-site-look-angles-plugin';

export class CustomSensorPlugin extends KeepTrackPlugin {
  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonEnabled) {
      const sensorManagerInstance = keepTrackApi.getSensorManager();
      if (sensorManagerInstance.isSensorSelected()) {
        (<HTMLInputElement>getEl('cs-lat')).value = sensorManagerInstance.currentSensors[0].lat.toString();
        (<HTMLInputElement>getEl('cs-lon')).value = sensorManagerInstance.currentSensors[0].lon.toString();
        (<HTMLInputElement>getEl('cs-hei')).value = sensorManagerInstance.currentSensors[0].alt.toString();
      }
    }
  };

  bottomIconElementName = 'custom-sensor-icon';
  bottomIconLabel = 'Custom Sensor';
  bottomIconImg = customPng;

  sideMenuElementName: string = 'custom-sensor-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
    <div id="custom-sensor-menu" class="side-menu-parent start-hidden text-select">
        <div id="customSensor-content" class="side-menu">
        <div class="row">
            <h5 class="center-align">Custom Sensor</h5>
            <form id="customSensor">
            <div class="input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Latitude in Decimal Form (ex: 43.283)">
                <input id="cs-lat" type="text" value="0" />
                <label for="cs-lat" class="active">Latitude</label>
            </div>
            <div class="input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Longitude in Decimal Form (ex: -73.283)">
                <input id="cs-lon" type="text" value="0" />
                <label for="cs-lon" class="active">Longitude</label>
            </div>
            <div class="input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Elevation in kilometers (ex: 0.645)">
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
            <div class="switch row tooltipped" data-position="right" data-delay="50" data-tooltip="Is this Sensor a Telescope?">
                <label>
                <input id="cs-telescope" type="checkbox" checked="false" />
                <span class="lever"></span>
                Telescope
                </label>
            </div>
            <div id="cs-minaz-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Azimuth in degrees (ex: 50)">
                <input id="cs-minaz" type="text" value="0" />
                <label for="cs-minaz" class="active">Minimum Azimuth</label>
            </div>
            <div id="cs-maxaz-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Azimuth in degrees (ex: 120)">
                <input id="cs-maxaz" type="text" value="360" />
                <label for="cs-maxaz" class="active">Maximum Azimuth</label>
            </div>
            <div id="cs-minel-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Elevation in degrees (ex: 10)">
                <input id="cs-minel" type="text" value="10" />
                <label for="cs-minel" class="active">Minimum Elevation</label>
            </div>
            <div id="cs-maxel-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Elevation in degrees (ex: 90)">
                <input id="cs-maxel" type="text" value="90" />
                <label for="cs-maxel" class="active">Maximum Elevation</label>
            </div>
            <div id="cs-minrange-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Range in kilometers (ex: 500)">
                <input id="cs-minrange" type="text" value="100" />
                <label for="cs-minrange" class="active">Minimum Range</label>
            </div>
            <div id="cs-maxrange-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Range in kilometers (ex: 20000)">
                <input id="cs-maxrange" type="text" value="50000" />
                <label for="cs-maxrange" class="active">Maximum Range</label>
            </div>
            <div class="center-align">
                <button id="cs-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Add Custom Sensor &#9658;</button>
                <br />
                <br />
                <button id="cs-clear" class="btn btn-ui waves-effect waves-light" name="action">Clear Custom Sensors &#9658;</button>
                <br />
                <br />
                <button id="cs-geolocation" class="btn btn-ui waves-effect waves-light" name="search">Use Geolocation &#9658;</button>
            </div>
            </form>
        </div>
        </div>
    </div>`;

  dragOptions: clickDragOptions = {
    isDraggable: true,
  };

  static PLUGIN_NAME = 'Custom Sensor';
  constructor() {
    super(MultiSiteLookAnglesPlugin.PLUGIN_NAME);
  }

  helpTitle = `Custom Sensor Menu`;
  helpBody = keepTrackApi.html`
  This allows you to create a custom sensor for use in calculations and other menu's functions.
  This can be a completely original sensor or a modification of an existing sensor.
  <br><br>
  After setting the latitude, longitude, and altitude of the sensor, you can set the sensor's field of view.
  Selecting telescope will create a 360 degree field of view with an elevation mask of 10 degrees and unlimited range.
  Deselecting the telescope option will allow you to set the field of view manually.
  <br><br>
  If you are trying to edit an existing sensor, you can select it from the sensor list first and the custom sensor will be updated with the selected sensor's information.`;

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        CustomSensorPlugin.addCustomSensorFormSubmitListener();
        CustomSensorPlugin.addTelescopeClickListener_();
        CustomSensorPlugin.addCustomSensorBtnCLickListener_();
        CustomSensorPlugin.addClearCustomSensorListener_();
        CustomSensorPlugin.addUseGeolocationListener_();
      },
    });
  }

  private static addCustomSensorFormSubmitListener() {
    getEl('customSensor').addEventListener('submit', (e: Event) => {
      e.preventDefault();
      // CustomSensorPlugin.processCustomSensorSubmit_();
    });
  }

  private static addUseGeolocationListener_() {
    getEl('cs-geolocation').addEventListener('click', UiGeolocation.useCurrentGeolocationAsSensor);
  }

  private static addClearCustomSensorListener_() {
    getEl('cs-clear').addEventListener('click', () => {
      keepTrackApi.getSensorManager().clearSecondarySensors();
    });
  }

  private static addCustomSensorBtnCLickListener_() {
    getEl('cs-submit').addEventListener('click', () => {
      CustomSensorPlugin.processCustomSensorSubmit_();
    });
  }

  private static processCustomSensorSubmit_() {
    getEl('menu-sensor-info')?.classList.remove('bmenu-item-disabled');
    getEl('menu-fov-bubble')?.classList.remove('bmenu-item-disabled');
    getEl('menu-surveillance')?.classList.remove('bmenu-item-disabled');
    getEl('menu-planetarium')?.classList.remove('bmenu-item-disabled');
    getEl('menu-astronomy')?.classList.remove('bmenu-item-disabled');
    (<HTMLInputElement>getEl('sensor-type')).value = (<HTMLInputElement>getEl('cs-type')).value.replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
    getEl('sensor-info-title').innerHTML = 'Custom Sensor';
    getEl('sensor-country').innerHTML = 'Custom Sensor';

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
        errorManagerInstance.info('Unknown sensor type: ' + sensorType);
        type = SpaceObjectType.OBSERVER;
        break;
    }

    keepTrackApi.getSensorManager().addSecondarySensor({
      id: null,
      lat,
      lon,
      alt: CustomSensorPlugin.str2Km(alt),
      obsminaz: CustomSensorPlugin.str2Deg(minaz),
      obsmaxaz: CustomSensorPlugin.str2Deg(maxaz),
      obsminel: CustomSensorPlugin.str2Deg(minel),
      obsmaxel: CustomSensorPlugin.str2Deg(maxel),
      obsminrange: CustomSensorPlugin.str2Km(minrange),
      obsmaxrange: CustomSensorPlugin.str2Km(maxrange),
      type,
      name: 'Custom Sensor',
      country: 'Custom Sensor',
      shortName: 'Custom Sensor',
      sun: 'No Impact',
      zoom: CustomSensorPlugin.str2Km(maxrange) > 6000 ? 'geo' : 'leo',
      volume: false,
    });
  }

  private static addTelescopeClickListener_() {
    getEl('cs-telescope').addEventListener('click', () => {
      // If it is checked
      if ((<HTMLInputElement>getEl('cs-telescope')).checked) {
        getEl('cs-minaz-div').style.display = 'none';
        getEl('cs-maxaz-div').style.display = 'none';
        getEl('cs-minel-div').style.display = 'none';
        getEl('cs-maxel-div').style.display = 'none';
        getEl('cs-minrange-div').style.display = 'none';
        getEl('cs-maxrange-div').style.display = 'none';
        (<HTMLInputElement>getEl('cs-minaz')).value = '0';
        (<HTMLInputElement>getEl('cs-maxaz')).value = '360';
        (<HTMLInputElement>getEl('cs-minel')).value = '10';
        (<HTMLInputElement>getEl('cs-maxel')).value = '90';
        (<HTMLInputElement>getEl('cs-minrange')).value = '100';
        (<HTMLInputElement>getEl('cs-maxrange')).value = '1000000';
      } else {
        getEl('cs-minaz-div').style.display = 'block';
        getEl('cs-maxaz-div').style.display = 'block';
        getEl('cs-minel-div').style.display = 'block';
        getEl('cs-maxel-div').style.display = 'block';
        getEl('cs-minrange-div').style.display = 'block';
        getEl('cs-maxrange-div').style.display = 'block';

        const sensorManagerInstance = keepTrackApi.getSensorManager();
        if (sensorManagerInstance.isSensorSelected()) {
          (<HTMLInputElement>getEl('cs-minaz')).value = sensorManagerInstance.currentSensors[0].obsminaz.toString();
          (<HTMLInputElement>getEl('cs-maxaz')).value = sensorManagerInstance.currentSensors[0].obsmaxaz.toString();
          (<HTMLInputElement>getEl('cs-minel')).value = sensorManagerInstance.currentSensors[0].obsminel.toString();
          (<HTMLInputElement>getEl('cs-maxel')).value = sensorManagerInstance.currentSensors[0].obsmaxel.toString();
          (<HTMLInputElement>getEl('cs-minrange')).value = sensorManagerInstance.currentSensors[0].obsminrange.toString();
          (<HTMLInputElement>getEl('cs-maxrange')).value = sensorManagerInstance.currentSensors[0].obsmaxrange.toString();
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

export const sensorCustomPlugin = new CustomSensorPlugin();
