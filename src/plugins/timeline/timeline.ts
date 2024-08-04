import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';
import mapPng from '@public/img/icons/map.png';

import { sensors } from '@app/catalogs/sensors';
import { SatMath } from '@app/static/sat-math';
import { BaseObject, Degrees, DetailedSatellite, DetailedSensor, Kilometers, MILLISECONDS_PER_SECOND, SatelliteRecord } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { MultiSiteLookAnglesPlugin } from '../sensor/multi-site-look-angles-plugin';
import { SensorManager } from '../sensor/sensorManager';

interface Pass {
  start: Date;
  end: Date;
}

interface SensorPasses {
  sensor: DetailedSensor;
  passes: Pass[];
}

export class Timeline extends KeepTrackPlugin {
  static readonly PLUGIN_NAME = 'Timeline';
  dependencies = [SelectSatManager.PLUGIN_NAME];
  private selectSatManager_: SelectSatManager;
  private canvas_: HTMLCanvasElement;
  private ctx_: CanvasRenderingContext2D;
  private canvasStatic_: HTMLCanvasElement;
  private ctxStatic_: CanvasRenderingContext2D;
  multiSitePlugin_: MultiSiteLookAnglesPlugin;
  drawEvents_: { [key: string]: (mouseX: number, mouseY: number) => boolean } = {};

  constructor() {
    super(Timeline.PLUGIN_NAME);
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
    this.multiSitePlugin_ = keepTrackApi.getPlugin(MultiSiteLookAnglesPlugin);
  }

  isRequireSatelliteSelected = true;
  isIconDisabled = true;
  isIconDisabledOnLoad = true;

  bottomIconElementName = 'menu-timeline';
  bottomIconImg = mapPng;
  bottomIconLabel = 'Timeline';
  bottomIconCallback: () => void = () => {
    if (!this.isMenuButtonActive) {
      return;
    }
    this.resizeCanvas_();
    this.updateTimeline();
  };

  helpTitle = 'Timeline Menu';
  helpBody = keepTrackApi.html`The timeline menu displays a chart of satellite passes across multiple sensors.`;

  sideMenuElementName = 'timeline-menu';
  sideMenuElementHtml = keepTrackApi.html`
    <div id="timeline-menu" class="side-menu-parent start-hidden side-menu valign-wrapper">
      <canvas id="timeline-canvas"></canvas>
      <canvas id="timeline-canvas-static" style="display: none;"></canvas>
    </div>`;

