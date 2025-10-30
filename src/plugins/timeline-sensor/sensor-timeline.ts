/* eslint-disable max-statements */
/* eslint-disable max-lines-per-function */
/* eslint-disable max-lines */

import { MenuMode } from '@app/engine/core/interfaces';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import viewTimelinePng from '@public/img/icons/view_timeline.png';

import { SatMath, SunStatus } from '@app/app/analysis/sat-math';
import {
  BaseObject, calcGmst, DEG2RAD, Degrees, DetailedSatellite, DetailedSensor, EpochUTC, Hours, Kilometers, lla2eci, Milliseconds, MILLISECONDS_PER_SECOND, Radians,
  SatelliteRecord,
  Seconds, SpaceObjectType, Sun,
} from '@ootk/src/main';
import { SensorManager } from '../../app/sensors/sensorManager';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/sounds';

import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { fetchWeatherApi } from 'openmeteo';

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
  id: number;
  lat: number;
  lon: number;
}[];

export class SensorTimeline extends KeepTrackPlugin {
  readonly id = 'SensorTimeline';
  dependencies_ = [SelectSatManager.name];
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

  private lengthOfLookAngles_ = 24 as Hours;
  private lengthOfBadPass_ = 120 as Seconds;
  private lengthOfAvgPass_ = 240 as Seconds;
  private angleCalculationInterval_ = <Seconds>30;
  private detailedPlot = false;
  private useWeather = true;

