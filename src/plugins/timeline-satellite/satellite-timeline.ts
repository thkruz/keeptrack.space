import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import viewTimelinePng from '@public/img/icons/view_timeline2.png';

import { SatMath } from '@app/app/analysis/sat-math';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { shake } from '@app/engine/utils/shake';
import { BaseObject, Degrees, DetailedSatellite, DetailedSensor, Hours, Kilometers, MILLISECONDS_PER_SECOND, SatelliteRecord, Seconds } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { WatchlistPlugin } from '../watchlist/watchlist';

interface Pass {
  start: Date;
  end: Date;
}

interface SatellitePasses {
  satellite: DetailedSatellite;
  passes: Pass[];
}

export class SatelliteTimeline extends KeepTrackPlugin {
  readonly id = 'SatelliteTimeline';
  dependencies_ = [SelectSatManager.name];
  private canvas_: HTMLCanvasElement;
  private ctx_: CanvasRenderingContext2D;
  private canvasStatic_: HTMLCanvasElement;
  private ctxStatic_: CanvasRenderingContext2D;
  private drawEvents_: { [key: string]: (mouseX: number, mouseY: number) => boolean } = {};
  private lengthOfLookAngles_ = 6 as Hours;
  private lengthOfBadPass_ = 120 as Seconds;
  private lengthOfAvgPass_ = 240 as Seconds;
  private angleCalculationInterval_ = <Seconds>30;

  isRequireSensorSelected = true;
  isIconDisabled = true;
  isIconDisabledOnLoad = true;

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = viewTimelinePng;
  bottomIconCallback: () => void = () => {
    if (!this.verifySensorSelected()) {
      return;
    }

    if (PluginRegistry.getPlugin(WatchlistPlugin).watchlistList.length === 0 && PluginRegistry.getPlugin(SelectSatManager).selectedSat === -1) {
      ServiceLocator.getUiManager().toast('Add Satellites to Watchlist or Select a Satellite', ToastMsgType.caution);
      shake(getEl(this.bottomIconElementName));

      return;
    }

    if (!this.isMenuButtonActive) {
      return;
    }
    this.resizeCanvas_();
  };

  sideMenuElementName = 'satellite-timeline-menu';
  sideMenuElementHtml = html`
    <div class="row"></div>
    <div class="row" style="margin: 0;">
      <canvas id="satellite-timeline-canvas"></canvas>
      <canvas id="satellite-timeline-canvas-static" style="display: none;"></canvas>
    </div>`;
  sideMenuSecondaryHtml: string = html`
    <div class="row">
      <div class="input-field col s12">
        <input id="satellite-timeline-setting-total-length" value="${this.lengthOfLookAngles_.toString()}" type="text"
          style="text-align: center;"
        />
        <label for="satellite-timeline-setting-total-length" class="active">Calculation Length (Hours)</label>
      </div>
    </div>
    <div class="row">
      <div class="input-field col s12">
        <input id="satellite-timeline-setting-interval" value="${this.angleCalculationInterval_.toString()}" type="text"
          style="text-align: center;"
        />
        <label for="satellite-timeline-setting-interval" class="active">Calculation Interval (Seconds)</label>
      </div>
    </div>
    <div class="row">
      <div class="input-field col s12">
        <input id="satellite-timeline-setting-bad-length" value="${this.lengthOfBadPass_.toString()}" type="text"
          style="text-align: center;"
        />
        <label for="satellite-timeline-setting-bad-length" class="active">Bad Pass Length (Seconds)</label>
      </div>
    </div>
    <div class="row">
      <div class="input-field col s12">
        <input id="satellite-timeline-setting-avg-length" value="${this.lengthOfAvgPass_.toString()}" type="text"
          style="text-align: center;"
        />
        <label for="satellite-timeline-setting-avg-length" class="active">Average Pass Length (Seconds)</label>
      </div>
    </div>`;
  sideMenuSecondaryOptions = {
    width: 350,
    leftOffset: 0,
    zIndex: 10,
  };
  downloadIconCb = () => {
    const canvas = document.getElementById('satellite-timeline-canvas') as HTMLCanvasElement;
    const image = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const link = document.createElement('a');

    link.href = image;
    link.download = `sensor-${ServiceLocator.getSensorManager().getSensor().uiName}-timeline.png`;
    link.click();
  };

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        this.canvas_ = <HTMLCanvasElement>getEl('satellite-timeline-canvas');
        this.canvasStatic_ = <HTMLCanvasElement>getEl('satellite-timeline-canvas-static');
        this.ctx_ = this.canvas_.getContext('2d');
        this.ctxStatic_ = this.canvasStatic_.getContext('2d');

