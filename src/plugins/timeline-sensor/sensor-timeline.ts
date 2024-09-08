import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';
import viewTimelinePng from '@public/img/icons/view_timeline.png';

import { SatMath } from '@app/static/sat-math';
import { BaseObject, Degrees, DetailedSatellite, DetailedSensor, Hours, Kilometers, MILLISECONDS_PER_SECOND, SatelliteRecord, Seconds } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SensorManager } from '../sensor/sensorManager';
import { SoundNames } from '../sounds/SoundNames';

interface Pass {
  start: Date;
  end: Date;
}

interface SensorPasses {
  sensor: DetailedSensor;
  passes: Pass[];
}

export class SensorTimeline extends KeepTrackPlugin {
  readonly id = 'SensorTimeline';
  dependencies_ = [SelectSatManager.name];
  private canvas_: HTMLCanvasElement;
  private ctx_: CanvasRenderingContext2D;
  private canvasStatic_: HTMLCanvasElement;
  private ctxStatic_: CanvasRenderingContext2D;
  private drawEvents_: { [key: string]: (mouseX: number, mouseY: number) => boolean } = {};
  private allSensorLists_ = [];
  private enabledSensors_: DetailedSensor[] = [];
  private lengthOfLookAngles_ = 6 as Hours;
  private lengthOfBadPass_ = 120 as Seconds;
  private lengthOfAvgPass_ = 240 as Seconds;
  private angleCalculationInterval_ = <Seconds>30;

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
    const canvas = document.getElementById('sensor-timeline-canvas') as HTMLCanvasElement;
    const image = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const link = document.createElement('a');

    link.href = image;
    link.download = `sat-${(keepTrackApi.getPlugin(SelectSatManager).getSelectedSat() as DetailedSatellite).sccNum6}-timeline.png`;
    link.click();
  };

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        this.canvas_ = <HTMLCanvasElement>getEl('sensor-timeline-canvas');
        this.canvasStatic_ = <HTMLCanvasElement>getEl('sensor-timeline-canvas-static');
        this.ctx_ = this.canvas_.getContext('2d');
        this.ctxStatic_ = this.canvasStatic_.getContext('2d');

        getEl('sensor-timeline-setting-total-length').addEventListener('change', () => {
          this.lengthOfLookAngles_ = parseFloat((<HTMLInputElement>getEl('sensor-timeline-setting-total-length')).value) as Hours;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });

        getEl('sensor-timeline-setting-interval').addEventListener('change', () => {
          this.angleCalculationInterval_ = parseFloat((<HTMLInputElement>getEl('sensor-timeline-setting-interval')).value) as Seconds;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });

        getEl('sensor-timeline-setting-bad-length').addEventListener('change', () => {
          this.lengthOfBadPass_ = parseFloat((<HTMLInputElement>getEl('sensor-timeline-setting-bad-length')).value) as Seconds;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });

        getEl('sensor-timeline-setting-avg-length').addEventListener('change', () => {
          this.lengthOfAvgPass_ = parseFloat((<HTMLInputElement>getEl('sensor-timeline-setting-avg-length')).value) as Seconds;
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

  updateTimeline(): void {
    try {
      if (keepTrackApi.getPlugin(SelectSatManager).selectedSat === -1) {
        return;
      }
      if (!this.isMenuButtonActive) {
        return;
      }

      this.calculateSensors_();
      const sensorPasses = this.calculatePasses_();

      this.drawTimeline_(sensorPasses);
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

  private calculatePasses_(): SensorPasses[] {
    const sensorPasses: SensorPasses[] = [];
    const satellite = keepTrackApi.getPlugin(SelectSatManager).getSelectedSat() as DetailedSatellite;

    for (const sensor of this.enabledSensors_) {
      const sensorPass: SensorPasses = {
        sensor,
        passes: [],
      };

      // Skip if satellite is above the max range of the sensor
      if (sensor.maxRng < satellite.perigee && (!sensor.maxRng2 || sensor.maxRng2 < satellite.perigee)) {
        sensorPasses.push(sensorPass); // Add empty pass to keep the order of the sensors
        continue;
      }

      SensorManager.updateSensorUiStyling([sensor]);
      let offset = 0;

      const durationInSeconds = this.lengthOfLookAngles_ * 60 * 60;
      let isInView = false;
      let isEnterView = false;
      let isExitView = false;
      let startTime = null;


      for (let i = 0; i < durationInSeconds; i += this.angleCalculationInterval_) {
        // 5second Looks
        offset = i * 1000; // Offset in seconds (msec * 1000)
        const now = keepTrackApi.getTimeManager().getOffsetTimeObj(offset);
        const multiSitePass = SensorTimeline.propagateMultiSite(now, satellite.satrec, sensor);

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

        if ((isEnterView && isExitView) || (isEnterView && i === durationInSeconds - this.angleCalculationInterval_)) {
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

  private drawTimeline_(sensorPasses: SensorPasses[]): void {
    // Clone the canvas element to remove all event listeners
    const oldCanvas = this.canvas_;
    const newCanvas = oldCanvas.cloneNode(true) as HTMLCanvasElement;

    oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
    this.canvas_ = newCanvas;
    this.ctx_ = this.canvas_.getContext('2d');

    // Clear the events list
    this.drawEvents_ = {};

    const leftOffset = this.canvas_.width * 0.1;
    const topOffset = 0;
    const width = this.canvas_.width * 0.8;
    const height = this.canvas_.height * 0.75;
    const timeManager = keepTrackApi.getTimeManager();
    const startTime = timeManager.simulationTimeObj.getTime();
    const endTime = startTime + this.lengthOfLookAngles_ * 60 * 60 * 1000; // 24 hours from now

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
    sensorPasses.forEach((sensorPass, index) => {
      const y = topOffset + (index + 1) * yStep;

      // Draw sensor name
      this.ctx_.fillStyle = 'rgb(255, 255, 255)';
      this.ctx_.font = '14px Consolas';
      this.ctx_.fillText(sensorPass.sensor.uiName, leftOffset - 150, y + 5);

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

            const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager);
            const currentSatId = selectSatManagerInstance.selectedSat;

            selectSatManagerInstance.selectSat(null);
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

        this.drawEvents_[`${index}-${sensorPass.sensor.id}-no-passes`] = drawEvent;
      }
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
    const timelineMenuDOM = getEl('sensor-timeline-menu');

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