  constructor() {
    super();

    this.allSensorLists_ = ServiceLocator.getSensorManager().getSensorList('ssn').concat(
      ServiceLocator.getSensorManager().getSensorList('mw'),
      ServiceLocator.getSensorManager().getSensorList('md'),
      ServiceLocator.getSensorManager().getSensorList('OWL-Net'),
      ServiceLocator.getSensorManager().getSensorList('leolabs'),
      ServiceLocator.getSensorManager().getSensorList('esoc'),
      ServiceLocator.getSensorManager().getSensorList('rus'),
      ServiceLocator.getSensorManager().getSensorList('prc'),
      ServiceLocator.getSensorManager().getSensorList('other'),
    );

    // remove duplicates in sensorList
    this.allSensorLists_ = this.allSensorLists_.filter(
      (sensor, index, self) => index === self.findIndex((t) => t.uiName === sensor.uiName),
    );

    this.enabledSensors_ = this.allSensorLists_.filter((s) =>
      ServiceLocator.getSensorManager().getSensorList('mw').includes(s),
    );
  }

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

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
    <div class="row">
      <div class="input-field col s12">
        <input id="sensor-timeline-setting-total-length" value="${this.lengthOfLookAngles_.toString()}" type="text"
          style="text-align: center;"
        />
        <label for="sensor-timeline-setting-total-length" class="active">Calculation Length (Hours)</label>
      </div>
    </div>
    <div class="row">
      <div class="input-field col s12">
        <input id="sensor-timeline-setting-interval" value="${this.angleCalculationInterval_.toString()}" type="text"
          style="text-align: center;"
        />
        <label for="sensor-timeline-setting-interval" class="active">Calculation Interval (Seconds)</label>
      </div>
    </div>
    <div class="row">
      <div class="input-field col s12">
        <input id="sensor-timeline-setting-bad-length" value="${this.lengthOfBadPass_.toString()}" type="text"
          style="text-align: center;"
        />
        <label for="sensor-timeline-setting-bad-length" class="active">Bad Pass Length (Seconds)</label>
      </div>
    </div>
    <div class="row">
      <div class="input-field col s12">
        <input id="sensor-timeline-setting-avg-length" value="${this.lengthOfAvgPass_.toString()}" type="text"
          style="text-align: center;"
        />
        <label for="sensor-timeline-setting-avg-length" class="active">Average Pass Length (Seconds)</label>
      </div>
    </div>
    <div class="switch row">
            <label for="sensor-timeline-toggle" data-position="top" data-delay="50" data-tooltip="Detailed Plot">
              <input id="sensor-timeline-toggle" type="checkbox"/>
              <span class="lever"></span>
              Detailed Plot
            </label>
    </div>
    <div class="switch row">
            <label for="weather-toggle" data-position="top" data-delay="50" data-tooltip="Account for weather when calculating passes using weather forecasts">
              <input id="weather-toggle" type="checkbox" checked/>
              <span class="lever"></span>
              Use Weather
            </label>
    </div>
    <div class="row" style="margin: 0 10px;">
      <div id="sensor-timeline-sensor-list">
      </div>
    </div>`;
  sideMenuSecondaryOptions = {
    width: 350,
    leftOffset: 0,
    zIndex: 10,
  };

  downloadIconCb = async () => {
    // Get transits data
    const passes = await this.calculatePasses_();
    const sensorData = passes[0];

    // Convert the sensorData to CSV format
    const csvData = this.convertSensorPassesToCSV(sensorData);

    // Create a Blob with the CSV data
    const blob = new Blob([csvData], { type: 'text/csv' });

    // Create a link element
    const link = document.createElement('a');

    // Create a URL for the Blob and set it as the href for the link
    link.href = URL.createObjectURL(blob);

    // Set the download attribute with a dynamically generated filename
    link.download = `sat-${(PluginRegistry.getPlugin(SelectSatManager)!.getSelectedSat() as DetailedSatellite).sccNum6}-timeline.csv`;

    // Simulate a click on the link to trigger the download
    link.click();
  };


  // Function to convert SensorPasses array to CSV
  convertSensorPassesToCSV = (sensorPassesArray: Passes[]) => {
    // Start the CSV with a   header
    const header = 'sensorId,sensorName,startTime,endTime';

    // Flatten the sensorPasses array into rows for the CSV
    const rows = sensorPassesArray.flatMap((sensorPass) => sensorPass.passes.map((pass) => {
      const formattedStart = pass.start.toISOString(); // Convert Date to ISO string
      const formattedEnd = pass.end.toISOString(); // Convert Date to ISO string


      return `${sensorPass.sensor.sensorId},${sensorPass.sensor.objName},${formattedStart},${formattedEnd}`;
    })).join('\n');

    // Combine header and rows
    const csvData = `${header}\n${rows}`;

    return csvData;
  };


  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        this.canvas_ = <HTMLCanvasElement>getEl('sensor-timeline-canvas');
        this.canvasStatic_ = <HTMLCanvasElement>getEl('sensor-timeline-canvas-static');
        this.ctx_ = this.canvas_.getContext('2d') as CanvasRenderingContext2D;
        this.ctxStatic_ = this.canvasStatic_!.getContext('2d') as CanvasRenderingContext2D;

        getEl('sensor-timeline-setting-total-length')!.addEventListener('change', () => {
          this.lengthOfLookAngles_ = parseFloat((<HTMLInputElement>getEl('sensor-timeline-setting-total-length')).value) as Hours;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });

        getEl('sensor-timeline-setting-interval')!.addEventListener('change', () => {
          this.angleCalculationInterval_ = parseFloat((<HTMLInputElement>getEl('sensor-timeline-setting-bad-length')).value) as Seconds;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });

        getEl('sensor-timeline-setting-bad-length')!.addEventListener('change', () => {
          this.lengthOfBadPass_ = parseFloat((<HTMLInputElement>getEl('sensor-timeline-setting-bad-length')).value) as Seconds;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });

        getEl('sensor-timeline-setting-avg-length')!.addEventListener('change', () => {
          this.lengthOfAvgPass_ = parseFloat((<HTMLInputElement>getEl('sensor-timeline-setting-avg-length')).value) as Seconds;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });

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
      },
    );

  }

  addJs(): void {
    super.addJs();

    // We need to wait for the sensorIds to be assigned before we can use them. Once they are ready we will reload the users last selected sensors
    EventBus.getInstance().on(
      EventBusEvent.onCruncherReady,
      () => {
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
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (sat: BaseObject) => {
        if (!this.isMenuButtonActive) {
          return;
        }

        if (sat) {
          this.ctxStatic_.reset();
          this.updateTimeline();
          this.canvas_.style.display = 'block';
        }
      },
    );
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

      const Passes = passes[0];
      const SatInFoVs = passes[1];
      const SatInSuns = passes[2];
      const StationInNights = passes[3];
      const ClearSkies = passes[4];

      /*
       * console.log('observable', Passes);
       * console.log('fov', SatInFoVs);
       * console.log('sun', SatInSuns);
       * console.log('night', StationInNights);
       * console.log('weather', ClearSkies);
       */

      this.drawTimeline_(Passes, SatInFoVs, SatInSuns, StationInNights, ClearSkies);
    } catch (e) {
      errorManagerInstance.info(e);
    }
  }

  private calculateSensors_() {
    const sensorListDom = getEl('sensor-timeline-sensor-list');

    if (!sensorListDom) {
      errorManagerInstance.warn('Could not find sensor list dom');

      return;
    }

    sensorListDom.innerHTML = '';

    for (const sensor of this.allSensorLists_) {
      if (!sensor.objName) {
        continue;
      }

      const sensorButton = document.createElement('button');

      sensorButton.classList.add('btn', 'btn-ui', 'waves-effect', 'waves-light');
      if (!this.enabledSensors_.includes(sensor)) {
        sensorButton.classList.add('btn-red');
      }

      sensorButton.innerText = sensor.uiName ?? sensor.shortName ?? sensor.objName;
      sensorButton.addEventListener('click', () => {
        if (sensorButton.classList.contains('btn-red')) {
          sensorButton.classList.remove('btn-red');
          this.enabledSensors_.push(sensor);
          ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
        } else {
          sensorButton.classList.add('btn-red');
          this.enabledSensors_.splice(this.enabledSensors_.indexOf(sensor), 1);
          ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
        }

        this.ctxStatic_.reset();
        this.updateTimeline();

        PersistenceManager.getInstance().saveItem(StorageKey.SENSOR_TIMELINE_ENABLED_SENSORS, JSON.stringify(this.enabledSensors_.map((s) => s.sensorId!)));
      });
      sensorListDom.appendChild(sensorButton);
      sensorListDom.appendChild(document.createTextNode(' '));
    }
  }

  //
  // eslint-disable-next-line complexity
  private async calculatePasses_(): Promise<Passes[][]> {
    const AllPasses: Passes[] = [];
    const AllSatInFoVs: Passes[] = [];
    const AllSatinSuns: Passes[] = [];
    const AllSensorNights: Passes[] = [];
    const AllClearSkies: Passes[] = [];
    const satellite = PluginRegistry.getPlugin(SelectSatManager)!.getSelectedSat() as DetailedSatellite;
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

        if (idx !== -1) {
          return weatherDataOutput![idx];
        }

        return null;
      }) as weatherReport[]; // We will only use this if it is not empty
    }

    // Loop through all the enabled sensors and calculate the passes
    for (const [i, sensor] of this.enabledSensors_.entries()) {
      const Passes: Passes = {
        sensor,
        type: PassTypes.CAN_OBSERVE,
        passes: [],
      };
      const SatInFoVs: Passes = {
        sensor,
        type: PassTypes.IN_FOV,
        passes: [],
      };
      const SatinSuns: Passes = {
        sensor,
        type: PassTypes.SAT_IN_SUN,
        passes: [],
      };
      const SensorNights: Passes = {
        sensor,
        type: PassTypes.STATION_IN_NIGHT,
        passes: [],
      };
      const ClearSkies: Passes = {
        sensor,
        type: PassTypes.CLEAR_SKIES,
        passes: [],
      };

      // Get weather data for the sensor if it is available
      const weatherReport = weatherDataForAllSensors ? weatherDataForAllSensors[i] : null;

      // Skip if satellite is above the max range of the sensor
      if (sensor.maxRng < satellite.perigee && (!sensor.maxRng2 || sensor.maxRng2 < satellite.perigee)) {
        AllPasses.push(Passes); // Add empty pass to keep the order of the sensors //!!//
        continue;
      }

      SensorManager.updateSensorUiStyling([sensor]);
      let offset = 0;

      // const durationInSeconds = this.lengthOfLookAngles_ * 60 * 60;
      const durationInSeconds = (endDate.getTime() - startDate.getTime()) / 1000 as Seconds;

      let isObservable = false;
      let isBecomeObservable = false;
      let isBecomeUnobservable = false;

      let startObservableTime = null as unknown as Date;

      // ---------------Forgive me for these Variable Names

      let isInFoV = false;
      let isEnterFov = false;
      let isExitFov = false;
      let startInFoVTime = null as unknown as Date;

      let isSatInSun = false;
      let isSatEnterSun = false;
      let isSatExitSun = false;
      let startSunTime = null as unknown as Date;

      let isStationInNight = false;
      let isStationEnterNight = false;
      let isStationExitNight = false;
      let startNightTime = null as unknown as Date;

      let isWeatherGood = false;
      let isWeatherBecomeGood = false;
      let isWeatherBecomeBad = false;
      let startGoodWeatherTime = null as unknown as Date;


      // ---------------

      if (sensor.type !== SpaceObjectType.OPTICAL) {
        SensorNights.passes.push({
          start: startDate,
          end: endDate,
        });

        if (this.useWeather) {
          ClearSkies.passes.push({
            start: startDate,
            end: endDate,
          });
        }
      }

      for (let i = 0; i < durationInSeconds; i += this.angleCalculationInterval_) {
        let weatherStatusThisIter = WeatherStatus.UNKOWN;

        offset = i * 1000 as Milliseconds;
        // const now = ServiceLocator.getTimeManager().getOffsetTimeObj(offset);
        const now = new Date(startDate.getTime() + offset);

        // Calculate Observability conditions
        const isInFOVAtThisIter = SensorTimeline.checkSatInFOV(now, satellite.satrec!, sensor);
        const isObservableAtThisIter = SensorTimeline.checkObservable(now, satellite, sensor);

        // If it is in the FOV, check if it is observable, otherwise leave it unknown since it doesn't matter
        if (isInFOVAtThisIter) {
          if (this.useWeather && weatherReport && sensor.type === SpaceObjectType.OPTICAL) {
            weatherStatusThisIter = SensorTimeline.checkWeatherIsGood(weatherReport, now) ? WeatherStatus.CLEAR : WeatherStatus.CLOUDY;
          } else if (this.useWeather && !weatherReport && sensor.type === SpaceObjectType.OPTICAL) {
            // If we are using the weather API but there is no data, we leave it as unknown
            weatherStatusThisIter = WeatherStatus.UNKOWN;
          } else {
            // If we aren't using the weather API or the sensor is not optical, we set it to clear
            weatherStatusThisIter = WeatherStatus.CLEAR;
          }
        }

        const isStationInNightAtThisIter = SensorTimeline.checkStationInNight(now, sensor);
        const isSatInSunAtThisIter = SensorTimeline.checkSatinSun(now, satellite);

        // -------- Find observable periods by using all conditions

        // Check if sat is Observable and enters the FoV
        if (isInFOVAtThisIter && !isObservable && isObservableAtThisIter && weatherStatusThisIter === WeatherStatus.CLEAR) {
          startObservableTime = now;
          isObservable = true;
          isBecomeObservable = true;
        }

        // Check if sat exits the FoV or becomes Unobservable
        if ((!isInFOVAtThisIter || !isObservableAtThisIter || weatherStatusThisIter !== WeatherStatus.CLEAR) && isObservable) {
          isBecomeUnobservable = true;
          isObservable = false;
        }

        // If sat enters and exits an observable period append it to the list
        if ((isBecomeObservable && isBecomeUnobservable) || (isBecomeObservable && i === durationInSeconds - this.angleCalculationInterval_)) {
          Passes.passes.push({
            start: startObservableTime,
            end: now,
          });
          isBecomeObservable = false;
          isBecomeUnobservable = false;
        }

        // -----------------------------------------------

        // Check if sat in FoV
        if (isInFOVAtThisIter && !isInFoV) {
          startInFoVTime = now;
          isInFoV = true;
          isEnterFov = true;
        }

        if (!isInFOVAtThisIter && isInFoV) {
          isExitFov = true;
          isInFoV = false;
        }

        if ((isEnterFov && isExitFov) || (isEnterFov && i === durationInSeconds - this.angleCalculationInterval_)) {
          SatInFoVs.passes.push({
            start: startInFoVTime,
            end: now,
          });
          isEnterFov = false;
          isExitFov = false;
        }

        // If it exits the FoV, then it wont be back for another orbit
        if (isExitFov) {
          if (!this.detailedPlot) {
            if (satellite.semiMajorAxis > 30000) {
              i += satellite.period * 60 * 0.5;
            } else {
              i += satellite.period * 60 * 0.75;
            }
          }
        }

        // Check if sat in Sun
        if (isSatInSunAtThisIter && !isSatInSun) {
          startSunTime = now;
          isSatInSun = true;
          isSatEnterSun = true;
        }
        if (!isSatInSunAtThisIter && isSatInSun) {
          isSatExitSun = true;
          isSatInSun = false;
        }
        if ((isSatEnterSun && isSatExitSun) || (isSatEnterSun && i === durationInSeconds - this.angleCalculationInterval_)) {
          SatinSuns.passes.push({
            start: startSunTime,
            end: now,
          });
          isSatEnterSun = false;
          isSatExitSun = false;
        }

        if (sensor.type === SpaceObjectType.OPTICAL && this.detailedPlot) {
          // Check if station in Night
          if (isStationInNightAtThisIter && !isStationInNight) {
            startNightTime = now;
            isStationInNight = true;
            isStationEnterNight = true;
          }
          if (!isStationInNightAtThisIter && isStationInNight) {
            isStationExitNight = true;
            isStationInNight = false;
          }
          if ((isStationEnterNight && isStationExitNight) || (isStationEnterNight && i === durationInSeconds - this.angleCalculationInterval_)) {
            SensorNights.passes.push({
              start: startNightTime,
              end: now,
            });
            isStationEnterNight = false;
            isStationExitNight = false;
          }

          if (this.useWeather) {
            // Check if weather is good

            if (weatherStatusThisIter === WeatherStatus.CLEAR && !isWeatherGood) {
              startGoodWeatherTime = now;
              isWeatherGood = true;
              isWeatherBecomeGood = true;
            }
            if (weatherStatusThisIter !== WeatherStatus.CLEAR && isWeatherGood) {
              isWeatherBecomeBad = true;
              isWeatherGood = false;
            }
            if ((isWeatherBecomeGood && isWeatherBecomeBad) || (isWeatherBecomeGood && i === durationInSeconds - this.angleCalculationInterval_)) {
              ClearSkies.passes.push({
                start: startGoodWeatherTime,
                end: now,
              });
              isWeatherBecomeGood = false;
              isWeatherBecomeBad = false;
            }

          }

        }
      }
      AllPasses.push(Passes);
      AllSatInFoVs.push(SatInFoVs);
      AllSatinSuns.push(SatinSuns);
      AllSensorNights.push(SensorNights);
      AllClearSkies.push(ClearSkies);
    }

    return [AllPasses, AllSatInFoVs, AllSatinSuns, AllSensorNights, AllClearSkies];
  }

  static checkSatInFOV(now: Date, satrec: SatelliteRecord, sensor: DetailedSensor): boolean {

    const rae = SatMath.getRae(now, satrec, sensor) as { rng: Kilometers, el: Degrees, az: Degrees };

    if (!rae.az || !rae.el || !rae.rng) {
      return false;
    }

    return SatMath.checkIsInView(sensor, rae);

  }

  static checkObservable(now: Date, satellite: DetailedSatellite, sensor: DetailedSensor) {


    if (sensor.type !== SpaceObjectType.OPTICAL) {
      return true;
    }

    const lla = {
      lat: (sensor.lat * DEG2RAD) as Radians,
      lon: (sensor.lon * DEG2RAD) as Radians,
      alt: sensor.alt,
    };

    const { gmst } = calcGmst(now);
    const sunPos = Sun.position(EpochUTC.fromDateTime(now));
    const sensorPos = lla2eci(lla, gmst);

    sensor.position = sensorPos;
    const stationInSun = SatMath.calculateIsInSun(sensor, sunPos);
    const satPos = SatMath.getEci(satellite, now);
    const satInSun = SatMath.calculateIsInSun(satPos, sunPos);
    // / Station is at night or penumbra

    if (((stationInSun === SunStatus.UMBRAL) || (stationInSun === SunStatus.PENUMBRAL)) && (satInSun === SunStatus.SUN)) {
      return true;
    }

    return false;

  }

  static checkStationInNight(now: Date, sensor: DetailedSensor) {
    const lla = {
      lat: (sensor.lat * DEG2RAD) as Radians,
      lon: (sensor.lon * DEG2RAD) as Radians,
      alt: sensor.alt,
    };

    const { gmst } = calcGmst(now);
    const sunPos = Sun.position(EpochUTC.fromDateTime(now));
    const sensorPos = lla2eci(lla, gmst);

    sensor.position = sensorPos;
    const stationInSun = SatMath.calculateIsInSun(sensor, sunPos);

    if (stationInSun === SunStatus.UMBRAL || stationInSun === SunStatus.PENUMBRAL) {
      return true;
    }

    return false;


  }

  static checkSatinSun(now: Date, satellite: DetailedSatellite) {
    const sunPos = Sun.position(EpochUTC.fromDateTime(now));
    const satPos = SatMath.getEci(satellite, now);
    const satInSun = SatMath.calculateIsInSun(satPos, sunPos);

    if (satInSun === SunStatus.SUN) {
      return true;
    }

    return false;

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

    if (this.detailedPlot) {
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
    console.log('draw tooltip', text, mouseX, mouseY);

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

    this.xScale = (this.width) / (endTime - startTime);

    // Draw time axis
    this.ctx_.strokeStyle = 'rgb(255, 255, 255)';
    this.ctx_.lineWidth = 5; // Increase line width to make it thicker
    this.ctx_.beginPath();
    this.ctx_.moveTo(this.leftOffset, this.topOffset + this.height - 20);
    this.ctx_.lineTo(this.leftOffset + this.width, this.topOffset + this.height - 20);
    this.ctx_.stroke();

    const timeManager = ServiceLocator.getTimeManager();
    const initialHour = timeManager.simulationTimeObj.getUTCHours();

    // Draw hour markers
    for (let i = 0; i <= this.lengthOfLookAngles_ + 1; i++) {
      const x = this.leftOffset + ((i * 60 * 60 * 1000) * this.xScale);

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

  private drawPasses_(sensorPass: Passes, index: number, startHourOffset: Milliseconds, startTime: Milliseconds, yPos: number = 0, height: number = 20,
    nameOffset: number = 200): void {

    // Draw sensor name
    this.ctx_.fillStyle = 'rgb(255, 255, 255)';
    this.ctx_.font = '14px Consolas';
    this.ctx_.textAlign = 'right';
    if (this.detailedPlot) {
      if (sensorPass.type === PassTypes.SAT_IN_SUN) {
        this.ctx_.fillText(PassTypes.SAT_IN_SUN, this.leftOffset - nameOffset, yPos + 5);
      } else if (sensorPass.type === PassTypes.CAN_OBSERVE) {
        this.ctx_.fillText((sensorPass.sensor.uiName ?? 'Missing uiName'), this.leftOffset - nameOffset, yPos + 5);
      } else {
        this.ctx_.fillText(sensorPass.type, this.leftOffset - nameOffset, yPos + 5);
      }
    } else {
      this.ctx_.fillText((sensorPass.sensor.uiName ?? 'Missing uiName'), this.leftOffset - nameOffset, yPos + 5);
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
              text = `${sensorPass.sensor.uiName}: ${startTime} - ${endTime} (Observable)`;
              break;
            case PassTypes.IN_FOV:
              text = `${sensorPass.sensor.uiName}: ${startTime} - ${endTime} (In FOV)`;
              break;
            case PassTypes.STATION_IN_NIGHT:
              text = `${sensorPass.sensor.uiName}: ${startTime} - ${endTime} (At Night)`;
              break;
            case PassTypes.CLEAR_SKIES:
              text = `${sensorPass.sensor.uiName}: ${startTime} - ${endTime} (Clear Skies)`;
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

          ServiceLocator.getSensorManager().setSensor(sensorPass.sensor);

          timeManagerInstance.changeStaticOffset(new Date(passStart).getTime() - timeManagerInstance.realTime);
          timeManagerInstance.calculateSimulationTime();

          const selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager)!;
          const currentSatId = selectSatManagerInstance.selectedSat;

          selectSatManagerInstance.selectSat(-1);
          selectSatManagerInstance.selectSat(currentSatId);
        }
      });

    });

    // If no passes draw a light gray bar to indicate no passes
    if (sensorPass.passes.length === 0) {
      this.ctx_.fillStyle = 'rgba(200, 200, 200, 0.2)';
      this.ctx_.fillRect(this.leftOffset, yPos - height / 2, this.width, height);

      const drawEvent = (mouseX: number, mouseY: number): boolean => {
        if (mouseX >= this.leftOffset && mouseX <= this.leftOffset + this.width && mouseY >= yPos - 10 && mouseY <= yPos + 10) {
          const text = `${sensorPass.sensor.uiName}: No Passes`;

          this.drawTooltip_(text, mouseX, mouseY);

          return true;
        }

        return false;
      };

      this.drawEvents_[`${index} - ${sensorPass.sensor.id} - no - passes`] = drawEvent;
    }

  }

  private async getWeather_(weatherDataInput:
    WeatherDataInput, startDate: Date, endDate: Date): Promise<weatherReport[] | null> {

    const lats = weatherDataInput.map((sensor) => sensor.lat);
    const lons = weatherDataInput.map((sensor) => sensor.lon);

    const params = {
      'latitude': lats,
      'longitude': lons,
      'start_date': startDate.toISOString().slice(0, 10),
      'end_date': endDate.toISOString().slice(0, 10),
      'hourly': 'cloud_cover',
    };

    // console.log(params);

    const url = 'https://api.open-meteo.com/v1/forecast';
    // Try max 3 times, backoff rate on failure of 0.2, max backoff of 2 sec (These are their recommended defaults)
    const responses = await fetchWeatherApi(url, params, 3, 0.2, 2)
      .catch(() => null);

    // On failure, return null and let the caller handle it
    if (responses === null) {
      return null;
    }

    // Helper function to form time ranges
    const range = (start: number, stop: number, step: number) =>
      Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

    // Process locations using map.
    const allWeatherData: weatherReport[] = responses.map((response) => {
      // Attributes for timezone and location
      const utcOffsetSeconds = response.utcOffsetSeconds();
      const hourly = response.hourly()!;

      // Note: The order of weather variables in the URL query and the indices below need to match!
      return {
        latitude: response.latitude(),
        longitude: response.longitude(),
        hourly: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
          (t) => new Date((t + utcOffsetSeconds) * 1000),
        ),
        cloudCover: hourly.variables(0)!.valuesArray()!,
      } as weatherReport;
    });

    return allWeatherData;
  }
}
