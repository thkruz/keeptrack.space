import radioTowerPng from '@app/img/icons/radio-tower.png';
import { keepTrackApi, KeepTrackApiEvents } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';

export class SensorInfoPlugin extends KeepTrackPlugin {
  isRequireSensorSelected: boolean = true;

  bottomIconCallback: () => void = () => {
    this.getSensorInfo();
  };

  bottomIconElementName = 'sensor-info-icon';
  bottomIconLabel = 'Sensor Info';
  bottomIconImg = radioTowerPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  sideMenuElementName: string = 'sensor-info-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
    <div id="sensor-info-menu" class="side-menu-parent start-hidden text-select">
    <div id="sensor-content" class="side-menu">
        <div class="row">
        <h5 id="sensor-info-title" class="center-align">Sensor Name</h5>
        <div class="sensor-info-row" style="margin-top: 0px;">
            <div class="sensor-info-key">Country</div>
            <div class="sensor-info-value" id="sensor-country">USA</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">Sensor Type</div>
            <div class="sensor-info-value" id="sensor-type">Unknown</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">Latitude</div>
            <div class="sensor-info-value" id="sensor-latitude">0</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">Longitude</div>
            <div class="sensor-info-value" id="sensor-longitude">0</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">Min Azimuth</div>
            <div class="sensor-info-value" id="sensor-minazimuth">30 deg</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">Max Azimuth</div>
            <div class="sensor-info-value" id="sensor-maxazimuth">30 deg</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">Min Elevation</div>
            <div class="sensor-info-value" id="sensor-minelevation">60 deg</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">Max Elevation</div>
            <div class="sensor-info-value" id="sensor-maxelevation">60 deg</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">Min Range</div>
            <div class="sensor-info-value" id="sensor-minrange">1000 km</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">Max Range</div>
            <div class="sensor-info-value" id="sensor-maxrange">1000 km</div>
        </div>
        <div class="center-align row">
            <button id="sensor-sun-btn" class="btn btn-ui waves-effect waves-light" type="button">Draw Line to Sun &#9658;</button>
        </div>
        <div class="center-align row">
            <button id="sensor-moon-btn" class="btn btn-ui waves-effect waves-light" type="button">Draw Line to Moon &#9658;</button>
        </div>
        </div>
    </div>
    </div>`;

  dragOptions: clickDragOptions = {
    isDraggable: true,
  };

  static PLUGIN_NAME = 'Sensor Info';
  constructor() {
    super(SensorInfoPlugin.PLUGIN_NAME);
  }

  helpTitle = `Sensor Info`;
  helpBody = keepTrackApi.html`
    Sensor Info provides information about the currently selected sensor.
    The information is based on publicly available data and may not always be 100% accurate.
    If you have public data on additional sensors or corrections to existing sensor information please contact me at <a href="mailto:theodore.kruczek@gmail.com">theodore.kruczek@gmail.com</a>.
    <br><br>
    The information provided includes:
    <ul style="margin-left: 40px;">
      <li>
        Sensor Name
      </li>
      <li>
        Sensor Owner
      </li>
      <li>
        Sensor Type
      </li>
      <li>
        Sensor Field of View
      </li>
    </ul>
    <br>
    Additionally, lines can be quickly created from the sensor to the sun or moon from this menu.`;

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        SensorInfoPlugin.addSensorToSunBtnListener_();
        SensorInfoPlugin.addSensorToMoonBtnListener();
      },
    });
  }

  private static addSensorToMoonBtnListener() {
    getEl('sensor-moon-btn').addEventListener('click', () => {
      // Prevent Multiple Sensors
      const sensors = keepTrackApi.getSensorManager().currentSensors;
      if (sensors.length !== 1) {
        keepTrackApi.getUiManager().toast('Please Select Only One Sensor', 'caution');
      }

      // Draw Line to Sun from Sensor
      const drawManagerInstance = keepTrackApi.getDrawManager();
      keepTrackApi
        .getLineManager()
        .create(
          'sat2',
          [
            keepTrackApi.getCatalogManager().getSensorFromSensorName(sensors[0].name),
            drawManagerInstance.sceneManager.moon.drawPosition[0],
            drawManagerInstance.sceneManager.moon.drawPosition[1],
            drawManagerInstance.sceneManager.moon.drawPosition[2],
          ],
          'w'
        );
    });
  }

  private static addSensorToSunBtnListener_() {
    getEl('sensor-sun-btn').addEventListener('click', () => {
      // Prevent Multiple Sensors
      const sensors = keepTrackApi.getSensorManager().currentSensors;
      if (sensors.length !== 1) {
        keepTrackApi.getUiManager().toast('Please Select Only One Sensor', 'caution');
      }

      // Draw Line to Sun from Sensor
      const drawManagerInstance = keepTrackApi.getDrawManager();
      keepTrackApi
        .getLineManager()
        .create(
          'sat2',
          [
            keepTrackApi.getCatalogManager().getSensorFromSensorName(sensors[0].name),
            drawManagerInstance.sceneManager.sun.drawPosition[0],
            drawManagerInstance.sceneManager.sun.drawPosition[1],
            drawManagerInstance.sceneManager.sun.drawPosition[2],
          ],
          'o'
        );
    });
  }

  getSensorInfo() {
    if (!this.isHtmlAdded) return;

    const firstSensor = keepTrackApi.getSensorManager().currentSensors[0];
    getEl('sensor-latitude').innerHTML = firstSensor.lat.toString();
    getEl('sensor-longitude').innerHTML = firstSensor.lon.toString();
    getEl('sensor-minazimuth').innerHTML = firstSensor.obsminaz.toString();
    getEl('sensor-maxazimuth').innerHTML = firstSensor.obsmaxaz.toString();
    getEl('sensor-minelevation').innerHTML = firstSensor.obsminel.toString();
    getEl('sensor-maxelevation').innerHTML = firstSensor.obsmaxel.toString();
    getEl('sensor-minrange').innerHTML = firstSensor.obsminrange.toString();
    getEl('sensor-maxrange').innerHTML = firstSensor.obsmaxrange.toString();
  }
}

export const sensorInfoPlugin = new SensorInfoPlugin();