  addHtml(): void {
    super.addHtml();
    import('./timeline.css');

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        this.canvas_ = <HTMLCanvasElement>getEl('timeline-canvas');
        this.canvasStatic_ = <HTMLCanvasElement>getEl('timeline-canvas-static');
        this.ctx_ = this.canvas_.getContext('2d');
        this.ctxStatic_ = this.canvasStatic_.getContext('2d');
      },
    });
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (sat: BaseObject) => {
        if (sat) {
          this.updateTimeline();
          this.canvas_.style.display = 'block';
        }
      },
    });
  }

  updateTimeline(): void {
    try {
      if (this.selectSatManager_.selectedSat === -1) {
        return;
      }
      if (!this.isMenuButtonActive) {
        return;
      }

      const satellite = this.selectSatManager_.getSelectedSat() as DetailedSatellite;
      const sensors_ = [sensors.BLEAFB, sensors.CODSFS, sensors.MITMIL, sensors.CAVSFS, sensors.CLRSFS, sensors.COBRADANE, sensors.RAFFYL, sensors.PITSB];
      const sensorPasses = this.calculatePasses(satellite, sensors_);

      this.drawTimeline(sensorPasses);
    } catch (e) {
      errorManagerInstance.info(e);
    }
  }

  private calculatePasses(satellite: DetailedSatellite, sensors: DetailedSensor[]): SensorPasses[] {
    const sensorPasses: SensorPasses[] = [];

    for (const sensor of sensors) {
      const sensorPass: SensorPasses = {
        sensor,
        passes: [],
      };

      // Skip if satellite is above the max range of the sensor
      if (sensor.maxRng < satellite.perigee && (!sensor.maxRng2 || sensor.maxRng2 < satellite.perigee)) {
        continue;
      }

      SensorManager.updateSensorUiStyling([sensor]);
      let offset = 0;

      const secondsIn24Hours = 24 * 60 * 60;
      let isInView = false;
      let isEnterView = false;
      let isExitView = false;
      let startTime = null;


      for (let i = 0; i < secondsIn24Hours; i += 30) {
        // 5second Looks
        offset = i * 1000; // Offset in seconds (msec * 1000)
        const now = keepTrackApi.getTimeManager().getOffsetTimeObj(offset);
        const multiSitePass = Timeline.propagateMultiSite(now, satellite.satrec, sensor);

        // Check if in FOV
        if (multiSitePass.time && !isInView) {
          startTime = new Date(multiSitePass.time);
          isInView = true;
          isEnterView = true;
        }

        if (!multiSitePass.time && isInView) {
          isExitView = true;
          isInView = false;
          // Jump 3/4th to the next orbit
          i += satellite.period * 60 * 0.75;
        }

        if ((isEnterView && isExitView) || (isEnterView && i === secondsIn24Hours - 30)) {
          sensorPass.passes.push({
            start: startTime,
            end: now,
          });
          isEnterView = false;
          isExitView = false;
        }
      }

      sensorPasses.push(sensorPass);
    }

    return sensorPasses;
  }

  static propagateMultiSite(now: Date, satrec: SatelliteRecord, sensor: DetailedSensor) {
    // Setup Realtime and Offset Time
    const aer = SatMath.getRae(now, satrec, sensor);

    if (SatMath.checkIsInView(sensor, aer)) {
      return {
        time: now,
        el: aer.el,
        az: aer.az,
        rng: aer.rng,
        objName: null,
      };
    }

    return {
      time: null,
      el: <Degrees>0,
      az: <Degrees>0,
      rng: <Kilometers>0,
      objName: null,
    };

  }

  private drawTimeline(sensorPasses: SensorPasses[]): void {
    // Clone the canvas element to remove all event listeners
    const oldCanvas = this.canvas_;
    const newCanvas = oldCanvas.cloneNode(true) as HTMLCanvasElement;

    oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
    this.canvas_ = newCanvas;
    this.ctx_ = this.canvas_.getContext('2d');

    // Clear the events list
    this.drawEvents_ = {};

    const leftOffset = this.canvas_.width * 0.1;
    const topOffset = this.canvas_.height * 0.05;
    const width = this.canvas_.width * 0.8;
    const height = this.canvas_.height * 0.8;
    const timeManager = keepTrackApi.getTimeManager();
    const startTime = timeManager.simulationTimeObj.getTime();
    const endTime = startTime + 24 * 60 * 60 * 1000; // 24 hours from now

    // clear canvas
    this.ctx_.reset();

    this.ctx_.fillStyle = 'rgb(31, 51, 71)';
    this.ctx_.fillRect(leftOffset, topOffset, width, height - 15);

    const yStep = height / (sensorPasses.length + 1);
    const xScale = (width) / (endTime - startTime);

    // Draw time axis
    this.ctx_.strokeStyle = 'rgb(255, 255, 255)';
    this.ctx_.lineWidth = 5; // Increase line width to make it thicker
    this.ctx_.beginPath();
    this.ctx_.moveTo(leftOffset, topOffset + height - 20);
    this.ctx_.lineTo(leftOffset + width, topOffset + height - 20);
    this.ctx_.stroke();

    // Draw hour markers
    for (let i = 0; i < 25; i++) {
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

      if (hour + i > 23) {
        hour = hour + i - 24;
      } else {
        hour += i;
      }

      this.ctx_.font = '12px Consolas';
      this.ctx_.fillStyle = 'rgb(255, 255, 255)';
      this.ctx_.fillText(`${hour}h`, x - 10, topOffset + height - 5);
    }

    // Draw passes for each sensor
    sensorPasses.forEach((sensorPass, index) => {
      const y = topOffset + (index + 1) * yStep;

      // Draw sensor name
      this.ctx_.fillStyle = 'rgb(255, 255, 255)';
      this.ctx_.font = '12px Consolas';
      this.ctx_.fillText(sensorPass.sensor.shortName, leftOffset - 30, y + 5);

      // Draw passes
      sensorPass.passes.forEach((pass) => {
        const passStart = pass.start.getTime();
        const passEnd = pass.end.getTime();
        const x1 = leftOffset + (passStart - startTime) * xScale;
        const x2 = leftOffset + (passEnd - startTime) * xScale;

        const passLength = (passEnd - passStart) / MILLISECONDS_PER_SECOND;

        if (passLength < 120) {
          this.ctx_.fillStyle = 'rgb(255, 42, 4)';
        } else if (passLength < 240) {
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
            const text = `${sensorPass.sensor.shortName}: ${startTime} - ${endTime}`;

            this.ctx_.font = '12px Consolas';

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

        this.drawEvents_[`${index}-${passStart}-${passEnd}`] = drawEvent;

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

            const currentSatId = this.selectSatManager_.selectedSat;

            this.selectSatManager_.selectSat(null);
            this.selectSatManager_.selectSat(currentSatId);
          }
        });
      });
    });

    // Add one mousemove event
    this.canvas_.addEventListener('mousemove', (event) => {
      this.handleOnMouseMove_(event);
    });

    // Save initial state as staticCtx_ so we can redraw the static elements without clearing the canvas
    this.ctxStatic_ = this.canvasStatic_.getContext('2d');
    this.ctxStatic_.drawImage(this.canvas_, 0, 0);
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

    // eslint-disable-next-line guard-for-in
    for (const key in this.drawEvents_) {
      const success = this.drawEvents_[key](mouseX, mouseY);

      isHoveringOverPass = isHoveringOverPass || success;
    }

    if (!isHoveringOverPass) {
      this.canvas_.style.cursor = 'default';
    }
  }

  private resizeCanvas_(isForceWidescreen?: boolean): void {
    isForceWidescreen ??= false;
    const timelineMenuDOM = getEl('timeline-menu');

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
}
