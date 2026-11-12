/* eslint-disable max-statements */
/* eslint-disable max-lines-per-function */
/* eslint-disable max-lines */

import { SatMath, SunStatus } from '@app/app/analysis/sat-math';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { readPositiveNumberInput } from '@app/engine/utils/positive-number-input';
import { createBrandedCsvBlob } from '@app/engine/utils/saveVariable';
import { t7e } from '@app/locales/keys';
import {
  angularVelocityOfEarth,
  BaseObject,
  calcGmst,
  DEG2RAD,
  Degrees,
  earthGravityParam,
  Hours,
  Kilometers,
  lla2eci,
  MILLISECONDS_PER_SECOND,
  Milliseconds,
  Radians,
  Satellite,
  SatelliteRecord,
  Seconds,
  SpaceObjectType,
  Sun,
} from '@ootk/src/main';
import viewTimelinePng from '@public/img/icons/view_timeline.png';
import { fetchWeatherApi } from 'openmeteo';
import { SensorManager } from '../../app/sensors/sensorManager';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './sensor-timeline.css';

interface Pass {
  start: Date;
  end: Date;
}

enum PassTypes {
  CAN_OBSERVE = 'can Observe',
  IN_FOV = 'In Field of View',
  SAT_IN_SUN = 'Satellite in Sunlight',
  STATION_IN_NIGHT = 'Station in Eclipse',
  CLEAR_SKIES = 'Clear Skies',
}

enum WeatherStatus {
  CLOUDY = 0,
  CLEAR = 1,
  UNKOWN = 2,
}

interface Passes {
  sensor: DetailedSensor;
  type: string;
  passes: Pass[];
}

interface weatherReport {
  latitude: number;
  longitude: number;
  hourly: Date[];
  cloudCover: Float32Array;
}

type WeatherDataInput = {
  id: number | undefined;
  lat: number;
  lon: number;
}[];

export class SensorTimeline extends KeepTrackPlugin {
  readonly id = 'SensorTimeline';
  private lastActionKey_ = '';
  dependencies_ = [SelectSatManager.name];

  /** Translated display label for a pass type drawn on the canvas. */
  private static passTypeLabel_(type: PassTypes): string {
    switch (type) {
      case PassTypes.CAN_OBSERVE:
        return t7e('plugins.SensorTimeline.passTypes.canObserve');
      case PassTypes.IN_FOV:
        return t7e('plugins.SensorTimeline.passTypes.inFov');
      case PassTypes.SAT_IN_SUN:
        return t7e('plugins.SensorTimeline.passTypes.satInSun');
      case PassTypes.STATION_IN_NIGHT:
        return t7e('plugins.SensorTimeline.passTypes.stationInNight');
      case PassTypes.CLEAR_SKIES:
        return t7e('plugins.SensorTimeline.passTypes.clearSkies');
      default:
        return type;
    }
  }

  private canvas_: HTMLCanvasElement;
  private ctx_: CanvasRenderingContext2D;
  private canvasStatic_: HTMLCanvasElement;
  private ctxStatic_: CanvasRenderingContext2D;
  private drawEvents_: { [key: string]: (mouseX: number, mouseY: number) => boolean } = {};
  private height: number;
  private width: number;
  private xScale: number;
  private topOffset = 0;
  private leftOffset: number;

  private readonly allSensorLists_ = [] as DetailedSensor[];
  private enabledSensors_: DetailedSensor[] = [];

  private lengthOfBadPass_ = 120 as Seconds;
  private lengthOfAvgPass_ = 240 as Seconds;
  private angleCalculationInterval_ = <Seconds>30;
  private useWeather = true;
  /** Length of the look-ahead window, in hours. */
  private lengthOfLookAngles_ = 24 as Hours;
  /** When true, extra rows (sunlight, night, clear skies) are drawn and no orbit skipping happens. */
  private detailedPlot = false;

  constructor() {
    super();

    this.allSensorLists_ = ServiceLocator.getSensorManager()
      .getSensorList('ssn')
      .concat(
        ServiceLocator.getSensorManager().getSensorList('mw'),
        ServiceLocator.getSensorManager().getSensorList('md'),
        ServiceLocator.getSensorManager().getSensorList('OWL-Net'),
        ServiceLocator.getSensorManager().getSensorList('leolabs'),
        ServiceLocator.getSensorManager().getSensorList('esoc'),
        ServiceLocator.getSensorManager().getSensorList('rus'),
        ServiceLocator.getSensorManager().getSensorList('prc'),
        ServiceLocator.getSensorManager().getSensorList('other')
      );

    // remove duplicates in sensorList
    this.allSensorLists_ = this.allSensorLists_.filter((sensor, index, self) => index === self.findIndex((t) => t.uiName === sensor.uiName));

    this.enabledSensors_ = this.allSensorLists_.filter((s) => ServiceLocator.getSensorManager().getSensorList('mw').includes(s));
  }

  menuMode: MenuMode[] = [MenuMode.DISPLAY, MenuMode.ALL];

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.SensorTimeline.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.SensorTimeline.help.overview'),
          image: {
            src: 'img/help/timeline-sensor/timeline-sensor-menu.png',
            alt: t7e('plugins.SensorTimeline.help.imgAlt'),
            caption: t7e('plugins.SensorTimeline.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.SensorTimeline.help.readingHeading'),
          content: t7e('plugins.SensorTimeline.help.reading'),
        },
        {
          heading: t7e('plugins.SensorTimeline.help.settingsHeading'),
          content: t7e('plugins.SensorTimeline.help.settings'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.SensorTimeline.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.SensorTimeline.help.tip1'), t7e('plugins.SensorTimeline.help.tip2'), t7e('plugins.SensorTimeline.help.tip3')],
    };
  }

  isRequireSatelliteSelected = true;
  isIconDisabled = true;
  isIconDisabledOnLoad = true;

  bottomIconImg = viewTimelinePng;
  bottomIconCallback: () => void = () => {
    if (!this.isMenuButtonActive) {
      return;
    }
    this.resizeCanvas_();
    this.updateTimeline();
  };

