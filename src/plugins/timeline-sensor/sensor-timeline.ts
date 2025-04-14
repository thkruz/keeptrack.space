/* eslint-disable max-statements */
/* eslint-disable max-lines-per-function */
/* eslint-disable max-lines */
import { KeepTrackApiEvents, MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';
import viewTimelinePng from '@public/img/icons/view_timeline.png';

import { SatMath, SunStatus } from '@app/static/sat-math';
import {
  BaseObject, calcGmst, DEG2RAD, DetailedSatellite, DetailedSensor, EpochUTC, Hours, lla2eci, MILLISECONDS_PER_SECOND, Radians, RaeVec3, SatelliteRecord,
  Seconds, SpaceObjectType, Sun,
} from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SensorManager } from '../sensor/sensorManager';
import { SoundNames } from '../sounds/SoundNames';

import { fetchWeatherApi } from 'openmeteo';

interface Pass {
  start: Date;
  end: Date;
}

interface ObservablePasses {
  sensor: DetailedSensor;
  passes: Pass[];
}

interface weatherReport {
  latitude: number;
  longitude: number;
  hourly: Date[];
  cloudCover: Float32Array;
}

export class SensorTimeline extends KeepTrackPlugin {
  readonly id = 'SensorTimeline';
  dependencies_ = [SelectSatManager.name];
  private canvas_: HTMLCanvasElement;
  private ctx_: CanvasRenderingContext2D;
  private canvasStatic_: HTMLCanvasElement;
  private ctxStatic_: CanvasRenderingContext2D;
  private drawEvents_: { [key: string]: (mouseX: number, mouseY: number) => boolean } = {};
  private readonly allSensorLists_ = [] as DetailedSensor[];
  private readonly enabledSensors_: DetailedSensor[] = [];
  private lengthOfLookAngles_ = 24 as Hours;
  private lengthOfBadPass_ = 120 as Seconds;
  private lengthOfAvgPass_ = 240 as Seconds;
  private angleCalculationInterval_ = <Seconds>30;
  private detailedPlot = false;
  private useWeather = true;

