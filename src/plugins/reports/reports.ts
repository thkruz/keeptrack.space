/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * reports.ts is a plugin for generating quick reports in text format of various
 * satellite and sensor data
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { KeepTrackApiEvents, MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';
import analysisPng from '@public/img/icons/reports.png';


import { t7e } from '@app/locales/keys';
import { BaseObject, DetailedSatellite, DetailedSensor, MILLISECONDS_PER_SECOND } from 'ootk';
import { ClickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

interface ReportData {
  filename: string;
  header: string;
  body: string;
  columns?: number;
  isHeaders?: boolean;
}

export class ReportsPlugin extends KeepTrackPlugin {
  readonly id = 'ReportsPlugin';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  isRequireSatelliteSelected = true;

  menuMode: MenuMode[] = [MenuMode.ANALYSIS, MenuMode.ALL];

  bottomIconImg = analysisPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  sideMenuElementName: string = 'reports-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="reports-menu" class="side-menu-parent start-hidden text-select">
    <div id="reports-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Reports</h5>
        <div class="divider"></div>
        <div class="center-align" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px; margin-left: 10px; margin-right: 10px;">
          <button
              id="aer-report-btn" class="btn btn-ui waves-effect waves-light" type="button" name="action">Azimuth Elevation Range &#9658;
          </button>
          <button
              id="lla-report-btn" class="btn btn-ui waves-effect waves-light" type="button" name="action">Lattitude Longitude Altitude &#9658;
          </button>
          <button
              id="eci-report-btn" class="btn btn-ui waves-effect waves-light" type="button" name="action">Earth Centered Intertial &#9658;
          <button
              id="coes-report-btn" class="btn btn-ui waves-effect waves-light" type="button" name="action">Classical Orbital Elements &#9658;
          </button>
        </div>
      </div>
    </div>
  </div>
  `;

  dragOptions: ClickDragOptions = {
    isDraggable: false,
    minWidth: 320,
  };

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        getEl('aer-report-btn').addEventListener('click', () => this.generateAzElRng_());
        getEl('coes-report-btn').addEventListener('click', () => this.generateClasicalOrbElJ2000_());
        getEl('eci-report-btn').addEventListener('click', () => this.generateEci_());
        getEl('lla-report-btn').addEventListener('click', () => this.generateLla_());
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.id,
      cb: (obj: BaseObject) => {
        if (obj?.isSatellite()) {
          getEl(this.bottomIconElementName).classList.remove('bmenu-item-disabled');
          this.isIconDisabled = false;
        } else {
          getEl(this.bottomIconElementName).classList.add('bmenu-item-disabled');
          this.isIconDisabled = true;
        }
      },
    });
  }

  private generateAzElRng_() {
    const sat = this.getSat_();
    const sensor = this.getSensor_();

    if (!sat || !sensor) {
      return;
    }

    const header = `Azimuth Elevation Range Report\n-------------------------------\n${this.createHeader_(sat, sensor)}`;
    let body = 'Time (UTC),Azimuth(°),Elevation(°),Range(km)\n';
    const durationInSeconds = 72 * 60 * 60;
    let isInCoverage = false;
    let time = this.getStartTime_();

    for (let t = 0; t < durationInSeconds; t += 30) {
      time = new Date(time.getTime() + MILLISECONDS_PER_SECOND * 30);
      const rae = sensor.rae(sat, time);

      if (rae.el > 0) {
        isInCoverage = true;
        body += `${this.formatTime_(time)},${rae.az.toFixed(3)},${rae.el.toFixed(3)},${rae.rng.toFixed(3)}\n`;
      } else if (isInCoverage) {
        // If we were in coverage but now we are not, add a blank line to separate the passes
        body += '\n\n';
        isInCoverage = false;
      }
    }

    if (body === 'Time (UTC),Azimuth(°),Elevation(°),Range(km)\n') {
      body += 'No passes found!';
    }

    this.writeReport_({
      filename: `aer-${sat.sccNum}`,
      header,
      body,
    });
  }

  private formatTime_(time: Date) {
    const timeStr = time.toISOString();
    const timeStrSplit = timeStr.split('T');
    const date = timeStrSplit[0];
    const timeSplit = timeStrSplit[1].split('.');
    const timeOut = timeSplit[0];

    return `${date} ${timeOut}`;
  }

  private generateLla_() {
    const sat = this.getSat_();

    if (!sat) {
      return;
    }

    const header = `Latitude Longitude Altitude Report\n-------------------------------\n${this.createHeader_(sat)}`;
    let body = 'Time (UTC),Latitude(°),Longitude(°),Altitude(km)\n';
    const durationInSeconds = 72 * 60 * 60;
    let time = this.getStartTime_();

    for (let t = 0; t < durationInSeconds; t += 30) {
      time = new Date(time.getTime() + 30 * MILLISECONDS_PER_SECOND);
      const lla = sat.lla(time);

      body += `${this.formatTime_(time)},${lla.lat.toFixed(3)},${lla.lon.toFixed(3)},${lla.alt.toFixed(3)}\n`;
    }

    this.writeReport_({
      filename: `lla-${sat.sccNum}`,
      header,
      body,
    });
  }

  private generateEci_() {
    const sat = this.getSat_();

    if (!sat) {
      return;
    }

    const header = `Earth Centered Intertial Report\n-------------------------------\n${this.createHeader_(sat)}`;
    let body = 'Time (UTC),Position X(km),Position Y(km),Position Z(km),Velocity X(km/s),Velocity Y(km/s),Velocity Z(km/s)\n';
    const durationInSeconds = 72 * 60 * 60;
    let time = this.getStartTime_();

    for (let t = 0; t < durationInSeconds; t += 30) {
      time = new Date(time.getTime() + 30 * MILLISECONDS_PER_SECOND);
      const eci = sat.eci(time);

      body += `${this.formatTime_(time)},${eci.position.x.toFixed(3)},${eci.position.y.toFixed(3)},${eci.position.z.toFixed(3)},` +
        `${eci.velocity.x.toFixed(3)},${eci.velocity.y.toFixed(3)},${eci.velocity.z.toFixed(3)}\n`;
    }

    this.writeReport_({
      filename: `eci-${sat.sccNum}`,
      header,
      body,
      columns: 7,
      isHeaders: true,
    });
  }

  private createHeader_(sat: DetailedSatellite, sensor?: DetailedSensor) {
    const satData = '' +
      `Date: ${new Date().toISOString()}\n` +
      `Satellite: ${sat.name}\n` +
      `NORAD ID: ${sat.sccNum}\n` +
      `Alternate ID: ${sat.altId || 'None'}\n` +
      `International Designator: ${sat.intlDes}\n\n`;
    const sensorData = '' +
      `Sensor: ${sensor ? sensor.name : 'None'}\n` +
      `Type: ${sensor ? sensor.getTypeString() : 'None'}\n` +
      `Latitude: ${sensor ? sensor.lat : 'None'}\n` +
      `Longitude: ${sensor ? sensor.lon : 'None'}\n` +
      `Altitude: ${sensor ? sensor.alt : 'None'}\n` +
      `Min Azimuth: ${sensor ? sensor.minAz : 'None'}\n` +
      `Max Azimuth: ${sensor ? sensor.maxAz : 'None'}\n` +
      `Min Elevation: ${sensor ? sensor.minEl : 'None'}\n` +
      `Max Elevation: ${sensor ? sensor.maxEl : 'None'}\n` +
      `Min Range: ${sensor ? sensor.minRng : 'None'}\n` +
      `Max Range: ${sensor ? sensor.maxRng : 'None'}\n\n`;


    return sensor ? `${satData}${sensorData}` : `${satData}`;
  }

  private generateClasicalOrbElJ2000_() {
    const sat = this.getSat_();

    if (!sat) {
      return;
    }

    const header = `Classic Orbit Elements Report\n-------------------------------\n${this.createHeader_(sat)}`;
    const classicalEls = sat.toJ2000().toClassicalElements();
    const body = '' +
      `Epoch, ${classicalEls.epoch}\n` +
      `Apogee, ${classicalEls.apogee.toFixed(3)} km\n` +
      `Perigee, ${classicalEls.perigee.toFixed(3)} km\n` +
      `Inclination, ${classicalEls.inclination.toFixed(3)}°\n` +
      `Right Ascension, ${classicalEls.rightAscensionDegrees.toFixed(3)}°\n` +
      `Argument of Perigee, ${classicalEls.argPerigeeDegrees.toFixed(3)}°\n` +
      `True Anomaly, ${classicalEls.trueAnomalyDegrees.toFixed(3)}°\n` +
      `Eccentricity, ${classicalEls.eccentricity.toFixed(3)}\n` +
      `Period, ${classicalEls.period.toFixed(3)} min\n` +
      `Semi-Major Axis, ${classicalEls.semimajorAxis.toFixed(3)} km\n` +
      `Mean Motion, ${classicalEls.meanMotion.toFixed(3)} rev/day`;


    this.writeReport_({
      filename: `coes-${sat.sccNum}`,
      header,
      body,
      columns: 2,
      isHeaders: false,
    });
  }

  private writeReport_({ filename, header, body, columns = 4, isHeaders = true }: ReportData) {
    // Open a new window and write the report to it - the title of the window should be the satellite name
    const win = window.open('text/plain', filename);

    // Create an array that is columns long and fill it with 0s
    const colWidths = new Array(columns).fill(0);

    if (win) {
      const formattedReport = body
        .split('\n')
        .map((line) => line.split(','))
        .map((values, idx) => values.map((value, idx2) => {
          if (idx === 0) {
            if (idx2 === 0) {
              colWidths[idx2] = Math.max(new Date().toISOString().length + 5, value.trim().length + 5);
            } else {
              colWidths[idx2] = Math.max(10, value.trim().length + 5);
            }
          }

          return value.trim().padEnd(colWidths[idx2]);
        },
        ))
        .map((values, idx) => {
          const row = values.join('   ');

          if (idx === 0 && isHeaders) {
            // Add ---- under the entire header
            const header = values.join('   ');
            const headerUnderline = header.replace(/./gu, '-');


            return `${header}\n${headerUnderline}`;
          }


          return row;
        })
        .join('\n');

      // Create a download button at the top so you can download the report as a .txt file
      win.document.write(`<a href="data:text/plain;charset=utf-8,${encodeURIComponent(header + formattedReport)}" download="${filename}.txt">Download Report</a><br>`);

      win.document.write(`<plaintext>${header}${formattedReport}`);
      win.document.title = filename;
      win.history.replaceState(null, filename, `/${filename}.txt`);
    } else {
      // eslint-disable-next-line no-alert
      alert(t7e('errorMsgs.Reports.popupBlocker'));
    }
  }

  private getStartTime_() {
    const time = keepTrackApi.getTimeManager().getOffsetTimeObj(0);

    time.setMilliseconds(0);
    time.setSeconds(0);

    return time;
  }

  private getSat_(): DetailedSatellite {
    const sat = this.selectSatManager_.primarySatObj as DetailedSatellite;

    if (!sat) {
      errorManagerInstance.warn(t7e('errorMsgs.SelectSatelliteFirst'));

      return null;
    }

    if (!(sat instanceof DetailedSatellite)) {
      errorManagerInstance.warn(t7e('errorMsgs.SatelliteNotDetailedSatellite'));

      return null;
    }

    return sat;
  }

  private getSensor_(): DetailedSensor {
    const sensorManager = keepTrackApi.getSensorManager();

    if (!sensorManager.isSensorSelected()) {
      errorManagerInstance.warn(t7e('errorMsgs.SelectSensorFirst'));

      return null;
    }

    const sensor = sensorManager.currentSensors[0];

    return sensor;
  }
}
