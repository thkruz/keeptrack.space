import { KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl, hideEl, showEl } from '@app/lib/get-el';
import { LineManager } from '@app/singletons/draw-manager/line-manager';
import { SensorToMoonLine } from '@app/singletons/draw-manager/line-manager/sensor-to-moon-line';
import { SensorToSunLine } from '@app/singletons/draw-manager/line-manager/sensor-to-sun-line';
import radioTowerPng from '@public/img/icons/radio-tower.png';
import { RfSensor, SpaceObjectType } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { SoundNames } from '../sounds/SoundNames';

export class SensorInfoPlugin extends KeepTrackPlugin {
  readonly id = 'SensorInfoPlugin';
  dependencies_ = [];
  isRequireSensorSelected = true;

  bottomIconCallback: () => void = () => {
    this.getSensorInfo();
    this.checkIfLinesVisible_(keepTrackApi.getLineManager());
  };


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
        <div class="sensor-info-row">
            <div class="sensor-info-key">Band</div>
            <div class="sensor-info-value" id="sensor-band">UHF</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">Beam Width</div>
            <div class="sensor-info-value" id="sensor-beamwidth">10 deg</div>
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

  private isSunLineVisible_ = false;
  private isMonnLineVisible_ = false;

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        this.addSensorToSunBtnListener_();
        this.addSensorToMoonBtnListener();
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.onLineAdded,
      cbName: this.id,
      cb: (lineManager: LineManager) => {
        this.checkIfLinesVisible_(lineManager);
      },
    });
  }

  private checkIfLinesVisible_(lineManager: LineManager) {
    this.isSunLineVisible_ = lineManager.lines.some((line) => {
      if (line instanceof SensorToSunLine) {
        return true;
      }

      return false;
    });

    if (this.isSunLineVisible_) {
      getEl('sensor-sun-btn').textContent = 'Remove Line to Sun  \u25B6';
      this.isSunLineVisible_ = true;
    } else {
      getEl('sensor-sun-btn').textContent = 'Add Line to Sun  \u25B6';
      this.isSunLineVisible_ = false;
    }

    this.isMonnLineVisible_ = lineManager.lines.some((line) => {
      if (line instanceof SensorToMoonLine) {
        return true;
      }

      return false;
    });

    if (this.isMonnLineVisible_) {
      getEl('sensor-moon-btn').textContent = 'Remove Line to Moon  \u25B6';
      this.isMonnLineVisible_ = true;
    } else {
      getEl('sensor-moon-btn').textContent = 'Add Line to Moon  \u25B6';
      this.isMonnLineVisible_ = false;
    }
  }

  private addSensorToMoonBtnListener() {
    getEl('sensor-moon-btn').addEventListener('click', () => {
      if (this.isMonnLineVisible_) {
        const lineManager = keepTrackApi.getLineManager();

        for (const line of lineManager.lines) {
          if (line instanceof SensorToMoonLine) {
            line.isGarbage = true;
            getEl('sensor-moon-btn').textContent = 'Add Line to Moon  \u25B6';
            this.isMonnLineVisible_ = false;
            keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);

            return;
          }
        }
      } else {
        // Prevent Multiple Sensors
        const sensors = keepTrackApi.getSensorManager().currentSensors;

        if (sensors.length !== 1) {
          keepTrackApi.getUiManager().toast('Please Select Only One Sensor', ToastMsgType.caution);
        }

        keepTrackApi
          .getLineManager()
          .createSensorToMoon(keepTrackApi.getSensorManager().currentSensors[0]);

        // Change Button Text
        getEl('sensor-moon-btn').textContent = 'Remove Line to Moon  \u25B6';
        this.isMonnLineVisible_ = true;
        keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_ON);
      }
    });
  }

  private addSensorToSunBtnListener_() {
    getEl('sensor-sun-btn').addEventListener('click', () => {
      if (this.isSunLineVisible_) {
        const lineManager = keepTrackApi.getLineManager();

        for (const line of lineManager.lines) {
          if (line instanceof SensorToSunLine) {
            line.isGarbage = true;
            getEl('sensor-sun-btn').textContent = 'Add Line to Sun  \u25B6';
            this.isSunLineVisible_ = false;
            keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);

            return;
          }
        }
      } else {
        // Prevent Multiple Sensors
        const sensors = keepTrackApi.getSensorManager().currentSensors;

        if (sensors.length !== 1) {
          keepTrackApi.getUiManager().toast('Please Select Only One Sensor', ToastMsgType.caution);
        }

        keepTrackApi
          .getLineManager()
          .createSensorToSun(keepTrackApi.getSensorManager().currentSensors[0]);

        // Change Button Text
        getEl('sensor-sun-btn').textContent = 'Remove Line to Sun  \u25B6';
        this.isSunLineVisible_ = true;
        keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_ON);
      }
    });
  }

  getSensorInfo() {
    if (!this.isHtmlAdded) {
      return;
    }

    const firstSensor = keepTrackApi.getSensorManager().currentSensors[0];

    getEl('sensor-latitude').innerHTML = firstSensor.lat > 0 ? `${firstSensor.lat.toFixed(2)}° N` : `${Math.abs(firstSensor.lat).toFixed(2)}° S`;
    getEl('sensor-longitude').innerHTML = firstSensor.lon > 0 ? `${firstSensor.lon.toFixed(2)}° E` : `${Math.abs(firstSensor.lon).toFixed(2)}° W`;
    getEl('sensor-minazimuth').innerHTML = `${firstSensor.minAz.toFixed(1).toString()}°`;
    getEl('sensor-maxazimuth').innerHTML = `${firstSensor.maxAz.toFixed(1).toString()}°`;
    getEl('sensor-minelevation').innerHTML = `${firstSensor.minEl.toFixed(1).toString()}°`;
    getEl('sensor-maxelevation').innerHTML = `${firstSensor.maxEl.toFixed(1).toString()}°`;
    getEl('sensor-minrange').innerHTML = `${firstSensor.minRng.toFixed(1).toString()} km`;
    getEl('sensor-maxrange').innerHTML = `${firstSensor.maxRng.toFixed(1).toString()} km`;
    if (firstSensor.type === SpaceObjectType.OPTICAL || firstSensor.type === SpaceObjectType.OBSERVER) {
      hideEl(getEl('sensor-band').parentElement);
      hideEl(getEl('sensor-beamwidth').parentElement);
    } else {
      showEl(getEl('sensor-band').parentElement);
      getEl('sensor-band').innerHTML = firstSensor.freqBand ? firstSensor.freqBand : 'Unknown';

      if (firstSensor instanceof RfSensor) {
        showEl(getEl('sensor-beamwidth').parentElement);
        getEl('sensor-beamwidth').innerHTML = firstSensor.beamwidth ? `${firstSensor.beamwidth.toFixed(1).toString()}°` : 'Unknown';
      } else {
        hideEl(getEl('sensor-beamwidth').parentElement);
      }
    }
  }
}