  sideMenuElementName = 'sensor-timeline-menu';
  sideMenuElementHtml = html`
    <div class="row"></div>
    <div class="row" style="margin: 0;">
      <canvas id="sensor-timeline-canvas"></canvas>
      <canvas id="sensor-timeline-canvas-static" style="display: none;"></canvas>
    </div>`;
  sideMenuSecondaryHtml: string = html`
    <section class="kt-section">
      <div class="kt-section-label">${t7e('plugins.SensorTimeline.sections.settings')}</div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <input id="sensor-timeline-setting-total-length" value="${this.lengthOfLookAngles_.toString()}" type="text"
            style="text-align: center;"
          />
          <label for="sensor-timeline-setting-total-length" class="active">${t7e('plugins.SensorTimeline.labels.calculationLength')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <input id="sensor-timeline-setting-interval" value="${this.angleCalculationInterval_.toString()}" type="text"
            style="text-align: center;"
          />
          <label for="sensor-timeline-setting-interval" class="active">${t7e('plugins.SensorTimeline.labels.calculationInterval')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <input id="sensor-timeline-setting-bad-length" value="${this.lengthOfBadPass_.toString()}" type="text"
            style="text-align: center;"
          />
          <label for="sensor-timeline-setting-bad-length" class="active">${t7e('plugins.SensorTimeline.labels.badPassLength')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <input id="sensor-timeline-setting-avg-length" value="${this.lengthOfAvgPass_.toString()}" type="text"
            style="text-align: center;"
          />
          <label for="sensor-timeline-setting-avg-length" class="active">${t7e('plugins.SensorTimeline.labels.avgPassLength')}</label>
        </div>
      </div>
      <div class="switch stl-switch-row">
        <label for="sensor-timeline-toggle" data-position="top" data-delay="50" data-tooltip="${t7e('plugins.SensorTimeline.labels.detailedPlot')}">
          <input id="sensor-timeline-toggle" type="checkbox"/>
          <span class="lever"></span>
          ${t7e('plugins.SensorTimeline.labels.detailedPlot')}
        </label>
      </div>
      <div class="switch stl-switch-row">
        <label for="weather-toggle" data-position="top" data-delay="50" data-tooltip="${t7e('plugins.SensorTimeline.labels.useWeatherTooltip')}">
          <input id="weather-toggle" type="checkbox" checked/>
          <span class="lever"></span>
          ${t7e('plugins.SensorTimeline.labels.useWeather')}
        </label>
      </div>
    </section>
    <section class="kt-section">
      <div class="kt-section-label">${t7e('plugins.SensorTimeline.sections.sensors')}</div>
      <div id="sensor-timeline-sensor-list" class="stl-sensor-list">
      </div>
    </section>`;
  sideMenuSecondaryOptions = {
    width: 350,
    leftOffset: 0,
    zIndex: 10,
  };

  downloadIconCb = async () => {
    const passes = await this.calculatePasses_();
    const sensorData = passes[0];
    const csvData = this.convertSensorPassesToCSV(sensorData);
    const blob = createBrandedCsvBlob(csvData);
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);

    const timelineSat = PluginRegistry.getPlugin(SelectSatManager)!.getSelectedSat() as Satellite;

