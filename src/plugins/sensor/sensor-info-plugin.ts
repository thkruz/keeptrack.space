import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { LineManager } from '@app/engine/rendering/line-manager';
import { SensorToMoonLine } from '@app/engine/rendering/line-manager/sensor-to-moon-line';
import { SensorToSunLine } from '@app/engine/rendering/line-manager/sensor-to-sun-line';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { t7e } from '@app/locales/keys';
import { SpaceObjectType } from '@ootk/src/main';
import sensorInfoPng from '@public/img/icons/sensor-info.png';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import './sensor-info.css';

const l = (key: string): string => t7e(`plugins.SensorInfoPlugin.labels.${key}` as Parameters<typeof t7e>[0]);
const b = (key: string): string => t7e(`plugins.SensorInfoPlugin.buttons.${key}` as Parameters<typeof t7e>[0]);

export class SensorInfoPlugin extends KeepTrackPlugin {
  readonly id = 'SensorInfoPlugin';
  dependencies_ = [];
  isRequireSensorSelected = true;

  bottomIconCallback: () => void = () => {
    this.getSensorInfo();
    this.checkIfLinesVisible_(ServiceLocator.getLineManager());
  };

  menuMode: MenuMode[] = [MenuMode.SENSORS, MenuMode.ALL];

  bottomIconImg = sensorInfoPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  sideMenuElementName: string = 'sensor-info-menu';
  sideMenuElementHtml: string = html`
    <div id="sensor-info-menu" class="side-menu-parent start-hidden kt-ui-v13">
    <div id="sensor-content" class="side-menu">
        <div id="sensor-info-title" class="sensor-info-name">${l('sensorName')}</div>
        <section class="kt-section">
        <div class="kt-section-label">${l('details')}</div>
        <div class="sensor-info-row" style="margin-top: 0px;">
            <div class="sensor-info-key">${l('country')}</div>
            <div class="sensor-info-value" id="sensor-country">USA</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">${l('sensorType')}</div>
            <div class="sensor-info-value" id="sensor-type">${l('unknown')}</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">${l('latitude')}</div>
            <div class="sensor-info-value" id="sensor-latitude">0</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">${l('longitude')}</div>
            <div class="sensor-info-value" id="sensor-longitude">0</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">${l('minAzimuth')}</div>
            <div class="sensor-info-value" id="sensor-minazimuth">30 deg</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">${l('maxAzimuth')}</div>
            <div class="sensor-info-value" id="sensor-maxazimuth">30 deg</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">${l('minElevation')}</div>
            <div class="sensor-info-value" id="sensor-minelevation">60 deg</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">${l('maxElevation')}</div>
            <div class="sensor-info-value" id="sensor-maxelevation">60 deg</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">${l('minRange')}</div>
            <div class="sensor-info-value" id="sensor-minrange">1000 km</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">${l('maxRange')}</div>
            <div class="sensor-info-value" id="sensor-maxrange">1000 km</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">${l('band')}</div>
            <div class="sensor-info-value" id="sensor-band">UHF</div>
        </div>
        <div class="sensor-info-row">
            <div class="sensor-info-key">${l('beamWidth')}</div>
            <div class="sensor-info-value" id="sensor-beamwidth">10 deg</div>
        </div>
        </section>
        <section class="kt-section">
        <div class="kt-section-label">${l('visualizations')}</div>
        <button id="sensor-sun-btn" class="kt-action waves-effect waves-light" type="button">
            <span class="kt-action-label">${b('drawLineToSun')}</span>
        </button>
        <button id="sensor-moon-btn" class="kt-action waves-effect waves-light" type="button">
            <span class="kt-action-label">${b('drawLineToMoon')}</span>
        </button>
        </section>
    </div>
    </div>`;

  dragOptions: ClickDragOptions = {
    isDraggable: true,
  };

  private isSunLineVisible_ = false;
  private isMonnLineVisible_ = false;

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.SensorInfoPlugin.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.SensorInfoPlugin.help.overview'),
          image: {
            src: 'img/help/sensor/sensor-info-menu.png',
            alt: t7e('plugins.SensorInfoPlugin.help.imgAlt'),
            caption: t7e('plugins.SensorInfoPlugin.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.SensorInfoPlugin.help.fieldsHeading'),
          content: t7e('plugins.SensorInfoPlugin.help.fields'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.SensorInfoPlugin.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.SensorInfoPlugin.help.tip1'),
        t7e('plugins.SensorInfoPlugin.help.tip2'),
        t7e('plugins.SensorInfoPlugin.help.tip3'),
      ],
    };
  }

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

  /**
   * Update a `.kt-action` row's label without clobbering the CSS chevron
   * pseudo-element (setting the button's textContent would delete it).
   */
  private static setActionLabel_(buttonElement: HTMLElement | null, text: string) {
    const labelElement = buttonElement?.querySelector('.kt-action-label');

    if (labelElement) {
      labelElement.textContent = text;
    }
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
        SensorInfoPlugin.setActionLabel_(sunButtonElement, b('removeLineToSun'));
        this.isSunLineVisible_ = true;
      } else {
        SensorInfoPlugin.setActionLabel_(sunButtonElement, b('addLineToSun'));
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
        SensorInfoPlugin.setActionLabel_(moonButtonElement, b('removeLineToMoon'));
        this.isMonnLineVisible_ = true;
      } else {
        SensorInfoPlugin.setActionLabel_(moonButtonElement, b('addLineToMoon'));
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

            SensorInfoPlugin.setActionLabel_(sensorMoonBtnElement, b('addLineToMoon'));
            this.isMonnLineVisible_ = false;
            ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);


            return;
          }
        }
      } else {
        // Prevent Multiple Sensors
        const sensors = ServiceLocator.getSensorManager().currentSensors;

        if (sensors.length !== 1) {
          ServiceLocator.getUiManager().toast(t7e('plugins.SensorInfoPlugin.errorMsgs.selectOnlyOneSensor' as Parameters<typeof t7e>[0]), ToastMsgType.caution);
        }

        keepTrackApi
          .getLineManager()
          .createSensorToMoon(ServiceLocator.getSensorManager().currentSensors[0]);

        // Change Button Text
        SensorInfoPlugin.setActionLabel_(sensorMoonBtnElement, b('removeLineToMoon'));
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
            SensorInfoPlugin.setActionLabel_(sensorSunBtnElement, b('addLineToSun'));
            this.isSunLineVisible_ = false;
            ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);

            return;
          }
        }
      } else {
        // Prevent Multiple Sensors
        const sensors = ServiceLocator.getSensorManager().currentSensors;

        if (sensors.length !== 1) {
          ServiceLocator.getUiManager().toast(t7e('plugins.SensorInfoPlugin.errorMsgs.selectOnlyOneSensor' as Parameters<typeof t7e>[0]), ToastMsgType.caution);
        }

        keepTrackApi
          .getLineManager()
          .createSensorToSun(ServiceLocator.getSensorManager().currentSensors[0]);

        // Change Button Text
        SensorInfoPlugin.setActionLabel_(sensorSunBtnElement, b('removeLineToSun'));
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

    if (!firstSensor) {
      return;
    }

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
      sensorBandElement.innerHTML = firstSensor.freqBand ? firstSensor.freqBand : l('unknown');

      if (firstSensor instanceof DetailedSensor) {
        showEl(beamwidthElement?.parentElement ?? '');
        beamwidthElement.innerHTML = firstSensor.beamwidth ? `${firstSensor.beamwidth.toFixed(1).toString()}°` : l('unknown');
      } else {
        hideEl(beamwidthElement?.parentElement ?? '');
      }
    }
  }
}