  constructor() {
    super();

    this.allSensorLists_ = keepTrackApi.getSensorManager().getSensorList('ssn').concat(
      keepTrackApi.getSensorManager().getSensorList('mw'),
      keepTrackApi.getSensorManager().getSensorList('md'),
      keepTrackApi.getSensorManager().getSensorList('leolabs'),
      keepTrackApi.getSensorManager().getSensorList('esoc'),
      keepTrackApi.getSensorManager().getSensorList('rus'),
      keepTrackApi.getSensorManager().getSensorList('prc'),
      keepTrackApi.getSensorManager().getSensorList('other'),
    );

    // remove duplicates in sensorList
    this.allSensorLists_ = this.allSensorLists_.filter(
      (sensor, index, self) => index === self.findIndex((t) => t.uiName === sensor.uiName),
    );

    this.enabledSensors_ = this.allSensorLists_.filter((s) =>
      keepTrackApi.getSensorManager().getSensorList('mw').includes(s),
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
  sideMenuElementHtml = keepTrackApi.html`
    <div class="row"></div>
    <div class="row" style="margin: 0;">
      <canvas id="sensor-timeline-canvas"></canvas>
      <canvas id="sensor-timeline-canvas-static" style="display: none;"></canvas>
    </div>`;
  sideMenuSettingsHtml: string = keepTrackApi.html`
    <!-- <div class="switch row">
      <label>
        <input id="settings-riseset" type="checkbox" checked="true" />
        <span class="lever"></span>
        Show Only Rise and Set Times
      </label>
    </div> -->
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
    <!-- Toggle Switch for Boolean Values -->
    <div class="row">
      <label for="sensor-timeline-toggle" class="btn btn-ui waves-effect waves-light">
        <input type="checkbox" id="sensor-timeline-toggle" />
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
  sideMenuSettingsOptions = {
    width: 350,
    leftOffset: 0,
    zIndex: 10,
  };

  downloadIconCb = () => {
    // Get transits data
    const passes = this.calculatePasses_();
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
    link.download = `sat-${(keepTrackApi.getPlugin(SelectSatManager)!.getSelectedSat() as DetailedSatellite).sccNum6}-timeline.csv`;

    // Simulate a click on the link to trigger the download
    link.click();
  };


  // Function to convert SensorPasses array to CSV
  convertSensorPassesToCSV = (sensorPassesArray: ObservablePasses[]) => {
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

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        this.canvas_ = <HTMLCanvasElement>getEl('sensor-timeline-canvas');
        this.canvasStatic_ = <HTMLCanvasElement>getEl('sensor-timeline-canvas-static');
        this.ctx_ = this.canvas_.getContext('2d')!;
        this.ctxStatic_ = this.canvasStatic_.getContext('2d')!;

        getEl('sensor-timeline-setting-total-length')!.addEventListener('change', () => {
          this.lengthOfLookAngles_ = parseFloat((<HTMLInputElement>getEl('sensor-timeline-setting-total-length')).value) as Hours;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });

        getEl('sensor-timeline-setting-interval')!.addEventListener('change', () => {
          this.angleCalculationInterval_ = parseFloat((<HTMLInputElement>getEl('sensor-timeline-setting-interval')).value) as Seconds;
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
    });

  }

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.id,
      cb: (sat: BaseObject) => {
        if (!this.isMenuButtonActive) {
          return;
        }

        if (sat) {
          this.ctxStatic_.reset();
          this.updateTimeline();
          this.canvas_.style.display = 'block';
        }
      },
    });
  }

  async updateTimeline(): Promise<void> {
    try {
      if (keepTrackApi.getPlugin(SelectSatManager)!.selectedSat === -1) {
        return;
      }
      if (!this.isMenuButtonActive) {
        return;
      }

      this.calculateSensors_();
      const passes = await this.calculatePasses_();

      const ObservablePasses = passes[0];
      const SatInFoVs = passes[1];
      const SatInSuns = passes[2];
      const StationInNights = passes[3];
      const ClearSkies = passes[4];

      // console.log('observable', ObservablePasses);
      // console.log('fov', SatInFoVs);
      // console.log('sun', SatInSuns);
      // console.log('night', StationInNights);
      // console.log('weather', ClearSkies);

      if (this.detailedPlot === true) {

        this.drawDetailedTimeline_(ObservablePasses, SatInFoVs, SatInSuns, StationInNights, ClearSkies);

      } else if (this.detailedPlot === false) {
        // console.log(passes[0]);
        this.drawTimeline_(ObservablePasses);
      }
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
          keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_ON);
        } else {
          sensorButton.classList.add('btn-red');
          this.enabledSensors_.splice(this.enabledSensors_.indexOf(sensor), 1);
          keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);
        }

        this.ctxStatic_.reset();
        this.updateTimeline();
      });
      sensorListDom.appendChild(sensorButton);
      sensorListDom.appendChild(document.createTextNode(' '));
    }
  }

  //
  // eslint-disable-next-line complexity
  private async calculatePasses_(): Promise<ObservablePasses[][]> {
    const AllObservablePasses: ObservablePasses[] = [];
    const AllSatInFoVs: ObservablePasses[] = [];
    const AllSatinSuns: ObservablePasses[] = [];
    const AllSensorNights: ObservablePasses[] = [];
    const AllClearSkies: ObservablePasses[] = [];


    const satellite = keepTrackApi.getPlugin(SelectSatManager)!.getSelectedSat() as DetailedSatellite;

    const lats: number[] = [];
    const lons: number[] = [];

    this.enabledSensors_.forEach((sensor) => {
      lats.push(sensor.lat);
      lons.push(sensor.lon);
    })

    const start_date = keepTrackApi.getTimeManager().getOffsetTimeObj(0);
    const end_date = new Date(start_date.getTime() + this.lengthOfLookAngles_ * 60 * 60 * 1000);
    const AllWeatherData = await this.getWeather_(lats, lons, start_date, end_date);
    // console.log('weather reports', AllWeatherData);

    for (const [i, sensor] of this.enabledSensors_.entries()) {
      const ObservablePasses: ObservablePasses = {
        sensor,
        passes: [],
      };
      const SatInFoVs: ObservablePasses = {
        sensor,
        passes: [],
      };
      const SatinSuns: ObservablePasses = {
        sensor,
        passes: [],
      };
      const SensorNights: ObservablePasses = {
        sensor,
        passes: [],
      };
      const ClearSkies: ObservablePasses = {
        sensor,
        passes: [],
      };

      // Get weather data for the sensor
      const weatherReport = AllWeatherData[i]

      // Skip if satellite is above the max range of the sensor
      if (sensor.maxRng < satellite.perigee && (!sensor.maxRng2 || sensor.maxRng2 < satellite.perigee)) {
        AllObservablePasses.push(ObservablePasses); // Add empty pass to keep the order of the sensors //!!//
        continue;
      }

      SensorManager.updateSensorUiStyling([sensor]);
      let offset = 0;

      const durationInSeconds = this.lengthOfLookAngles_ * 60 * 60;

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
          start: keepTrackApi.getTimeManager().getOffsetTimeObj(0),
          end: keepTrackApi.getTimeManager().getOffsetTimeObj((durationInSeconds - this.angleCalculationInterval_) * 1000),
        });

        if (this.useWeather) {
          ClearSkies.passes.push({
            start: keepTrackApi.getTimeManager().getOffsetTimeObj(0),
            end: keepTrackApi.getTimeManager().getOffsetTimeObj((durationInSeconds - this.angleCalculationInterval_) * 1000),
          });
        }
      }

      for (let i = 0; i < durationInSeconds; i += this.angleCalculationInterval_) {
        // 5second Looks
        offset = i * 1000; // Offset in miliseconds (sec * 1000)
        const now = keepTrackApi.getTimeManager().getOffsetTimeObj(offset);
        const isInFOVAtThisIter = SensorTimeline.checkSatInFOV(now, satellite.satrec!, sensor);
        const isObservableAtThisIter = SensorTimeline.checkObservable(now, satellite, sensor);
        if (this.useWeather && sensor.type === SpaceObjectType.OPTICAL) {
          var isWeatherGoodatThisIter = SensorTimeline.checkWeatherIsGood(weatherReport, now);
        }
        else { var isWeatherGoodatThisIter = true; }

        // --------

        const isStationInNightAtThisIter = SensorTimeline.checkStationInNight(now, sensor);
        const isSatInSunAtThisIter = SensorTimeline.checkSatinSun(now, satellite);

        // --------


        // Check if sat is Observable and enters the FoV
        if (isInFOVAtThisIter && !isObservable && isObservableAtThisIter && isWeatherGoodatThisIter) {
          startObservableTime = now;
          isObservable = true;
          isBecomeObservable = true;
        }

        // Check if sat exits the FoV or becomes Unobservable
        if ((!isInFOVAtThisIter || !isObservableAtThisIter || !isWeatherGoodatThisIter) && isObservable) {
          isBecomeUnobservable = true;
          isObservable = false;
          /*
           * This optimization no longer works becuase it assumes that there can only be one observable period per orbit
           * which is only valid if the observability only depends on a single factor (such as FoV).
           * if (!this.detailedPlot) {
           *   if (satellite.semiMajorAxis > 30000) {
           *     i += satellite.period * 60 * 0.5;
           *   }
           *   else{
           *     i += satellite.period * 60 * 0.75; // NOSONAR
           *   }
           * }
           */
        }

        // If sat enters and exits an observable period append it to the list
        if ((isBecomeObservable && isBecomeUnobservable) || (isBecomeObservable && i === durationInSeconds - this.angleCalculationInterval_)) {
          ObservablePasses.passes.push({
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

            if (isWeatherGoodatThisIter && !isWeatherGood) {
              startGoodWeatherTime = now;
              isWeatherGood = true;
              isWeatherBecomeGood = true;
            }
            if (!isWeatherGoodatThisIter && isWeatherGood) {
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
      AllObservablePasses.push(ObservablePasses);
      AllSatInFoVs.push(SatInFoVs);
      AllSatinSuns.push(SatinSuns);
      AllSensorNights.push(SensorNights);
      AllClearSkies.push(ClearSkies);
    }

    return [AllObservablePasses, AllSatInFoVs, AllSatinSuns, AllSensorNights, AllClearSkies];
  }

  static checkSatInFOV(now: Date, satrec: SatelliteRecord, sensor: DetailedSensor): boolean {
    // Setup Realtime and Offset Time
    const aer = SatMath.getRae(now, satrec, sensor);

    if (!aer.az || !aer.el || !aer.rng) {
      return false;
    }

    if (SatMath.checkIsInView(sensor, aer as RaeVec3)) {
      return true;
    }

    else {
      return false;
    }

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

    const diffs = weatherReport.hourly.map(date => Math.abs(date.getTime() - now.getTime()));
    const minDiff = Math.min(...diffs);
    const idx = diffs.indexOf(minDiff);

    if (weatherReport.cloudCover[idx] < 50) { return true; }
    else { return false; }

  }

  private drawDetailedTimeline_(ObservablePasses: ObservablePasses[], SatinFoVs: ObservablePasses[], SatinSuns: ObservablePasses[], StationInNights: ObservablePasses[], clearSkies: ObservablePasses[]): void {
    const oldCanvas = this.canvas_;
    const newCanvas = oldCanvas.cloneNode(true) as HTMLCanvasElement;

    oldCanvas.parentNode!.replaceChild(newCanvas, oldCanvas);
    this.canvas_ = newCanvas;
    this.ctx_ = this.canvas_.getContext('2d')!;

    // Clear the events list
    this.drawEvents_ = {};

    const leftOffset = this.canvas_.width * 0.15;
    const topOffset = 0;
    const width = this.canvas_.width * 0.75;
    const height = this.canvas_.height * 0.85;
    const timeManager = keepTrackApi.getTimeManager();
    const startTime = timeManager.simulationTimeObj.getTime();
    const endTime = startTime + this.lengthOfLookAngles_ * 60 * 60 * 1000;

    // clear canvas
    this.ctx_.reset();

    this.ctx_.fillStyle = 'rgb(58, 58, 58)'; // #3a3a3a
    this.ctx_.fillRect(leftOffset, topOffset, width, height - 15);

    const yStep = height / (ObservablePasses.length + 1);
    const xScale = (width) / (endTime - startTime);

    // Draw time axis
    this.ctx_.strokeStyle = 'rgb(255, 255, 255)';
    this.ctx_.lineWidth = 5; // Increase line width to make it thicker
    this.ctx_.beginPath();
    this.ctx_.moveTo(leftOffset, topOffset + height - 20);
    this.ctx_.lineTo(leftOffset + width, topOffset + height - 20);
    this.ctx_.stroke();

    // Draw hour markers
    for (let i = 0; i <= this.lengthOfLookAngles_; i++) {
      const x = leftOffset + ((i * 60 * 60 * 1000) * xScale);

      this.ctx_.lineWidth = 5; // Increase line width to make it thicker
      this.ctx_.beginPath();
      this.ctx_.moveTo(x, topOffset + height - 25);
      this.ctx_.lineTo(x, topOffset + height - 15);
      this.ctx_.strokeStyle = 'rgb(255, 255, 255)';
      this.ctx_.stroke();

      // Extend a thin line to the top of the canvas
      this.ctx_.lineWidth = 1;
      this.ctx_.beginPath();
      this.ctx_.moveTo(x, topOffset + height - 15);
      this.ctx_.lineTo(x, topOffset);
      this.ctx_.stroke();

      let hour = timeManager.simulationTimeObj.getUTCHours();

      hour = (hour + i) % 24;

      this.ctx_.font = '14px Consolas';
      this.ctx_.fillStyle = 'rgb(255, 255, 255)';
      this.ctx_.fillText(`${hour}h`, x - 10, topOffset + height);
    }

    // Draw passes for each sensor
    ObservablePasses.forEach((sensorPass, index) => {
      const y = topOffset + (index + 1) * yStep;

      // Draw sensor name
      this.ctx_.fillStyle = 'rgb(255, 255, 255)';
      this.ctx_.font = '14px Consolas';
      this.ctx_.fillText((sensorPass.sensor.uiName ?? 'Missing uiName').concat(': can collect'), leftOffset - 165, y + 5);

      // Draw passes
      sensorPass.passes.forEach((pass) => {
        const passStart = pass.start.getTime();
        const passEnd = pass.end.getTime();
        const x1 = leftOffset + (passStart - startTime) * xScale;
        const x2 = leftOffset + (passEnd - startTime) * xScale;

        const passLength = (passEnd - passStart) / MILLISECONDS_PER_SECOND;

        if (passLength < this.lengthOfBadPass_) {
          this.ctx_.fillStyle = 'rgb(255, 42, 4)';
        } else if (passLength < this.lengthOfAvgPass_) {
          this.ctx_.fillStyle = 'rgb(252, 232, 58)';
        } else {
          this.ctx_.fillStyle = 'rgb(86, 240, 0)';
        }

        this.ctx_.fillRect(x1, y - 10, x2 - x1, 20);


        const drawEvent = (mouseX: number, mouseY: number): boolean => {
          if (mouseX >= x1 - 10 && mouseX <= x2 + 10 && mouseY >= y - 10 && mouseY <= y + 10) {
            const startTime = new Date(passStart).toISOString().slice(11, 19);
            const endTime = new Date(passEnd).toISOString().slice(11, 19);

            // Calculate width of box based on text
            const text = `${sensorPass.sensor.uiName}: ${startTime} - ${endTime}`;

            this.drawTooltip_(text, mouseX, mouseY);

            return true;
          }

          return false;
        };

        this.drawEvents_[`${index} - ${passStart} - ${passEnd}`] = drawEvent;

        // Create an onclick event for each pass
        this.canvas_.addEventListener('click', (event) => {
          const rect = this.canvas_.getBoundingClientRect();
          const mouseX = event.clientX - rect.left;
          const mouseY = event.clientY - rect.top;

          // If the mouse is over a pass change the sensor
          if (drawEvent(mouseX, mouseY)) {
            const timeManagerInstance = keepTrackApi.getTimeManager();

            keepTrackApi.getSensorManager().setSensor(sensorPass.sensor);

            timeManagerInstance.changeStaticOffset(new Date(passStart).getTime() - timeManagerInstance.realTime);
            timeManagerInstance.calculateSimulationTime();
            keepTrackApi.runEvent(KeepTrackApiEvents.updateDateTime, new Date(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset));

            const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager)!;
            const currentSatId = selectSatManagerInstance.selectedSat;

            selectSatManagerInstance.selectSat(-1);
            selectSatManagerInstance.selectSat(currentSatId);
          }
        });

      });

      // If no passes draw a light gray bar to indicate no passes
      if (sensorPass.passes.length === 0) {
        this.ctx_.fillStyle = 'rgba(200, 200, 200, 0.2)';
        this.ctx_.fillRect(leftOffset, y - 10, width, 20);

        const drawEvent = (mouseX: number, mouseY: number): boolean => {
          if (mouseX >= leftOffset && mouseX <= leftOffset + width && mouseY >= y - 10 && mouseY <= y + 10) {
            const text = `${sensorPass.sensor.uiName}: No Passes`;

            this.drawTooltip_(text, mouseX, mouseY);

            return true;
          }

          return false;
        };

        this.drawEvents_[`${index} - ${sensorPass.sensor.id} - no - passes`] = drawEvent;
      }
    });

    SatinFoVs.forEach((ObservablePeriod, index) => {
      const y = 30 + topOffset + (index + 1) * yStep;

      // Draw sensor name
      this.ctx_.fillStyle = 'rgb(255, 255, 255)';
      this.ctx_.font = '14px Consolas';
      this.ctx_.fillText((ObservablePeriod.sensor.uiName ?? 'Missing uiName').concat(': in FoV'), leftOffset - 165, y + 5);

      // Draw passes
      ObservablePeriod.passes.forEach((pass) => {
        const passStart = pass.start.getTime();
        const passEnd = pass.end.getTime();
        const x1 = leftOffset + (passStart - startTime) * xScale;
        const x2 = leftOffset + (passEnd - startTime) * xScale;

        this.ctx_.fillStyle = 'rgb(88, 209, 152)';


        this.ctx_.fillRect(x1, y - 10, x2 - x1, 20);


        const drawEvent = (mouseX: number, mouseY: number): boolean => {
          if (mouseX >= x1 - 10 && mouseX <= x2 + 10 && mouseY >= y - 10 && mouseY <= y + 10) {
            const startTime = new Date(passStart).toISOString().slice(11, 19);
            const endTime = new Date(passEnd).toISOString().slice(11, 19);

            // Calculate width of box based on text
            const text = `${ObservablePeriod.sensor.uiName}: ${startTime} - ${endTime}`;

            this.drawTooltip_(text, mouseX, mouseY);

            return true;
          }

          return false;
        };

        this.drawEvents_[`${index} - ${passStart} - ${passEnd}`] = drawEvent;

        // Create an onclick event for each pass
        this.canvas_.addEventListener('click', (event) => {
          const rect = this.canvas_.getBoundingClientRect();
          const mouseX = event.clientX - rect.left;
          const mouseY = event.clientY - rect.top;

          // If the mouse is over a pass change the sensor
          if (drawEvent(mouseX, mouseY)) {
            const timeManagerInstance = keepTrackApi.getTimeManager();

            keepTrackApi.getSensorManager().setSensor(ObservablePeriod.sensor);

            timeManagerInstance.changeStaticOffset(new Date(passStart).getTime() - timeManagerInstance.realTime);
            timeManagerInstance.calculateSimulationTime();
            keepTrackApi.runEvent(KeepTrackApiEvents.updateDateTime, new Date(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset));

            const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager)!;
            const currentSatId = selectSatManagerInstance.selectedSat;

            selectSatManagerInstance.selectSat(-1);
            selectSatManagerInstance.selectSat(currentSatId);
          }
        });

      });

      // If no passes draw a light gray bar to indicate no passes
      if (ObservablePeriod.passes.length === 0) {
        this.ctx_.fillStyle = 'rgba(200, 200, 200, 0.2)';
        this.ctx_.fillRect(leftOffset, y - 10, width, 20);

        const drawEvent = (mouseX: number, mouseY: number): boolean => {
          if (mouseX >= leftOffset && mouseX <= leftOffset + width && mouseY >= y - 10 && mouseY <= y + 10) {
            const text = `${ObservablePeriod.sensor.uiName}: No Passes`;

            this.drawTooltip_(text, mouseX, mouseY);

            return true;
          }

          return false;
        };

        this.drawEvents_[`${index} - ${ObservablePeriod.sensor.id} - no - passes`] = drawEvent;
      }
    });

    StationInNights.forEach((ObservablePeriod, index) => {
      const y = 60 + topOffset + (index + 1) * yStep;

      // Draw sensor name
      this.ctx_.fillStyle = 'rgb(255, 255, 255)';
      this.ctx_.font = '14px Consolas';
      this.ctx_.fillText((ObservablePeriod.sensor.uiName ?? 'Missing uiName').concat(': available'), leftOffset - 165, y + 5);

      // Draw passes
      ObservablePeriod.passes.forEach((pass) => {
        const passStart = pass.start.getTime();
        const passEnd = pass.end.getTime();
        const x1 = leftOffset + (passStart - startTime) * xScale;
        const x2 = leftOffset + (passEnd - startTime) * xScale;

        this.ctx_.fillStyle = 'rgb(11, 80, 63)';


        this.ctx_.fillRect(x1, y - 10, x2 - x1, 20);


        const drawEvent = (mouseX: number, mouseY: number): boolean => {
          if (mouseX >= x1 - 10 && mouseX <= x2 + 10 && mouseY >= y - 10 && mouseY <= y + 10) {
            const startTime = new Date(passStart).toISOString().slice(11, 19);
            const endTime = new Date(passEnd).toISOString().slice(11, 19);

            // Calculate width of box based on text
            const text = `${ObservablePeriod.sensor.uiName}: ${startTime} - ${endTime}`;

            this.drawTooltip_(text, mouseX, mouseY);

            return true;
          }

          return false;
        };

        this.drawEvents_[`${index} - ${passStart} - ${passEnd}`] = drawEvent;

        // Create an onclick event for each pass
        this.canvas_.addEventListener('click', (event) => {
          const rect = this.canvas_.getBoundingClientRect();
          const mouseX = event.clientX - rect.left;
          const mouseY = event.clientY - rect.top;

          // If the mouse is over a pass change the sensor
          if (drawEvent(mouseX, mouseY)) {
            const timeManagerInstance = keepTrackApi.getTimeManager();

            keepTrackApi.getSensorManager().setSensor(ObservablePeriod.sensor);

            timeManagerInstance.changeStaticOffset(new Date(passStart).getTime() - timeManagerInstance.realTime);
            timeManagerInstance.calculateSimulationTime();
            keepTrackApi.runEvent(KeepTrackApiEvents.updateDateTime, new Date(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset));

            const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager)!;
            const currentSatId = selectSatManagerInstance.selectedSat;

            selectSatManagerInstance.selectSat(-1);
            selectSatManagerInstance.selectSat(currentSatId);
          }
        });

      });

      // If no passes draw a light gray bar to indicate no passes
      if (ObservablePeriod.passes.length === 0) {
        this.ctx_.fillStyle = 'rgba(200, 200, 200, 0.2)';
        this.ctx_.fillRect(leftOffset, y - 10, width, 20);

        const drawEvent = (mouseX: number, mouseY: number): boolean => {
          if (mouseX >= leftOffset && mouseX <= leftOffset + width && mouseY >= y - 10 && mouseY <= y + 10) {
            const text = `${ObservablePeriod.sensor.uiName}: No Passes`;

            this.drawTooltip_(text, mouseX, mouseY);

            return true;
          }

          return false;
        };

        this.drawEvents_[`${index} - ${ObservablePeriod.sensor.id} - no - passes`] = drawEvent;
      }
    });

    if (this.useWeather) {
      clearSkies.forEach((ObservablePeriod, index) => {
        const y = 90 + topOffset + (index + 1) * yStep;

        // Draw sensor name
        this.ctx_.fillStyle = 'rgb(255, 255, 255)';
        this.ctx_.font = '14px Consolas';
        this.ctx_.fillText((ObservablePeriod.sensor.uiName ?? 'Missing uiName').concat(': Clear Weather'), leftOffset - 165, y + 5);

        // Draw passes
        ObservablePeriod.passes.forEach((pass) => {
          const passStart = pass.start.getTime();
          const passEnd = pass.end.getTime();
          const x1 = leftOffset + (passStart - startTime) * xScale;
          const x2 = leftOffset + (passEnd - startTime) * xScale;

          this.ctx_.fillStyle = 'rgb(24, 49, 163)';


          this.ctx_.fillRect(x1, y - 10, x2 - x1, 20);


          const drawEvent = (mouseX: number, mouseY: number): boolean => {
            if (mouseX >= x1 - 10 && mouseX <= x2 + 10 && mouseY >= y - 10 && mouseY <= y + 10) {
              const startTime = new Date(passStart).toISOString().slice(11, 19);
              const endTime = new Date(passEnd).toISOString().slice(11, 19);

              // Calculate width of box based on text
              const text = `${ObservablePeriod.sensor.uiName}: ${startTime} - ${endTime}`;

              this.drawTooltip_(text, mouseX, mouseY);

              return true;
            }

            return false;
          };

          this.drawEvents_[`${index} - ${passStart} - ${passEnd}`] = drawEvent;

          // Create an onclick event for each pass
          this.canvas_.addEventListener('click', (event) => {
            const rect = this.canvas_.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            // If the mouse is over a pass change the sensor
            if (drawEvent(mouseX, mouseY)) {
              const timeManagerInstance = keepTrackApi.getTimeManager();

              keepTrackApi.getSensorManager().setSensor(ObservablePeriod.sensor);

              timeManagerInstance.changeStaticOffset(new Date(passStart).getTime() - timeManagerInstance.realTime);
              timeManagerInstance.calculateSimulationTime();
              keepTrackApi.runEvent(KeepTrackApiEvents.updateDateTime, new Date(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset));

              const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager)!;
              const currentSatId = selectSatManagerInstance.selectedSat;

              selectSatManagerInstance.selectSat(-1);
              selectSatManagerInstance.selectSat(currentSatId);
            }
          });

        });

        // If no passes draw a light gray bar to indicate no passes
        if (ObservablePeriod.passes.length === 0) {
          this.ctx_.fillStyle = 'rgba(200, 200, 200, 0.2)';
          this.ctx_.fillRect(leftOffset, y - 10, width, 20);

          const drawEvent = (mouseX: number, mouseY: number): boolean => {
            if (mouseX >= leftOffset && mouseX <= leftOffset + width && mouseY >= y - 10 && mouseY <= y + 10) {
              const text = `${ObservablePeriod.sensor.uiName}: No Passes`;

              this.drawTooltip_(text, mouseX, mouseY);

              return true;
            }

            return false;
          };

          this.drawEvents_[`${index} - ${ObservablePeriod.sensor.id} - no - passes`] = drawEvent;
        }
      });
    }

    // SatinSuns.forEach((ObservablePeriod, index) => {
    const ObservablePeriod = SatinSuns[0];
    const y = 120 + topOffset + SatinSuns.length * yStep;

    // Draw sensor name
    this.ctx_.fillStyle = 'rgb(255, 255, 255)';
    this.ctx_.font = '14px Consolas';
    this.ctx_.fillText('Sat in Sun', leftOffset - 165, y + 5);

    // Draw passes
    ObservablePeriod.passes.forEach((pass) => {
      const passStart = pass.start.getTime();
      const passEnd = pass.end.getTime();
      const x1 = leftOffset + (passStart - startTime) * xScale;
      const x2 = leftOffset + (passEnd - startTime) * xScale;

      this.ctx_.fillStyle = 'rgb(255, 238, 0)';
      this.ctx_.fillRect(x1, y - 10, x2 - x1, 20);


      const drawEvent = (mouseX: number, mouseY: number): boolean => {
        if (mouseX >= x1 - 10 && mouseX <= x2 + 10 && mouseY >= y - 10 && mouseY <= y + 10) {
          const startTime = new Date(passStart).toISOString().slice(11, 19);
          const endTime = new Date(passEnd).toISOString().slice(11, 19);

          // Calculate width of box based on text
          const text = `${ObservablePeriod.sensor.uiName}: ${startTime} - ${endTime}`;

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

          return true;
        }

        return false;
      };

      this.drawEvents_[`${SatinSuns.length} - ${passStart} - ${passEnd}`] = drawEvent;

      // Create an onclick event for each pass
      this.canvas_.addEventListener('click', (event) => {
        const rect = this.canvas_.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // If the mouse is over a pass change the sensor
        if (drawEvent(mouseX, mouseY)) {
          const timeManagerInstance = keepTrackApi.getTimeManager();

          keepTrackApi.getSensorManager().setSensor(ObservablePeriod.sensor);

          timeManagerInstance.changeStaticOffset(new Date(passStart).getTime() - timeManagerInstance.realTime);
          timeManagerInstance.calculateSimulationTime();
          keepTrackApi.runEvent(KeepTrackApiEvents.updateDateTime, new Date(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset));

          const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager)!;
          const currentSatId = selectSatManagerInstance.selectedSat;

          selectSatManagerInstance.selectSat(-1);
          selectSatManagerInstance.selectSat(currentSatId);
        }
      });

    });

    // If no passes draw a light gray bar to indicate no passes
    if (ObservablePeriod.passes.length === 0) {
      this.ctx_.fillStyle = 'rgba(200, 200, 200, 0.2)';
      this.ctx_.fillRect(leftOffset, y - 10, width, 20);

      const drawEvent = (mouseX: number, mouseY: number): boolean => {
        if (mouseX >= leftOffset && mouseX <= leftOffset + width && mouseY >= y - 10 && mouseY <= y + 10) {
          const text = `${ObservablePeriod.sensor.uiName}: No Passes`;

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

          return true;
        }

        return false;
      };

      this.drawEvents_[`${SatinSuns.length} - ${ObservablePeriod.sensor.id} - no - passes`] = drawEvent;
    }
    // });


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

  private drawTimeline_(ObservablePasses: ObservablePasses[]): void {
    const oldCanvas = this.canvas_;
    const newCanvas = oldCanvas.cloneNode(true) as HTMLCanvasElement;

    oldCanvas.parentNode?.replaceChild(newCanvas, oldCanvas);
    this.canvas_ = newCanvas;
    this.ctx_ = this.canvas_.getContext('2d')!;

    // Clear the events list
    this.drawEvents_ = {};

    const leftOffset = this.canvas_.width * 0.15;
    const topOffset = 0;
    const width = this.canvas_.width * 0.75;
    const height = this.canvas_.height * 0.75;
    const timeManager = keepTrackApi.getTimeManager();
    const startTime = timeManager.simulationTimeObj.getTime();
    const endTime = startTime + this.lengthOfLookAngles_ * 60 * 60 * 1000;

    // clear canvas
    this.ctx_.reset();

    this.ctx_.fillStyle = 'rgb(58, 58, 58)'; // #3a3a3a
    this.ctx_.fillRect(leftOffset, topOffset, width, height - 15);

    const yStep = height / (ObservablePasses.length + 1);
    const xScale = (width) / (endTime - startTime);

    // Draw time axis
    this.ctx_.strokeStyle = 'rgb(255, 255, 255)';
    this.ctx_.lineWidth = 5; // Increase line width to make it thicker
    this.ctx_.beginPath();
    this.ctx_.moveTo(leftOffset, topOffset + height - 20);
    this.ctx_.lineTo(leftOffset + width, topOffset + height - 20);
    this.ctx_.stroke();

    // Draw hour markers
    for (let i = 0; i <= this.lengthOfLookAngles_; i++) {
      const x = leftOffset + ((i * 60 * 60 * 1000) * xScale);

      this.ctx_.lineWidth = 5; // Increase line width to make it thicker
      this.ctx_.beginPath();
      this.ctx_.moveTo(x, topOffset + height - 25);
      this.ctx_.lineTo(x, topOffset + height - 15);
      this.ctx_.strokeStyle = 'rgb(255, 255, 255)';
      this.ctx_.stroke();

      // Extend a thin line to the top of the canvas
      this.ctx_.lineWidth = 1;
      this.ctx_.beginPath();
      this.ctx_.moveTo(x, topOffset + height - 15);
      this.ctx_.lineTo(x, topOffset);
      this.ctx_.stroke();

      let hour = timeManager.simulationTimeObj.getUTCHours();

      hour = (hour + i) % 24;

      this.ctx_.font = '14px Consolas';
      this.ctx_.fillStyle = 'rgb(255, 255, 255)';
      this.ctx_.fillText(`${hour}h`, x - 10, topOffset + height);
    }

    // Draw passes for each sensor
    ObservablePasses.forEach((sensorPass, index) => {
      const y = topOffset + (index + 1) * yStep;

      // Draw sensor name
      this.ctx_.fillStyle = 'rgb(255, 255, 255)';
      this.ctx_.font = '14px Consolas';
      this.ctx_.fillText((sensorPass.sensor.uiName ?? 'Missing uiName'), leftOffset - 165, y + 5);

      // Draw passes
      sensorPass.passes.forEach((pass) => {
        const passStart = pass.start.getTime();
        const passEnd = pass.end.getTime();
        const x1 = leftOffset + (passStart - startTime) * xScale;
        const x2 = leftOffset + (passEnd - startTime) * xScale;

        const passLength = (passEnd - passStart) / MILLISECONDS_PER_SECOND;

        if (passLength < this.lengthOfBadPass_) {
          this.ctx_.fillStyle = 'rgb(255, 42, 4)';
        } else if (passLength < this.lengthOfAvgPass_) {
          this.ctx_.fillStyle = 'rgb(252, 232, 58)';
        } else {
          this.ctx_.fillStyle = 'rgb(86, 240, 0)';
        }

        this.ctx_.fillRect(x1, y - 10, x2 - x1, 20);


        const drawEvent = (mouseX: number, mouseY: number): boolean => {
          if (mouseX >= x1 - 10 && mouseX <= x2 + 10 && mouseY >= y - 10 && mouseY <= y + 10) {
            const startTime = new Date(passStart).toISOString().slice(11, 19);
            const endTime = new Date(passEnd).toISOString().slice(11, 19);

            // Calculate width of box based on text
            const text = `${sensorPass.sensor.uiName}: ${startTime} - ${endTime}`;

            this.drawTooltip_(text, mouseX, mouseY);

            return true;
          }

          return false;
        };

        this.drawEvents_[`${index} - ${passStart} - ${passEnd}`] = drawEvent;

        // Create an onclick event for each pass
        this.canvas_.addEventListener('click', (event) => {
          const rect = this.canvas_.getBoundingClientRect();
          const mouseX = event.clientX - rect.left;
          const mouseY = event.clientY - rect.top;

          // If the mouse is over a pass change the sensor
          if (drawEvent(mouseX, mouseY)) {
            const timeManagerInstance = keepTrackApi.getTimeManager();

            keepTrackApi.getSensorManager().setSensor(sensorPass.sensor);

            timeManagerInstance.changeStaticOffset(new Date(passStart).getTime() - timeManagerInstance.realTime);
            timeManagerInstance.calculateSimulationTime();
            keepTrackApi.runEvent(KeepTrackApiEvents.updateDateTime, new Date(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset));

            const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager)!;
            const currentSatId = selectSatManagerInstance.selectedSat;

            selectSatManagerInstance.selectSat(-1);
            selectSatManagerInstance.selectSat(currentSatId);
          }
        });

      });

      // If no passes draw a light gray bar to indicate no passes
      if (sensorPass.passes.length === 0) {
        this.ctx_.fillStyle = 'rgba(200, 200, 200, 0.2)';
        this.ctx_.fillRect(leftOffset, y - 10, width, 20);

        const drawEvent = (mouseX: number, mouseY: number): boolean => {
          if (mouseX >= leftOffset && mouseX <= leftOffset + width && mouseY >= y - 10 && mouseY <= y + 10) {
            const text = `${sensorPass.sensor.uiName}: No Passes`;

            this.drawTooltip_(text, mouseX, mouseY);

            return true;
          }

          return false;
        };

        this.drawEvents_[`${index} - ${sensorPass.sensor.id} - no - passes`] = drawEvent;
      }
    });
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

  private async getWeather_(lats: number[], lons: number[], start_date: Date, end_date: Date): Promise<weatherReport[]> {

    const params = {
      "latitude": lats,
      "longitude": lons,
      "start_date": start_date.toISOString().slice(0, 10),
      "end_date": end_date.toISOString().slice(0, 10),
      "hourly": "cloud_cover",
    };

    // console.log(params);

    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);

    // Helper function to form time ranges
    const range = (start: number, stop: number, step: number) =>
      Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

    const AllWeatherData: weatherReport[] = [];

    // Process locations.
    responses.forEach((response) => {

      // Attributes for timezone and location
      const utcOffsetSeconds = response.utcOffsetSeconds();

      const hourly = response.hourly()!;

      // Note: The order of weather variables in the URL query and the indices below need to match!
      const weatherData: weatherReport = {
        latitude: response.latitude(),
        longitude: response.longitude(),
        hourly: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
          (t) => new Date((t + utcOffsetSeconds) * 1000)
        ),
        cloudCover: hourly.variables(0)!.valuesArray()!,
      };

      AllWeatherData.push(weatherData);
    })

    return AllWeatherData;
  }
}