        getEl('satellite-timeline-setting-total-length')!.addEventListener('change', () => {
          this.lengthOfLookAngles_ = parseFloat((<HTMLInputElement>getEl('satellite-timeline-setting-total-length')).value) as Hours;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });

        getEl('satellite-timeline-setting-interval')!.addEventListener('change', () => {
          this.angleCalculationInterval_ = parseFloat((<HTMLInputElement>getEl('satellite-timeline-setting-interval')).value) as Seconds;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });

        getEl('satellite-timeline-setting-bad-length')!.addEventListener('change', () => {
          this.lengthOfBadPass_ = parseFloat((<HTMLInputElement>getEl('satellite-timeline-setting-bad-length')).value) as Seconds;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });

        getEl('satellite-timeline-setting-avg-length')!.addEventListener('change', () => {
          this.lengthOfAvgPass_ = parseFloat((<HTMLInputElement>getEl('satellite-timeline-setting-avg-length')).value) as Seconds;
          this.ctxStatic_.reset();
          this.updateTimeline();
        });
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (sat: BaseObject) => {
        if (!sat && PluginRegistry.getPlugin(WatchlistPlugin)?.watchlistList.length === 0) {
          this.setBottomIconToDisabled();
        } else if (this.verifySensorSelected(false)) {
          this.setBottomIconToEnabled();
        }

        if (this.isMenuButtonActive) {
          if (sat) {
            this.ctxStatic_.reset();
            this.updateTimeline();
            this.canvas_.style.display = 'block';
          }
        }
      },
    );
    EventBus.getInstance().on(EventBusEvent.onWatchlistUpdated, this.onWatchlistUpdated_.bind(this));
    EventBus.getInstance().on(EventBusEvent.resize, this.resizeCanvas_.bind(this));
  }

  private onWatchlistUpdated_(watchlistList: number[]) {
    if (watchlistList.length === 0 && PluginRegistry.getPlugin(SelectSatManager)?.selectedSat === -1) {
      this.setBottomIconToDisabled();
    } else if (this.verifySensorSelected(false)) {
      this.setBottomIconToEnabled();
    }
  }

  updateTimeline(): void {
    try {
      if (ServiceLocator.getSensorManager().isSensorSelected() === false) {
        return;
      }
      if (!this.isMenuButtonActive) {
        return;
      }

      const passes = this.calculatePasses_();

      this.drawTimeline_(passes);
    } catch (e) {
      errorManagerInstance.info(e);
    }
  }

  private calculatePasses_(): SatellitePasses[] {
    const satellitePasses: SatellitePasses[] = [];
    const sensor = ServiceLocator.getSensorManager().getSensor();
    const satellites = PluginRegistry.getPlugin(WatchlistPlugin).getSatellites().concat(PluginRegistry.getPlugin(SelectSatManager).selectedSat).filter((sat) => sat !== -1);

    for (const sat of satellites) {
      const satellite = ServiceLocator.getCatalogManager().getSat(sat);
      const sensorPass: SatellitePasses = {
        satellite,
        passes: [],
      };

      // Skip if satellite is above the max range of the sensor
      if (sensor.maxRng < satellite.perigee && (!sensor.maxRng2 || sensor.maxRng2 < satellite.perigee)) {
        continue;
      }

      // SensorManager.updateSensorUiStyling([sensor]);
      let offset = 0;

      const durationInSeconds = this.lengthOfLookAngles_ * 60 * 60;
      let isInView = false;
      let isEnterView = false;
      let isExitView = false;
      let startTime = null;


      for (let i = 0; i < durationInSeconds; i += this.angleCalculationInterval_) {
        // 5second Looks
        offset = i * 1000; // Offset in seconds (msec * 1000)
        const now = ServiceLocator.getTimeManager().getOffsetTimeObj(offset);
        const multiSitePass = SatelliteTimeline.propagateMultiSite(now, satellite.satrec, sensor);

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

      satellitePasses.push(sensorPass);
    }

    return satellitePasses;
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

  private drawTimeline_(satellitePasses: SatellitePasses[]): void {
    // Clone the canvas element to remove all event listeners
    const oldCanvas = this.canvas_;
    const newCanvas = oldCanvas.cloneNode(true) as HTMLCanvasElement;

    oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
    this.canvas_ = newCanvas;
    this.ctx_ = this.canvas_.getContext('2d');

    // Clear the events list
    this.drawEvents_ = {};

    const leftOffset = this.canvas_.width * 0.15;
    const topOffset = 0; // Canvas is already offset from the top
    const width = this.canvas_.width * 0.75;
    const height = this.canvas_.height * 0.85;
    const timeManager = ServiceLocator.getTimeManager();
    const startTime = timeManager.simulationTimeObj.getTime();
    const endTime = startTime + this.lengthOfLookAngles_ * 60 * 60 * 1000; // 24 hours from now

    // clear canvas
    this.ctx_.reset();

    this.ctx_.fillStyle = 'rgb(58, 58, 58)'; // #3a3a3a
    this.ctx_.fillRect(leftOffset, topOffset, width, height - 15);

    const yStep = height / (satellitePasses.length + 1);
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
    satellitePasses.forEach((satellitePass, index) => {
      const y = topOffset + (index + 1) * yStep;

      // Draw sensor name
      this.ctx_.fillStyle = 'rgb(255, 255, 255)';
      this.ctx_.font = '14px Consolas';
      this.ctx_.fillText(satellitePass.satellite.sccNum, leftOffset - 150, y + 5);

      // Draw passes
      satellitePass.passes.forEach((pass) => {
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
            const text = `${satellitePass.satellite.sccNum}: ${startTime} - ${endTime}`;

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
            const timeManagerInstance = ServiceLocator.getTimeManager();

            timeManagerInstance.changeStaticOffset(new Date(passStart).getTime() - timeManagerInstance.realTime);
            timeManagerInstance.calculateSimulationTime();
            PluginRegistry.getPlugin(SelectSatManager).selectSat(satellitePass.satellite.id);
          }
        });
      });

      // If no passes draw a light gray bar to indicate no passes
      if (satellitePass.passes.length === 0) {
        this.ctx_.fillStyle = 'rgba(200, 200, 200, 0.2)';
        this.ctx_.fillRect(leftOffset, y - 10, width, 20);

        const drawEvent = (mouseX: number, mouseY: number): boolean => {
          if (mouseX >= leftOffset && mouseX <= leftOffset + width && mouseY >= y - 10 && mouseY <= y + 10) {
            const text = `${satellitePass.satellite.sccNum}: No Passes`;

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

        this.drawEvents_[`${index}-${satellitePass.satellite.id}-no-passes`] = drawEvent;
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
    const timelineMenuDOM = getEl('satellite-timeline-menu');

    // if the canvas is not visible, don't resize it
    if (timelineMenuDOM.style.display === 'none') {
      return;
    }

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

    this.updateTimeline();
  }
}
