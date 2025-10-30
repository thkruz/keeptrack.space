import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { LineManager } from '@app/engine/rendering/line-manager';
import { SensorToMoonLine } from '@app/engine/rendering/line-manager/sensor-to-moon-line';
import { SensorToSunLine } from '@app/engine/rendering/line-manager/sensor-to-sun-line';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { RfSensor, SpaceObjectType } from '@ootk/src/main';
import sensorInfoPng from '@public/img/icons/sensor-info.png';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SoundNames } from '../sounds/sounds';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class SensorInfoPlugin extends KeepTrackPlugin {
  readonly id = 'SensorInfoPlugin';
  dependencies_ = [];
  isRequireSensorSelected = true;

  bottomIconCallback: () => void = () => {
    this.getSensorInfo();
    this.checkIfLinesVisible_(ServiceLocator.getLineManager());
  };

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconLabel = 'Sensor Info';
  bottomIconImg = sensorInfoPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  sideMenuElementName: string = 'sensor-info-menu';
  sideMenuElementHtml: string = html`
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

  dragOptions: ClickDragOptions = {
    isDraggable: true,
  };

  private isSunLineVisible_ = false;
  private isMonnLineVisible_ = false;

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        this.addSensorToSunBtnListener_();
        this.addSensorToMoonBtnListener();
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.onLineAdded,
      (lineManager: LineManager) => {
        this.checkIfLinesVisible_(lineManager);
      },
    );
  }

  private checkIfLinesVisible_(lineManager: LineManager) {
    this.isSunLineVisible_ = lineManager.lines.some((line) => {
      if (line instanceof SensorToSunLine) {
        return true;
      }

      return false;
    });

    const sunButtonElement = getEl('sensor-sun-btn');
    const moonButtonElement = getEl('sensor-moon-btn');

    if (sunButtonElement) {
      if (this.isSunLineVisible_) {
        sunButtonElement.textContent = 'Remove Line to Sun  \u25B6';
        this.isSunLineVisible_ = true;
      } else {
        sunButtonElement.textContent = 'Add Line to Sun  \u25B6';
        this.isSunLineVisible_ = false;
      }
    }

    this.isMonnLineVisible_ = lineManager.lines.some((line) => {
      if (line instanceof SensorToMoonLine) {
        return true;
      }

      return false;
    });

    if (moonButtonElement) {
      if (this.isMonnLineVisible_) {
        moonButtonElement.textContent = 'Remove Line to Moon  \u25B6';
        this.isMonnLineVisible_ = true;
      } else {
        moonButtonElement.textContent = 'Add Line to Moon  \u25B6';
        this.isMonnLineVisible_ = false;
      }
    }
  }

  private addSensorToMoonBtnListener() {
    getEl('sensor-moon-btn')?.addEventListener('click', () => {
      const sensorMoonBtnElement = getEl('sensor-moon-btn');

      if (!sensorMoonBtnElement) {
        return;
      }

      if (this.isMonnLineVisible_) {
        const lineManager = ServiceLocator.getLineManager();

        for (const line of lineManager.lines) {
          if (line instanceof SensorToMoonLine) {
            line.isGarbage = true;

            sensorMoonBtnElement.textContent = 'Add Line to Moon  \u25B6';
            this.isMonnLineVisible_ = false;
            ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);


            return;
          }
        }
      } else {
        // Prevent Multiple Sensors
        const sensors = ServiceLocator.getSensorManager().currentSensors;

        if (sensors.length !== 1) {
          ServiceLocator.getUiManager().toast('Please Select Only One Sensor', ToastMsgType.caution);
        }

        keepTrackApi
          .getLineManager()
          .createSensorToMoon(ServiceLocator.getSensorManager().currentSensors[0]);

        // Change Button Text
        sensorMoonBtnElement.textContent = 'Remove Line to Moon  \u25B6';
        this.isMonnLineVisible_ = true;
        ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
      }
    });
  }

  private addSensorToSunBtnListener_() {
    getEl('sensor-sun-btn')?.addEventListener('click', () => {
      const sensorSunBtnElement = getEl('sensor-sun-btn');

      if (!sensorSunBtnElement) {
        return;
      }

      if (this.isSunLineVisible_) {
        const lineManager = ServiceLocator.getLineManager();

        for (const line of lineManager.lines) {
          if (line instanceof SensorToSunLine) {
            line.isGarbage = true;
            sensorSunBtnElement.textContent = 'Add Line to Sun  \u25B6';
            this.isSunLineVisible_ = false;
            ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);

            return;
          }
        }
      } else {
        // Prevent Multiple Sensors
        const sensors = ServiceLocator.getSensorManager().currentSensors;

        if (sensors.length !== 1) {
          ServiceLocator.getUiManager().toast('Please Select Only One Sensor', ToastMsgType.caution);
        }

        keepTrackApi
          .getLineManager()
          .createSensorToSun(ServiceLocator.getSensorManager().currentSensors[0]);

        // Change Button Text
        sensorSunBtnElement.textContent = 'Remove Line to Sun  \u25B6';
        this.isSunLineVisible_ = true;
        ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
      }
    });
  }

  getSensorInfo() {
    if (!this.isHtmlAdded) {
      return;
    }

    const firstSensor = ServiceLocator.getSensorManager().currentSensors[0];

    const sensorLatitudeElement = getEl('sensor-latitude');
    const sensorLongitudeElement = getEl('sensor-longitude');
    const sensorMinAzimuthElement = getEl('sensor-minazimuth');
    const sensorMaxAzimuthElement = getEl('sensor-maxazimuth');
    const sensorMinElevationElement = getEl('sensor-minelevation');
    const sensorMaxElevationElement = getEl('sensor-maxelevation');
    const sensorMinRangeElement = getEl('sensor-minrange');
    const sensorMaxRangeElement = getEl('sensor-maxrange');
    const sensorBandElement = getEl('sensor-band');
    const beamwidthElement = getEl('sensor-beamwidth');

    if (!sensorLatitudeElement || !sensorLongitudeElement || !sensorMinAzimuthElement || !sensorMaxAzimuthElement || !sensorMinElevationElement || !sensorMaxElevationElement ||
      !sensorMinRangeElement || !sensorMaxRangeElement || !sensorBandElement || !beamwidthElement) {
      return;
    }

    sensorLatitudeElement.innerHTML = firstSensor.lat > 0 ? `${firstSensor.lat.toFixed(2)}° N` : `${Math.abs(firstSensor.lat).toFixed(2)}° S`;
    sensorLongitudeElement.innerHTML = firstSensor.lon > 0 ? `${firstSensor.lon.toFixed(2)}° E` : `${Math.abs(firstSensor.lon).toFixed(2)}° W`;
    sensorMinAzimuthElement.innerHTML = `${firstSensor.minAz.toFixed(1).toString()}°`;
    sensorMaxAzimuthElement.innerHTML = `${firstSensor.maxAz.toFixed(1).toString()}°`;
    sensorMinElevationElement.innerHTML = `${firstSensor.minEl.toFixed(1).toString()}°`;
    sensorMaxElevationElement.innerHTML = `${firstSensor.maxEl.toFixed(1).toString()}°`;
    sensorMinRangeElement.innerHTML = `${firstSensor.minRng.toFixed(1).toString()} km`;
    sensorMaxRangeElement.innerHTML = `${firstSensor.maxRng.toFixed(1).toString()} km`;
    if (firstSensor.type === SpaceObjectType.OPTICAL || firstSensor.type === SpaceObjectType.OBSERVER) {
      hideEl(sensorBandElement?.parentElement ?? '');
      hideEl(beamwidthElement?.parentElement ?? '');
    } else {
      showEl(sensorBandElement?.parentElement ?? '');
      sensorBandElement.innerHTML = firstSensor.freqBand ? firstSensor.freqBand : 'Unknown';

      if (firstSensor instanceof RfSensor) {
        showEl(beamwidthElement?.parentElement ?? '');
        beamwidthElement.innerHTML = firstSensor.beamwidth ? `${firstSensor.beamwidth.toFixed(1).toString()}°` : 'Unknown';
      } else {
        hideEl(beamwidthElement?.parentElement ?? '');
      }
    }
  }
}
