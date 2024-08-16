import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl, hideEl, showEl } from '@app/lib/get-el';
import analysisPng from '@public/img/icons/polar.png';


import { BaseObject, Degrees, DetailedSatellite, MILLISECONDS_PER_SECOND, secondsPerDay } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/SoundNames';

interface PolarPlotData extends Array<[Degrees, Degrees]> { }

export class PolarPlotPlugin extends KeepTrackPlugin {
  dependencies_ = [SelectSatManager.name];
  private selectSatManager_: SelectSatManager;
  passStartTime_: Date;
  passStopTime_: Date;

  private plotDuration_ = 3;

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  private ctx_: CanvasRenderingContext2D;
  private centerX_: number;
  private centerY_: number;
  private distanceUnit_: number;
  private canvasSize_: number;
  private fontRatio_ = 0.03;
  private plotData_: PolarPlotData = [];

  isRequireSatelliteSelected = true;
  isRequireSensorSelected = true;

  bottomIconElementName = 'menu-polar-plot';
  bottomIconLabel = 'Polar Plot';
  bottomIconImg = analysisPng;
  bottomIconCallback: () => void = () => {
    this.updatePlot_();
  };
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  sideMenuElementName: string = 'polar-plot-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="polar-plot-menu" class="side-menu-parent start-hidden text-select">
    <div id="polar-plot-content" class="side-menu" style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <span id="polar-plot-warning" class="text-center">Satellite is not in view for the next ${(this.plotDuration_ * 24).toFixed(0)} hours</span>
      <canvas id="polar-plot" class="w-96" width="1000" height="1000"></canvas>
      <button id="polar-plot-save" class="btn btn-primary">Save Image</button>
    </div>
  </div>
  `;

  helpTitle = 'Polar Plot Menu';
  helpBody = keepTrackApi.html`The Polar Plot Menu is used to generate a 2D polar plot of the satellite's azimuth and elevation over time.`;

  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 450,
    maxWidth: 1000,
  };

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.constructor.name,
      cb: () => {
        getEl('polar-plot-save').addEventListener('click', () => {
          const canvas = document.getElementById('polar-plot') as HTMLCanvasElement;
          const image = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
          const link = document.createElement('a');

          link.href = image;
          link.download = `sat-${(this.selectSatManager_.getSelectedSat() as DetailedSatellite).sccNum6}-polar-plot.png`;
          link.click();
        });
      },
    });
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.staticOffsetChange,
      cbName: this.constructor.name,
      cb: () => {
        if (this.isMenuButtonActive) {
          this.updatePlot_();
        }
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.constructor.name,
      cb: (obj: BaseObject) => {
        if (obj?.isSatellite() && keepTrackApi.getSensorManager().isSensorSelected()) {
          getEl(this.bottomIconElementName).classList.remove('bmenu-item-disabled');
          this.isIconDisabled = false;
          // If it is open then refresh the plot
          if (this.isMenuButtonActive) {
            this.updatePlot_();
          }
        } else {
          getEl(this.bottomIconElementName).classList.add('bmenu-item-disabled');
          this.isIconDisabled = true;
        }
      },
    });

    const keyboardManager = keepTrackApi.getInputManager().keyboard;

    keyboardManager.registerKeyUpEvent({
      key: 'P',
      callback: () => {
        if (keepTrackApi.getPlugin(SelectSatManager).selectedSat === -1) {
          return;
        }

        if (!this.isMenuButtonActive) {
          this.openSideMenu();
          this.setBottomIconToSelected();
          this.updatePlot_();
          keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_ON);
        } else {
          this.closeSideMenu();
          this.setBottomIconToUnselected();
          keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);
        }
      },
    });
  }

  private updatePlot_(): void {
    if (this.generatePlotData_()) {
      // If there is data draw it
      this.drawPlot_();
      hideEl('polar-plot-warning');
      showEl('polar-plot');
      showEl('polar-plot-save');
    } else {
      showEl('polar-plot-warning');
      hideEl('polar-plot');
      hideEl('polar-plot-save');
      getEl('polar-plot-warning').innerHTML = `Satellite is not in view for the next ${(this.plotDuration_ * 24).toFixed(0)} hours`;
    }
  }

  private generatePlotData_(): boolean {
    this.passStartTime_ = null;
    this.passStopTime_ = null;

    const sensor = keepTrackApi.getSensorManager().getSensor();
    const sat = this.selectSatManager_.getSelectedSat() as DetailedSatellite;
    let isSomethingInView = false;

    if (sat.perigee > sensor.maxRng || sat.apogee < sensor.minRng) {
      return false;
    }

    this.plotData_ = [];
    let now: Date = null;

    for (let i = 0; i < this.plotDuration_ * secondsPerDay; i++) {
      now = keepTrackApi.getTimeManager().getOffsetTimeObj(i * MILLISECONDS_PER_SECOND);
      const inView = sensor.isSatInFov(sat, now);

      if (inView) {
        if (!this.passStartTime_) {
          this.passStartTime_ = now;
        }
        const rae = sensor.rae(sat, now);

        this.plotData_.push([rae.az, rae.el]);
        isSomethingInView = true;
      } else if (isSomethingInView) {
        break;
      }
    }

    this.passStopTime_ = now;

    return isSomethingInView;
  }

  private drawPlot_(): void {
    this.setupCanvas_();
    this.drawPlotBackground_();
    this.drawOrbitLine_();
    this.drawStartAndEnd_();
    this.drawTitle_();
  }

  private drawTitle_(): void {
    this.ctx_.font = `${this.canvasSize_ * 0.035}px consolas`;
    this.ctx_.fillStyle = 'rgb(255, 255, 255)';
    this.ctx_.textAlign = 'center';
    this.ctx_.textBaseline = 'top';
    this.ctx_.fillText(`Satellite ${(<DetailedSatellite>this.selectSatManager_.getSelectedSat()).sccNum}: ` +
      `${this.passStartTime_.toISOString().slice(11, 19)} - ${this.passStopTime_.toISOString().slice(11, 19)}`, this.centerX_, 0);
  }

  private setupCanvas_() {
    const canvas = document.getElementById('polar-plot') as HTMLCanvasElement;

    if (!canvas) {
      return;
    }

    this.ctx_ = canvas.getContext('2d');
    this.canvasSize_ = Math.min(this.ctx_.canvas.width, this.ctx_.canvas.height);

    this.ctx_.imageSmoothingEnabled = true;
    this.centerX_ = this.ctx_.canvas.width / 2;
    this.centerY_ = this.ctx_.canvas.height / 2;
    this.distanceUnit_ = this.canvasSize_ / (2.5 * 90);

    this.ctx_.clearRect(0, 0, this.ctx_.canvas.width, this.ctx_.canvas.height);
  }

  private drawElevationLines_(): void {
    let radius: number = 0;
    let radians: number = 0;

    this.ctx_.beginPath();
    const altCircles = [15, 30, 45, 60, 75, 90];

    for (const circleDistance of altCircles) {
      radius = circleDistance * this.distanceUnit_;
      this.ctx_.moveTo(this.centerX_ + radius, this.centerY_);
      for (let th = 1; th <= 360; th++) {
        radians = (Math.PI / 180) * th;
        this.ctx_.lineTo(this.centerX_ + radius * Math.cos(radians), this.centerY_ + radius * Math.sin(radians));
      }
    }

    this.ctx_.lineWidth = 1;
    this.ctx_.stroke();
  }

  private drawStartAndEnd_(): void {
    this.drawDot_(this.plotData_[0][1], this.plotData_[0][0], 'lightgreen');
    this.drawDot_(this.plotData_[this.plotData_.length - 1][1], this.plotData_[this.plotData_.length - 1][0], 'red');
  }

  private drawDot_(radius: number, radians: number, color: 'lightgreen' | 'red' = 'lightgreen') {
    radians = (Math.PI / 180) * (radians - 90);
    radius = (90 - radius) * this.distanceUnit_;

    this.ctx_.beginPath();
    this.ctx_.arc(
      this.centerX_ + radius * Math.cos(radians),
      this.centerY_ + radius * Math.sin(radians),
      15,
      0,
      2 * Math.PI,
      false,
    );
    this.ctx_.fillStyle = color;
    this.ctx_.fill();
  }

  private drawOrbitLine_(): void {
    this.ctx_.beginPath();
    this.ctx_.strokeStyle = 'rgb(255, 255, 255)';
    this.ctx_.lineWidth = 2;

    const dataLength = this.plotData_.length;
    let radius = 0;

    for (let j = 0; j < dataLength; j++) {
      const radians = (Math.PI / 180) * (this.plotData_[j][0] - 90);

      radius = (90 - this.plotData_[j][1]) * this.distanceUnit_;
      if (j === 0) {
        this.ctx_.beginPath();
        this.ctx_.moveTo(this.centerX_ + radius * Math.cos(radians), this.centerY_ + radius * Math.sin(radians));
      }

      this.ctx_.lineTo(this.centerX_ + radius * Math.cos(radians), this.centerY_ + radius * Math.sin(radians));
    }
    this.ctx_.stroke();
  }

  private drawPlotBackground_(): void {
    this.drawElevationLines_();
    this.drawPolarAxes_();

    this.ctx_.font = `${this.canvasSize_ * this.fontRatio_}px serif`;
    this.ctx_.strokeStyle = 'rgb(77, 172, 255)';
    this.ctx_.fillStyle = 'rgb(77, 172, 255)';
    this.ctx_.lineWidth = 1;

    this.labelAzimuthAxis_();
    this.labelElevationAxis_();
  }

  private drawPolarAxes_() {
    const radius = 96 * this.distanceUnit_;

    this.ctx_.moveTo(this.centerX_, this.centerY_);
    this.ctx_.lineTo(this.centerX_, this.centerY_ + radius);
    this.ctx_.moveTo(this.centerX_, this.centerY_);
    this.ctx_.lineTo(this.centerX_, this.centerY_ - radius);
    this.ctx_.moveTo(this.centerX_, this.centerY_);
    this.ctx_.lineTo(this.centerX_ + radius, this.centerY_);
    this.ctx_.moveTo(this.centerX_, this.centerY_);
    this.ctx_.lineTo(this.centerX_ - radius, this.centerY_);
  }

  private labelElevationAxis_() {
    this.ctx_.textAlign = 'center';
    this.ctx_.textBaseline = 'middle';
    const diagDist = this.canvasSize_ / 700;

    this.ctx_.fillText('90°', this.centerX_ + 18 * diagDist, this.centerY_ - 12 * diagDist);
    this.ctx_.fillText('75°', this.centerX_ + 44 * diagDist, this.centerY_ - 44 * diagDist);
    this.ctx_.fillText('60°', this.centerX_ + 76 * diagDist, this.centerY_ - 76 * diagDist);
    this.ctx_.fillText('45°', this.centerX_ + 108 * diagDist, this.centerY_ - 108 * diagDist);
    this.ctx_.fillText('30°', this.centerX_ + 143 * diagDist, this.centerY_ - 143 * diagDist);
    this.ctx_.fillText('15°', this.centerX_ + 175 * diagDist, this.centerY_ - 175 * diagDist);
    this.ctx_.fillText('0°', this.centerX_ + 206 * diagDist, this.centerY_ - 206 * diagDist);
    this.ctx_.stroke();
  }

  private labelAzimuthAxis_() {
    const radius = 98 * this.distanceUnit_;

    this.ctx_.font = `${this.canvasSize_ * this.fontRatio_}px serif`;
    this.ctx_.textAlign = 'center';
    this.ctx_.textBaseline = 'bottom';
    this.ctx_.fillText(' 0°', this.centerX_, this.centerY_ - radius);
    this.ctx_.textBaseline = 'top';
    this.ctx_.fillText('180°', this.centerX_, this.centerY_ + radius);
    this.ctx_.textAlign = 'right';
    this.ctx_.textBaseline = 'middle';
    this.ctx_.fillText('270°', this.centerX_ - radius, this.centerY_);
    this.ctx_.textAlign = 'left';
    this.ctx_.fillText('90°', this.centerX_ + radius, this.centerY_);
    this.ctx_.stroke();
  }
}