    link.download = `sat-${timelineSat.sccNum6 ?? timelineSat.sccNum}-timeline.csv`;
    link.click();
  };

  convertSensorPassesToCSV = (sensorPassesArray: Passes[]) => {
    const rows = sensorPassesArray
      .flatMap((sensorPass) =>
        sensorPass.passes.map((pass) => {
          const formattedStart = pass.start.toISOString();
          const formattedEnd = pass.end.toISOString();

          return `${sensorPass.sensor.sensorId},${SensorTimeline.csvField_(SensorTimeline.sensorDisplayName_(sensorPass.sensor))},${formattedStart},${formattedEnd}`;
        })
      )
      .join('\n');
    const csvData = `sensorId,sensorName,startTime,endTime\n${rows}`;

    return csvData;
  };

  /** The name the timeline draws for a sensor (uiName), falling back to the short and internal names. */
  private static sensorDisplayName_(sensor: DetailedSensor): string {
    return sensor.uiName ?? sensor.shortName ?? sensor.objName ?? '';
  }

  /** Quote a CSV field when it holds a comma, quote or line break. */
  private static csvField_(value: string): string {
    return /[",\n\r]/u.test(value) ? `"${value.replace(/"/gu, '""')}"` : value;
  }

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      // v13 marker: the wrappers are generated, not authored
      getEl('sensor-timeline-menu')?.classList.add('kt-ui-v13');
      getEl('sensor-timeline-menu-secondary')?.classList.add('kt-ui-v13');

      this.canvas_ = <HTMLCanvasElement>getEl('sensor-timeline-canvas');
      this.canvasStatic_ = <HTMLCanvasElement>getEl('sensor-timeline-canvas-static');
      this.ctx_ = this.canvas_.getContext('2d') as CanvasRenderingContext2D;
      this.ctxStatic_ = this.canvasStatic_!.getContext('2d') as CanvasRenderingContext2D;

      this.bindNumberSetting_(
        'sensor-timeline-setting-total-length',
        'calculationLength',
        () => this.lengthOfLookAngles_,
        (v) => {
          this.lengthOfLookAngles_ = v as Hours;
        }
      );
      this.bindNumberSetting_(
        'sensor-timeline-setting-interval',
        'calculationInterval',
        () => this.angleCalculationInterval_,
        (v) => {
          this.angleCalculationInterval_ = v as Seconds;
        }
      );
      this.bindNumberSetting_(
        'sensor-timeline-setting-bad-length',
        'badPassLength',
        () => this.lengthOfBadPass_,
        (v) => {
          this.lengthOfBadPass_ = v as Seconds;
        }
      );
      this.bindNumberSetting_(
        'sensor-timeline-setting-avg-length',
        'avgPassLength',
        () => this.lengthOfAvgPass_,
        (v) => {
          this.lengthOfAvgPass_ = v as Seconds;
        }
      );

      getEl('sensor-timeline-toggle')!.addEventListener('change', () => {
        this.detailedPlot = (<HTMLInputElement>getEl('sensor-timeline-toggle')).checked;
        this.ctxStatic_.reset();
        this.updateTimeline();
      });

      getEl('weather-toggle')!.addEventListener('change', () => {
        this.useWeather = (<HTMLInputElement>getEl('weather-toggle')).checked;
        this.ctxStatic_.reset();
        this.updateTimeline();
      });
    });
  }
  /**
   * Wire a numeric settings field: a number greater than zero recalculates the plot; anything else toasts, restores
   * the previous value and leaves the plot alone (an interval of 0 used to loop forever, text gave NaN dates).
   */
  private bindNumberSetting_(inputId: string, labelKey: string, get: () => number, set: (value: number) => void): void {
    const input = getEl(inputId) as HTMLInputElement;

    input.addEventListener('change', () => {
      const label = t7e(`plugins.SensorTimeline.labels.${labelKey}` as Parameters<typeof t7e>[0]);
      const value = readPositiveNumberInput(input, get(), t7e('plugins.SensorTimeline.errorMsgs.invalidSetting').replace('{setting}', label));

      if (value === null) {
        return;
      }

      set(value);
      this.ctxStatic_.reset();
      this.updateTimeline();
    });
  }

  addJs(): void {
    super.addJs();

    // We need to wait for the sensorIds to be assigned before we can use them. Once they are ready we will reload the users last selected sensors
    EventBus.getInstance().on(EventBusEvent.onCruncherReady, () => {
      const cachedEnabledSensors = PersistenceManager.getInstance().getItem(StorageKey.SENSOR_TIMELINE_ENABLED_SENSORS);
      let enabledSensors = [] as number[];

      if (cachedEnabledSensors) {
        enabledSensors = JSON.parse(cachedEnabledSensors) as number[];
      }

      if (enabledSensors.length > 0) {
        this.enabledSensors_ = this.allSensorLists_.filter((s: DetailedSensor) => enabledSensors.includes(s.sensorId!));

        if (this.enabledSensors_.length === 0) {
          this.enabledSensors_ = this.allSensorLists_;
        }
      }
    });

    EventBus.getInstance().on(EventBusEvent.selectSatData, (sat: BaseObject) => {
      if (!this.isMenuButtonActive) {
        return;
      }

      if (sat) {
        this.ctxStatic_.reset();
        this.updateTimeline();
        this.canvas_.style.display = 'block';
      }
    });
  }

  async updateTimeline(): Promise<void> {
    try {
      if (PluginRegistry.getPlugin(SelectSatManager)!.selectedSat === -1) {
        return;
      }
      if (!this.isMenuButtonActive) {
        return;
      }

      this.calculateSensors_();
      const passes = await this.calculatePasses_();
      const [Passes, SatInFoVs, SatInSuns, StationInNights, ClearSkies] = passes;
      /*
       * console.log('observable', Passes);
       * console.log('fov', SatInFoVs);
       * console.log('sun', SatInSuns);
       * console.log('night', StationInNights);
       * console.log('weather', ClearSkies);
       */

      this.drawTimeline_(Passes, SatInFoVs, SatInSuns, StationInNights, ClearSkies);
      this.emitActionUsed_();
    } catch (e) {
      errorManagerInstance.info(e);
    }
  }

  private calculateSensors_() {
    const sensorListDom = getEl('sensor-timeline-sensor-list');

    if (!sensorListDom) {
      errorManagerInstance.warn(t7e('plugins.SensorTimeline.errorMsgs.sensorListMissing'));

      return;
    }

    sensorListDom.innerHTML = '';

    for (const sensor of this.allSensorLists_) {
      if (!sensor.objName) {
        continue;
      }

      const sensorButton = document.createElement('button');
      const isEnabled = this.enabledSensors_.includes(sensor);

      sensorButton.type = 'button';
      sensorButton.classList.add('stl-sensor-toggle', isEnabled ? 'is-on' : 'is-off');

      sensorButton.innerText = sensor.uiName ?? sensor.shortName ?? sensor.objName;
      sensorButton.addEventListener('click', () => {
        if (sensorButton.classList.contains('is-off')) {
          sensorButton.classList.replace('is-off', 'is-on');
          this.enabledSensors_.push(sensor);
          ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
        } else {
          sensorButton.classList.replace('is-on', 'is-off');
          this.enabledSensors_.splice(this.enabledSensors_.indexOf(sensor), 1);
          ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
        }

        this.ctxStatic_.reset();
        this.updateTimeline();

        PersistenceManager.getInstance().saveItem(StorageKey.SENSOR_TIMELINE_ENABLED_SENSORS, JSON.stringify(this.enabledSensors_.map((s) => s.sensorId!)));
      });
      sensorListDom.appendChild(sensorButton);
    }
  }

  //
  // eslint-disable-next-line complexity
  /** Achievement signal: timeline drawn for the selected sat. Once per sat + enabled-sensor set. */
  private emitActionUsed_(): void {
    const satId = PluginRegistry.getPlugin(SelectSatManager)!.selectedSat;
    // Prefer the user's chosen sensor when it is enabled in the timeline
    const current = ServiceLocator.getSensorManager().getSensor();
    const shown = this.enabledSensors_.find((s) => s.objName === current?.objName) ?? this.enabledSensors_[0];
    const sensorId = shown?.objName ?? shown?.name;
    const key = `${satId}|${this.enabledSensors_.map((s) => s.objName).join(',')}`;

    if (satId < 0 || key === this.lastActionKey_) {
      return;
    }
    this.lastActionKey_ = key;
    EventBus.getInstance().emit(EventBusEvent.pluginActionUsed, this.id, sensorId ? { satId, sensorId } : { satId });
  }

  private async calculatePasses_(): Promise<Passes[][]> {
    const AllPasses: Passes[] = [];
    const AllSatInFoVs: Passes[] = [];
    const AllSatinSuns: Passes[] = [];
    const AllSensorNights: Passes[] = [];
    const AllClearSkies: Passes[] = [];
    const satellite = PluginRegistry.getPlugin(SelectSatManager)!.getSelectedSat() as Satellite;
    const startDate = ServiceLocator.getTimeManager().getOffsetTimeObj(0);
    startDate.setMinutes(0, 0, 0);
    /*
     * console.log('start date', startDate);
     * console.log('utc', startDate.getUTCHours(), startDate.getUTCMinutes());
     */
    const endDate = new Date(startDate.getTime() + this.lengthOfLookAngles_ * 60 * 60 * 1000);
    endDate.setHours(endDate.getHours() + 1, 0, 0, 0);
    /*
     * console.log('end date', endDate);
     * console.log('utc', endDate.getUTCHours(), endDate.getUTCMinutes());
     */

    let weatherDataForAllSensors = [] as weatherReport[] | null;

    // Get weather data if we are using it
    if (this.useWeather) {
      // Get the optical sensors that need weather data, no reason to fetch weather for other sensors
      const weatherDataInput = this.enabledSensors_
        .filter((sensor) => sensor.type === SpaceObjectType.OPTICAL)
        .map((sensor) => ({
          id: sensor.sensorId,
          lat: sensor.lat,
          lon: sensor.lon,
        })) as WeatherDataInput; // We will only use this if it is not empty

      // Get weather from API if we are using it otherwise set it to null
      const weatherDataOutput = weatherDataInput.length > 0 ? await this.getWeather_(weatherDataInput, startDate, endDate) : null;

      weatherDataForAllSensors = this.enabledSensors_.map((sensor) => {
        const idx = weatherDataInput.findIndex((weather) => weather.id === sensor.sensorId);

        // A failed forecast fetch returns null: the sensor's weather is then unknown, which is not a reason to stop drawing
        if (idx !== -1) {
          return weatherDataOutput?.[idx] ?? null;
        }

        return null;
      }) as weatherReport[]; // We will only use this if it is not empty
    }

    // Satellite sunlight does not depend on the sensor: compute it once for the whole window (only drawn in Detailed Plot)
    const satInSunPasses = this.detailedPlot ? SensorTimeline.calculateSatInSunPasses(satellite, startDate, endDate, this.angleCalculationInterval_) : [];

    // Loop through all the enabled sensors and calculate the passes
    for (const [sensorIdx, sensor] of this.enabledSensors_.entries()) {
      const observable: Passes = { sensor, type: PassTypes.CAN_OBSERVE, passes: [] };
      const inFov: Passes = { sensor, type: PassTypes.IN_FOV, passes: [] };
      const inSun: Passes = { sensor, type: PassTypes.SAT_IN_SUN, passes: satInSunPasses };
      const night: Passes = { sensor, type: PassTypes.STATION_IN_NIGHT, passes: [] };
      const clear: Passes = { sensor, type: PassTypes.CLEAR_SKIES, passes: [] };
      const pushRecords = () => {
        AllPasses.push(observable);
        AllSatInFoVs.push(inFov);
        AllSatinSuns.push(inSun);
        AllSensorNights.push(night);
        AllClearSkies.push(clear);
      };

      // Get weather data for the sensor if it is available
      const weatherReport = weatherDataForAllSensors ? weatherDataForAllSensors[sensorIdx] : null;

      // Skip if satellite is above the max range of the sensor
      if (sensor.maxRng < satellite.perigee && (!sensor.maxRng2 || sensor.maxRng2 < satellite.perigee)) {
        // Every list gets an entry so index i still means the same sensor in all five (drawTimeline_ reads them by index)
        pushRecords();
        continue;
      }

      SensorManager.updateSensorUiStyling([sensor]);

      const isOptical = sensor.type === SpaceObjectType.OPTICAL;
      const durationInSeconds = ((endDate.getTime() - startDate.getTime()) / 1000) as Seconds;
      const interval = this.angleCalculationInterval_;
      const trackObservable = SensorTimeline.createIntervalTracker_(observable.passes);
      const trackInFov = SensorTimeline.createIntervalTracker_(inFov.passes);
      const trackNight = SensorTimeline.createIntervalTracker_(night.passes);
      const trackClear = SensorTimeline.createIntervalTracker_(clear.passes);
      // Detailed Plot also tracks night and clear skies, which change while the satellite is out of view
      const canSkip = !this.detailedPlot;
      const reach = SensorTimeline.visibilityReach_(satellite, sensor);

      // Radar and other non-optical sites do not care about daylight or clouds: those rows span the whole window
      if (!isOptical) {
        night.passes.push({ start: startDate, end: endDate });

        if (this.useWeather) {
          clear.passes.push({ start: startDate, end: endDate });
        }
      }

      for (let i = 0; i < durationInSeconds; i += interval) {
        const now = new Date(startDate.getTime() + i * 1000);
        const isLastSample = i + interval >= durationInSeconds;
        const rae = SatMath.getRae(now, satellite.satrec!, sensor) as { rng: Kilometers; el: Degrees; az: Degrees };
        const isSatInFov = SensorTimeline.isRaeInFov_(rae, sensor);
        let weather = WeatherStatus.UNKOWN;

        // Weather only matters while the satellite is in view
        if (isSatInFov) {
          if (isOptical && this.useWeather) {
            if (weatherReport) {
              weather = SensorTimeline.checkWeatherIsGood(weatherReport, now) ? WeatherStatus.CLEAR : WeatherStatus.CLOUDY;
            }
          } else {
            weather = WeatherStatus.CLEAR;
          }
        }

        const canObserve = isSatInFov && SensorTimeline.checkObservable(now, satellite, sensor);

        trackObservable(canObserve && weather === WeatherStatus.CLEAR, now, isLastSample);

        trackInFov(isSatInFov, now, isLastSample);

        if (isOptical && this.detailedPlot) {
          trackNight(SensorTimeline.checkStationInNight(now, sensor), now, isLastSample);

          if (this.useWeather) {
            trackClear(weather === WeatherStatus.CLEAR, now, isLastSample);
          }
        }

        // Jump over samples the satellite cannot reach the sensor's view in; whole intervals keep the sample grid
        if (canSkip && !isSatInFov) {
          i += Math.floor(SensorTimeline.secondsUntilPossibleView_(rae, sensor, reach) / interval) * interval;
        }
      }

      pushRecords();
    }

    return [AllPasses, AllSatInFoVs, AllSatinSuns, AllSensorNights, AllClearSkies];
  }

  /**
   * Bounds for the pass search jump. maxAngle: the largest Earth-central angle between site and satellite at which the
   * satellite can be above the sensor's lowest elevation (taken at apogee, where that angle is widest). maxRate: the
   * fastest that angle can shrink (satellite angular rate at perigee plus Earth rotation, with a 10% margin).
   */
  private static visibilityReach_(satellite: Satellite, sensor: DetailedSensor): { maxAngle: Radians; maxRate: number } {
    const siteRadius = RADIUS_OF_EARTH + sensor.alt;
    const lowestEl = Math.min(sensor.minEl, sensor.minEl2 ?? sensor.minEl) * DEG2RAD;
    const a = satellite.semiMajorAxis;
    const e = satellite.eccentricity;
    const apogeeRadius = a * (1 + e);
    const perigeeRadius = a * (1 - e);
    const maxAngle = Math.acos(Math.min(1, (siteRadius * Math.cos(lowestEl)) / apogeeRadius)) - lowestEl;
    const angularMomentum = Math.sqrt(earthGravityParam * a * (1 - e * e));
    const maxRate = (angularMomentum / (perigeeRadius * perigeeRadius) + angularVelocityOfEarth) * 1.1;

    return { maxAngle: maxAngle as Radians, maxRate };
  }

  /**
   * Lower bound on the seconds before an out-of-view satellite could enter the sensor's view: the Earth-central angle
   * it must still close (less a 2 degree margin for the spherical Earth used here) divided by the fastest closing rate.
   * Azimuth and range limits only shrink the view, so ignoring them keeps the bound safe for every FOV shape.
   */
  private static secondsUntilPossibleView_(rae: { rng: Kilometers; el: Degrees }, sensor: DetailedSensor, reach: { maxAngle: Radians; maxRate: number }): number {
    if (!rae.rng) {
      return 0;
    }
    const siteRadius = RADIUS_OF_EARTH + sensor.alt;
    const elRad = rae.el * DEG2RAD;
    const up = siteRadius + rae.rng * Math.sin(elRad);
    const satRadius = Math.sqrt(siteRadius * siteRadius + rae.rng * rae.rng + 2 * siteRadius * rae.rng * Math.sin(elRad));
    const centralAngle = Math.acos(Math.max(-1, Math.min(1, up / satRadius)));
    const angleToClose = centralAngle - reach.maxAngle - 2 * DEG2RAD;

    return angleToClose > 0 ? angleToClose / reach.maxRate : 0;
  }

  /**
   * Edge detector for one interval list. Feed it one boolean per sample; it opens an interval on the first true,
   * closes it (pushing {start, end}) on the first false, and force-closes at the last sample. Returns true on a close.
   */
  private static createIntervalTracker_(out: Pass[]): (active: boolean, now: Date, isLastSample: boolean) => boolean {
    let openedAt: Date | null = null;

    return (active, now, isLastSample) => {
      let closed = false;

      if (active && !openedAt) {
        openedAt = now;
      } else if (!active && openedAt) {
        out.push({ start: openedAt, end: now });
        openedAt = null;
        closed = true;
      }

      if (openedAt && isLastSample) {
        out.push({ start: openedAt, end: now });
        openedAt = null;
        closed = true;
      }

      return closed;
    };
  }

  static checkSatInFOV(now: Date, satrec: SatelliteRecord, sensor: DetailedSensor): boolean {
    return SensorTimeline.isRaeInFov_(SatMath.getRae(now, satrec, sensor) as { rng: Kilometers; el: Degrees; az: Degrees }, sensor);
  }

  private static isRaeInFov_(rae: { rng: Kilometers; el: Degrees; az: Degrees }, sensor: DetailedSensor): boolean {
    if (!rae.az || !rae.el || !rae.rng) {
      return false;
    }

    return SatMath.checkIsInView(sensor, rae);
  }

  static checkObservable(now: Date, satellite: Satellite, sensor: DetailedSensor) {
    if (sensor.type !== SpaceObjectType.OPTICAL) {
      return true;
    }

    // An optical sensor sees the satellite when the site is dark and the satellite is sunlit
    return SensorTimeline.checkStationInNight(now, sensor) && SensorTimeline.checkSatinSun(now, satellite);
  }

  /**
   * True when the Sun is below the site's horizon (its centre more than its own radius, about 0.27 deg, below it).
   * Delegates to SatMath.isGroundSiteInNight, the shared ground-site test used by Look Angles and SensorManager.
   */
  static checkStationInNight(now: Date, sensor: DetailedSensor): boolean {
    const lla = {
      lat: (sensor.lat * DEG2RAD) as Radians,
      lon: (sensor.lon * DEG2RAD) as Radians,
      alt: sensor.alt,
    };
    const { gmst } = calcGmst(now);
    const sensorPos = lla2eci(lla, gmst);

    sensor.position = sensorPos;

    return SatMath.isGroundSiteInNight(sensorPos, Sun.eci(now));
  }

  static checkSatinSun(now: Date, satellite: Satellite) {
    const sunPos = Sun.eci(now);
    const satPos = SatMath.getEci(satellite, now);
    const satInSun = SatMath.calculateIsInSun(satPos, sunPos);

    if (satInSun === SunStatus.SUN) {
      return true;
    }

    return false;
  }

  /**
   * Sunlit periods of the satellite over [startDate, endDate), sampled every `interval` seconds. A period still open
   * at the last sample ends there. Independent of any sensor, so it is computed once per draw.
   */
  static calculateSatInSunPasses(satellite: Satellite, startDate: Date, endDate: Date, interval: Seconds): Pass[] {
    const passes: Pass[] = [];
    const durationInSeconds = (endDate.getTime() - startDate.getTime()) / 1000;
    let start: Date | null = null;
    let last: Date | null = null;

    for (let i = 0; i < durationInSeconds; i += interval) {
      const now = new Date(startDate.getTime() + i * 1000);
      const isInSun = SensorTimeline.checkSatinSun(now, satellite);

      if (isInSun && !start) {
        start = now;
      } else if (!isInSun && start) {
        passes.push({ start, end: now });
        start = null;
      }
      last = now;
    }

    if (start && last && last.getTime() > start.getTime()) {
      passes.push({ start, end: last });
    }

    return passes;
  }

  static checkWeatherIsGood(weatherReport: weatherReport, now: Date): boolean {
    const diffs = weatherReport.hourly.map((date) => Math.abs(date.getTime() - now.getTime()));
    const minDiff = Math.min(...diffs);
    const idx = diffs.indexOf(minDiff);

    if (weatherReport.cloudCover[idx] < 50) {
      return true;
    }

    return false;
  }

  private drawTimeline_(Passes: Passes[], SatinFoVs: Passes[], SatinSuns: Passes[], StationInNights: Passes[], clearSkies: Passes[]): void {
    const startDate = ServiceLocator.getTimeManager().getOffsetTimeObj(0);

    startDate.setMinutes(0, 0, 0);
    const startTime = startDate.getTime() as Milliseconds;

    const endDate = new Date(startDate.getTime() + this.lengthOfLookAngles_ * 60 * 60 * 1000);

    endDate.setHours(endDate.getHours() + 1, 0, 0, 0);
    const endTime = endDate.getTime() as Milliseconds;

    const startHourOffset = 0 as Milliseconds;

    const nameOffset = 5;
    const numSensors = Passes.length;
    const numPlotsPerSensor = this.useWeather ? 5 : 4;

    this.height ??= this.canvas_.height * 0.75;
    const rowHeight = (this.height - 15) / (numSensors * numPlotsPerSensor + 1) > 20 ? 20 : (this.height - 15) / (numSensors * numPlotsPerSensor + 1);
    const barHeight = rowHeight * 0.75;
    const interBarHeight = rowHeight * 0.25;
    let yPos = this.topOffset + barHeight + interBarHeight + 5;
    let plotHeight = this.topOffset + barHeight + interBarHeight + 5;
    const gapBetweenRows = 5;

    // Draw passes grouped by sensor
    for (let i = 0; i < Passes.length; i++) {
      plotHeight += gapBetweenRows + barHeight + interBarHeight;

      if (this.detailedPlot) {
        if (SatinFoVs[i] && SatinFoVs[i].sensor.type === SpaceObjectType.OPTICAL) {
          plotHeight += gapBetweenRows + barHeight + interBarHeight;
        }
        if (StationInNights[i] && StationInNights[i].sensor.type === SpaceObjectType.OPTICAL) {
          plotHeight += gapBetweenRows + barHeight + interBarHeight;
        }
        if (this.useWeather && clearSkies[i] && clearSkies[i].sensor.type === SpaceObjectType.OPTICAL) {
          plotHeight += gapBetweenRows + barHeight + interBarHeight;
        }
      }
      plotHeight += gapBetweenRows * 2;
    }

    if (this.detailedPlot) {
      plotHeight += 5 + barHeight + interBarHeight;
    }
    plotHeight += barHeight + interBarHeight + 5; // Bottom padding

    this.drawEmptyPlot_(startTime, endTime, plotHeight);

    // Draw passes grouped by sensor
    for (let i = 0; i < Passes.length; i++) {
      // Draw "can Observe" pass
      this.drawPasses_(Passes[i], i, startHourOffset, startTime, yPos, barHeight, nameOffset);
      yPos += gapBetweenRows + barHeight + interBarHeight;

      if (this.detailedPlot) {
        // Draw "in FoV" pass (only for OPTICAL sensors)
        if (SatinFoVs[i] && SatinFoVs[i].sensor.type === SpaceObjectType.OPTICAL) {
          this.drawPasses_(SatinFoVs[i], i, startHourOffset, startTime, yPos, barHeight, nameOffset);
          yPos += gapBetweenRows + barHeight + interBarHeight;
        }

        // Draw "in Eclipse" pass (only for OPTICAL sensors)
        if (StationInNights[i] && StationInNights[i].sensor.type === SpaceObjectType.OPTICAL) {
          this.drawPasses_(StationInNights[i], i, startHourOffset, startTime, yPos, barHeight, nameOffset);
          yPos += gapBetweenRows + barHeight + interBarHeight;
        }

        // Draw "has good weather" pass (only for OPTICAL sensors and if useWeather)
        if (this.useWeather && clearSkies[i] && clearSkies[i].sensor.type === SpaceObjectType.OPTICAL) {
          this.drawPasses_(clearSkies[i], i, startHourOffset, startTime, yPos, barHeight, nameOffset);
          yPos += gapBetweenRows + barHeight + interBarHeight;
        }
      }

      yPos += gapBetweenRows * 2;
    }

    if (this.detailedPlot && SatinSuns[0]) {
      this.drawPasses_(SatinSuns[0], numSensors - 1, startHourOffset, startTime, yPos, barHeight, nameOffset);
      yPos += 5 + barHeight + interBarHeight;
    }

    // Add one mousemove event
    this.canvas_.addEventListener('mousemove', (event) => {
      this.handleOnMouseMove_(event);
    });

    // Save initial state as staticCtx_ so we can redraw the static elements without clearing the canvas
    this.ctxStatic_ = this.canvasStatic_.getContext('2d')!;
    this.ctxStatic_.drawImage(this.canvas_, 0, 0);
  }

  private drawTooltip_(text: string, mouseX: number, mouseY: number) {
    this.ctx_.font = '14px Consolas';

    const boxWidth = this.ctx_.measureText(text).width;

    // Draw tooltip box (first box is bigger to make a white border)
    this.ctx_.fillStyle = 'rgb(255, 255, 255)';
    this.ctx_.fillRect(mouseX - boxWidth / 2 - 6, mouseY - 30, boxWidth + 12, 24);
    // Draw tooltip box (second box is smaller to create a border effect)
    this.ctx_.fillStyle = 'rgb(31, 51, 71)';
    this.ctx_.fillRect(mouseX - boxWidth / 2 - 3, mouseY - 27, boxWidth + 6, 18);

    // Draw tooltip text
    this.ctx_.fillStyle = 'rgb(255, 255, 255)';
    this.ctx_.fillText(text, mouseX - boxWidth / 2, mouseY - 15);

    // Make mouse cursor a pointer
    this.canvas_.style.cursor = 'pointer';
  }

  private handleOnMouseMove_(event: MouseEvent): void {
    // clear canvas
    this.ctx_.reset();

    // Draw static elements
    this.ctx_.drawImage(this.canvasStatic_, 0, 0);

    const rect = this.canvas_.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let isHoveringOverPass = false;

    for (const key in this.drawEvents_) {
      if (!this.drawEvents_[key]) {
        continue;
      }

      const success = this.drawEvents_[key](mouseX, mouseY);

      isHoveringOverPass = isHoveringOverPass || success;
    }
    if (!isHoveringOverPass) {
      this.canvas_.style.cursor = 'default';
    }
  }

  private resizeCanvas_(isForceWidescreen?: boolean): void {
    isForceWidescreen ??= false;
    const timelineMenuDOM = getEl('sensor-timeline-menu')!;
    if (isForceWidescreen || window.innerWidth > window.innerHeight) {
      timelineMenuDOM.style.width = `${window.innerWidth}px`;
      this.canvas_.width = window.innerWidth;
      this.canvas_.height = window.innerHeight;
    } else {
      settingsManager.mapWidth = settingsManager.mapHeight * 2;
      timelineMenuDOM.style.width = `${settingsManager.mapWidth}px`;
      this.canvas_.width = window.innerWidth;
      this.canvas_.style.width = `${window.innerWidth}px`;
      this.canvas_.height = window.innerHeight - 100;
      this.canvas_.style.height = `${window.innerHeight - 100}px`;
    }

    this.canvasStatic_.width = this.canvas_.width;
    this.canvasStatic_.height = this.canvas_.height;
  }

  private drawEmptyPlot_(startTime: Milliseconds, endTime: Milliseconds, plotHeight: number): void {
    const oldCanvas = this.canvas_;
    const newCanvas = oldCanvas.cloneNode(true) as HTMLCanvasElement;

    oldCanvas.parentNode?.replaceChild(newCanvas, oldCanvas);
    this.canvas_ = newCanvas;
    this.ctx_ = this.canvas_.getContext('2d')!;

    // Clear the events list
    this.drawEvents_ = {};

    this.leftOffset = this.canvas_.width * 0.15;
    this.topOffset = 0;
    this.width = this.canvas_.width * 0.75;
    this.height = Math.max(this.canvas_.height * 0.75, plotHeight);

    // clear canvas
    this.ctx_.reset();

    this.ctx_.fillStyle = 'rgb(58, 58, 58)'; // #3a3a3a
    this.ctx_.fillRect(this.leftOffset, this.topOffset, this.width, this.height - 15);
    this.xScale = this.width / (endTime - startTime);

    // Draw time axis
    this.ctx_.strokeStyle = 'rgb(255, 255, 255)';
    this.ctx_.lineWidth = 5; // Increase line width to make it thicker
    this.ctx_.beginPath();
    this.ctx_.moveTo(this.leftOffset, this.topOffset + this.height - 20);
    this.ctx_.lineTo(this.leftOffset + this.width, this.topOffset + this.height - 20);
    this.ctx_.stroke();

    const timeManager = ServiceLocator.getTimeManager();
    const initialHour = timeManager.simulationTimeObj.getUTCHours();

    for (let i = 0; i <= this.lengthOfLookAngles_ + 1; i++) {
      const x = this.leftOffset + i * 60 * 60 * 1000 * this.xScale;
      this.ctx_.lineWidth = 5; // Increase line width to make it thicker
      this.ctx_.beginPath();
      this.ctx_.moveTo(x, this.topOffset + this.height - 25);
      this.ctx_.lineTo(x, this.topOffset + this.height - 15);
      this.ctx_.strokeStyle = 'rgb(255, 255, 255)';
      this.ctx_.stroke();

      // Extend a thin line to the top of the canvas
      this.ctx_.lineWidth = 1;
      this.ctx_.beginPath();
      this.ctx_.moveTo(x, this.topOffset + this.height - 15);
      this.ctx_.lineTo(x, this.topOffset);
      this.ctx_.stroke();

      const hour = (initialHour + i) % 24;

      this.ctx_.font = '14px Consolas';
      this.ctx_.fillStyle = 'rgb(255, 255, 255)';
      this.ctx_.fillText(`${hour}h`, x - 10, this.topOffset + this.height);
    }
  }

  private drawPasses_(
    sensorPass: Passes,
    index: number,
    startHourOffset: Milliseconds,
    startTime: Milliseconds,
    yPos: number = 0,
    height: number = 20,
    nameOffset: number = 200
  ): void {
    // Draw sensor name
    this.ctx_.fillStyle = 'rgb(255, 255, 255)';
    this.ctx_.font = '14px Consolas';
    this.ctx_.textAlign = 'right';
    if (this.detailedPlot) {
      if (sensorPass.type === PassTypes.SAT_IN_SUN) {
        this.ctx_.fillText(SensorTimeline.passTypeLabel_(PassTypes.SAT_IN_SUN), this.leftOffset - nameOffset, yPos + 5);
      } else if (sensorPass.type === PassTypes.CAN_OBSERVE) {
        this.ctx_.fillText(sensorPass.sensor.uiName ?? t7e('plugins.SensorTimeline.msgs.missingUiName'), this.leftOffset - nameOffset, yPos + 5);
      } else {
        this.ctx_.fillText(SensorTimeline.passTypeLabel_(sensorPass.type as PassTypes), this.leftOffset - nameOffset, yPos + 5);
      }
    } else {
      this.ctx_.fillText(sensorPass.sensor.uiName ?? t7e('plugins.SensorTimeline.msgs.missingUiName'), this.leftOffset - nameOffset, yPos + 5);
    }

    sensorPass.passes.forEach((pass) => {
      const passStart = pass.start.getTime() + startHourOffset;
      const passEnd = pass.end.getTime() + startHourOffset;
      const x1 = this.leftOffset + (passStart - startTime) * this.xScale;
      const x2 = this.leftOffset + (passEnd - startTime) * this.xScale;

      const passLength = (passEnd - passStart) / MILLISECONDS_PER_SECOND;

      if (sensorPass.type === PassTypes.CAN_OBSERVE) {
        if (passLength < this.lengthOfBadPass_) {
          this.ctx_.fillStyle = 'rgb(255, 42, 4)';
        } else if (passLength < this.lengthOfAvgPass_) {
          this.ctx_.fillStyle = 'rgb(252, 232, 58)';
        } else {
          this.ctx_.fillStyle = 'rgb(86, 240, 0)';
        }
      } else if (sensorPass.type === PassTypes.IN_FOV) {
        this.ctx_.fillStyle = 'rgb(14, 140, 140)';
      } else if (sensorPass.type === PassTypes.CLEAR_SKIES) {
        this.ctx_.fillStyle = 'rgb(24, 49, 163)';
      } else if (sensorPass.type === PassTypes.SAT_IN_SUN) {
        this.ctx_.fillStyle = 'rgb(255, 238, 0)';
      } else if (sensorPass.type === PassTypes.STATION_IN_NIGHT) {
        this.ctx_.fillStyle = 'rgb(11, 80, 63)';
      }

      this.ctx_.fillRect(x1, yPos - height / 2, x2 - x1, height);
      const drawEvent = (mouseX: number, mouseY: number): boolean => {
        if (mouseX >= x1 - 10 && mouseX <= x2 + 10 && mouseY >= yPos - 10 && mouseY <= yPos + 10) {
          const startTime = new Date(passStart).toISOString().slice(11, 19);
          const endTime = new Date(passEnd).toISOString().slice(11, 19);
          let text = '';

          switch (sensorPass.type) {
            case PassTypes.CAN_OBSERVE:
              text = `${sensorPass.sensor.uiName}: ${startTime} - ${endTime} (${t7e('plugins.SensorTimeline.msgs.observable')})`;
              break;
            case PassTypes.IN_FOV:
              text = `${sensorPass.sensor.uiName}: ${startTime} - ${endTime} (${t7e('plugins.SensorTimeline.msgs.inFov')})`;
              break;
            case PassTypes.STATION_IN_NIGHT:
              text = `${sensorPass.sensor.uiName}: ${startTime} - ${endTime} (${t7e('plugins.SensorTimeline.msgs.atNight')})`;
              break;
            case PassTypes.CLEAR_SKIES:
              text = `${sensorPass.sensor.uiName}: ${startTime} - ${endTime} (${t7e('plugins.SensorTimeline.msgs.clearSkies')})`;
              break;
            default:
              text = `${sensorPass.sensor.uiName}: ${startTime} - ${endTime}`;
              break;
          }
          this.drawTooltip_(text, mouseX, mouseY);

          return true;
        }

        return false;
      };

      this.drawEvents_[`${index} - ${passStart} - ${passEnd} - ${sensorPass.type}`] = drawEvent;

      // Create an onclick event for each pass
      this.canvas_.addEventListener('click', (event) => {
        const rect = this.canvas_.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // If the mouse is over a pass change the sensor
        if (drawEvent(mouseX, mouseY)) {
          const timeManagerInstance = ServiceLocator.getTimeManager();
          // Jump the clock first: setSensor re-emits selectSatData for the selected satellite, which redraws this
          // timeline from the new time. No deselect/reselect: deselecting closed this menu (it needs a satellite).
          timeManagerInstance.changeSimulationTime(new Date(passStart).getTime());
          timeManagerInstance.calculateSimulationTime();
          ServiceLocator.getSensorManager().setSensor(sensorPass.sensor);
        }
      });
    });

    // If no passes draw a light gray bar to indicate no passes
    if (sensorPass.passes.length === 0) {
      this.ctx_.fillStyle = 'rgba(200, 200, 200, 0.2)';
      this.ctx_.fillRect(this.leftOffset, yPos - height / 2, this.width, height);

      const drawEvent = (mouseX: number, mouseY: number): boolean => {
        if (mouseX >= this.leftOffset && mouseX <= this.leftOffset + this.width && mouseY >= yPos - 10 && mouseY <= yPos + 10) {
          const text = `${sensorPass.sensor.uiName}: ${t7e('plugins.SensorTimeline.msgs.noPasses')}`;
          this.drawTooltip_(text, mouseX, mouseY);

          return true;
        }

        return false;
      };

      this.drawEvents_[`${index} - ${sensorPass.sensor.id} - no - passes`] = drawEvent;
    }
  }

  private async getWeather_(weatherDataInput: WeatherDataInput, startDate: Date, endDate: Date): Promise<weatherReport[] | null> {
    const lats = weatherDataInput.map((sensor) => sensor.lat);
    const lons = weatherDataInput.map((sensor) => sensor.lon);

    const params = {
      latitude: lats,
      longitude: lons,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      hourly: 'cloud_cover',
    };

    // console.log(params);

    const url = 'https://api.open-meteo.com/v1/forecast';
    // Try max 3 times, backoff rate on failure of 0.2, max backoff of 2 sec (These are their recommended defaults)
    const responses = await fetchWeatherApi(url, params, 3, 0.2, 2).catch(() => null);

    // On failure, return null and let the caller handle it
    if (responses === null) {
      return null;
    }

    // Helper function to form time ranges
    const range = (start: number, stop: number, step: number) => Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

    // Process locations using map.
    const allWeatherData: weatherReport[] = responses.map((response) => {
      // Attributes for timezone and location
      const utcOffsetSeconds = response.utcOffsetSeconds();
      const hourly = response.hourly()!;

      // Note: The order of weather variables in the URL query and the indices below need to match!
      return {
        latitude: response.latitude(),
        longitude: response.longitude(),
        hourly: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map((t) => new Date((t + utcOffsetSeconds) * 1000)),
        cloudCover: hourly.variables(0)!.valuesArray()!,
      } as weatherReport;
    });

    return allWeatherData;
  }
}
