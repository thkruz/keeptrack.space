
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

import { MenuMode } from '@app/engine/core/interfaces';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import analysisPng from '@public/img/icons/reports.png';


import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { BaseObject, DetailedSatellite, DetailedSensor, EciVec3, Kilometers, MILLISECONDS_PER_SECOND } from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

interface ReportData {
  filename: string;
  header: string;
  body: string;
  columns?: number;
  isHeaders?: boolean;
}

/**
 * Interface for a report generator that can be registered with the ReportsPlugin
 */
export interface ReportGenerator {
  /** Unique identifier for this report */
  id: string;
  /** Display name for the report button */
  name: string;
  /** Description of what the report contains */
  description?: string;
  /** Whether this report requires a sensor to be selected */
  requiresSensor?: boolean;
  /**
   * Generate the report data
   * @param sat The selected satellite
   * @param sensor The selected sensor (if required)
   * @param startTime The start time for the report
   * @returns The report data to be written
   */
  generate(sat: DetailedSatellite, sensor: DetailedSensor | null, startTime: Date): ReportData;
}

export class ReportsPlugin extends KeepTrackPlugin {
  readonly id = 'ReportsPlugin';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  /**
   * Static registry of all available report generators
   * Other plugins can register their reports by calling ReportsPlugin.registerReport()
   */
  private static reportRegistry_: Map<string, ReportGenerator> = new Map();
  private buttons_: string;

  /**
   * Register a new report generator
   * This can be called by any plugin to add custom reports
   * @param report The report generator to register
   */
  static registerReport(report: ReportGenerator): void {
    if (ReportsPlugin.reportRegistry_.has(report.id)) {
      errorManagerInstance.warn(`Report with id "${report.id}" is already registered. Overwriting.`);
    }
    ReportsPlugin.reportRegistry_.set(report.id, report);
  }

  /**
   * Unregister a report generator
   * @param reportId The id of the report to unregister
   */
  static unregisterReport(reportId: string): void {
    ReportsPlugin.reportRegistry_.delete(reportId);
  }

  /**
   * Get all registered reports
   */
  static getRegisteredReports(): ReportGenerator[] {
    return Array.from(ReportsPlugin.reportRegistry_.values());
  }

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor

    // Register built-in reports
    this.registerBuiltInReports_();

    this.buttons_ = ReportsPlugin.getRegisteredReports()
      .map((report) => `
          <button
              id="${report.id}-btn"
              class="btn btn-ui waves-effect waves-light"
              type="button"
              name="action"
              title="${report.description || report.name}">
            ${report.name} &#9658;
          </button>
      `)
      .join('');
  }

  isRequireSatelliteSelected = true;

  menuMode: MenuMode[] = [MenuMode.ANALYSIS, MenuMode.ALL];

  bottomIconImg = analysisPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  sideMenuElementName: string = 'reports-menu';

  /**
   * Dynamically generate the side menu HTML based on registered reports
   */
  sideMenuElementHtml: string = html`
      <div id="reports-menu" class="side-menu-parent start-hidden text-select">
        <div id="reports-content" class="side-menu">
          <div class="row">
            <h5 class="center-align">Reports</h5>
            <div class="divider"></div>
            <div id="reports-buttons" class="center-align" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px; margin-left: 10px; margin-right: 10px;">
            </div>
          </div>
        </div>
      </div>
    `;

  dragOptions: ClickDragOptions = {
    isDraggable: false,
    minWidth: 320,
  };

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerInit,
      () => {
        // Insert the dynamically generated buttons into the side menu
        const buttonsContainer = getEl('reports-buttons');

        if (buttonsContainer) {
          buttonsContainer.innerHTML = this.buttons_;
        }
      },
    );
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        // Dynamically attach event listeners for all registered reports
        ReportsPlugin.getRegisteredReports().forEach((report) => {
          const button = getEl(`${report.id}-btn`);

          if (button) {
            button.addEventListener('click', () => this.generateReport_(report));
          }
        });
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        if (obj?.isSatellite()) {
          getEl(this.bottomIconElementName)?.classList.remove('bmenu-item-disabled');
          this.isIconDisabled = false;
        } else {
          getEl(this.bottomIconElementName)?.classList.add('bmenu-item-disabled');
          this.isIconDisabled = true;
        }
      },
    );
  }

  /**
   * Generic report generation method that works with any registered report
   */
  private generateReport_(report: ReportGenerator): void {
    const sat = this.getSat_();

    if (!sat) {
      return;
    }

    let sensor: DetailedSensor | null = null;

    if (report.requiresSensor) {
      sensor = this.getSensor_();
      if (!sensor) {
        return;
      }
    }

    const startTime = this.getStartTime_();
    const reportData = report.generate(sat, sensor, startTime);

    this.writeReport_(reportData);
  }

  /**
   * Register all built-in reports
   * This is called during construction
   */
  private registerBuiltInReports_(): void {
    // Azimuth Elevation Range Report
    ReportsPlugin.registerReport({
      id: 'aer-report',
      name: 'Azimuth Elevation Range',
      description: 'Generate azimuth, elevation, and range data for satellite passes',
      requiresSensor: true,
      generate: (sat: DetailedSatellite, sensor: DetailedSensor | null, startTime: Date): ReportData => {
        if (!sensor) {
          throw new Error('Sensor is required for AER report');
        }

        const header = `Azimuth Elevation Range Report\n-------------------------------\n${this.createHeader_(sat, sensor)}`;
        let body = 'Time (UTC),Azimuth(°),Elevation(°),Range(km)\n';
        const durationInSeconds = 72 * 60 * 60;
        let isInCoverage = false;
        let time = new Date(startTime.getTime());

        for (let t = 0; t < durationInSeconds; t += 30) {
          time = new Date(time.getTime() + MILLISECONDS_PER_SECOND * 30);
          const rae = sensor.rae(sat, time);

          if (!rae) {
            continue;
          }

          if (rae.el > 0) {
            isInCoverage = true;
            body += `${this.formatTime_(time)},${rae.az.toFixed(3)},${rae.el.toFixed(3)},${rae.rng.toFixed(3)}\n`;
          } else if (isInCoverage) {
            body += '\n\n';
            isInCoverage = false;
          }
        }

        if (body === 'Time (UTC),Azimuth(°),Elevation(°),Range(km)\n') {
          body += 'No passes found!';
        }

        return {
          filename: `aer-${sat.sccNum}`,
          header,
          body,
        };
      },
    });

    // Latitude Longitude Altitude Report
    ReportsPlugin.registerReport({
      id: 'lla-report',
      name: 'Latitude Longitude Altitude',
      description: 'Generate latitude, longitude, and altitude data over time',
      requiresSensor: false,
      generate: (sat: DetailedSatellite, _sensor: DetailedSensor | null, startTime: Date): ReportData => {
        const header = `Latitude Longitude Altitude Report\n-------------------------------\n${this.createHeader_(sat)}`;
        let body = 'Time (UTC),Latitude(°),Longitude(°),Altitude(km)\n';
        const durationInSeconds = 72 * 60 * 60;
        let time = new Date(startTime.getTime());

        for (let t = 0; t < durationInSeconds; t += 30) {
          time = new Date(time.getTime() + 30 * MILLISECONDS_PER_SECOND);
          const lla = sat.lla(time);

          if (!lla) {
            continue;
          }

          body += `${this.formatTime_(time)},${lla.lat.toFixed(3)},${lla.lon.toFixed(3)},${lla.alt.toFixed(3)}\n`;
        }

        return {
          filename: `lla-${sat.sccNum}`,
          header,
          body,
        };
      },
    });

    // Earth Centered Inertial Report
    ReportsPlugin.registerReport({
      id: 'eci-report',
      name: 'Earth Centered Inertial',
      description: 'Generate ECI position and velocity vectors over time',
      requiresSensor: false,
      generate: (sat: DetailedSatellite, _sensor: DetailedSensor | null, startTime: Date): ReportData => {
        const header = `Earth Centered Intertial Report\n-------------------------------\n${this.createHeader_(sat)}`;
        let body = 'Time (UTC),Position X(km),Position Y(km),Position Z(km),Velocity X(km/s),Velocity Y(km/s),Velocity Z(km/s)\n';
        const durationInSeconds = 72 * 60 * 60;
        let time = new Date(startTime.getTime());

        for (let t = 0; t < durationInSeconds; t += 30) {
          time = new Date(time.getTime() + 30 * MILLISECONDS_PER_SECOND);
          const eci = sat.eci(time);

          if (!eci) {
            continue;
          }

          body += `${this.formatTime_(time)},${eci.position.x.toFixed(3)},${eci.position.y.toFixed(3)},${eci.position.z.toFixed(3)},` +
            `${eci.velocity.x.toFixed(3)},${eci.velocity.y.toFixed(3)},${eci.velocity.z.toFixed(3)}\n`;
        }

        return {
          filename: `eci-${sat.sccNum}`,
          header,
          body,
          columns: 7,
          isHeaders: true,
        };
      },
    });

    // Classical Orbital Elements Report
    ReportsPlugin.registerReport({
      id: 'coes-report',
      name: 'Classical Orbital Elements',
      description: 'Generate classical orbital elements at current epoch',
      requiresSensor: false,
      generate: (sat: DetailedSatellite): ReportData => {
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

        return {
          filename: `coes-${sat.sccNum}`,
          header,
          body,
          columns: 2,
          isHeaders: false,
        };
      },
    });

    // NEW: Visibility Windows Report
    ReportsPlugin.registerReport({
      id: 'visibility-windows-report',
      name: 'Visibility Windows',
      description: 'Generate visibility windows with rise/set times and pass duration',
      requiresSensor: true,
      generate: (sat: DetailedSatellite, sensor: DetailedSensor | null, startTime: Date): ReportData => {
        if (!sensor) {
          throw new Error('Sensor is required for Visibility Windows report');
        }

        const header = `Visibility Windows Report\n-------------------------------\n${this.createHeader_(sat, sensor)}`;
        let body = 'Pass #,Rise Time (UTC),Set Time (UTC),Duration (min),Max Elevation(°),Max Elevation Time (UTC)\n';
        const durationInSeconds = 7 * 24 * 60 * 60; // 7 days
        let time = new Date(startTime.getTime());
        let passNumber = 0;
        let inPass = false;
        let riseTime: Date | null = null;
        let maxEl = 0;
        let maxElTime: Date | null = null;

        for (let t = 0; t < durationInSeconds; t += 10) {
          time = new Date(startTime.getTime() + t * MILLISECONDS_PER_SECOND);
          const rae = sensor.rae(sat, time);

          if (!rae) {
            continue;
          }

          if (rae.el > 0 && !inPass) {
            // Pass start
            inPass = true;
            riseTime = new Date(time.getTime());
            maxEl = rae.el;
            maxElTime = new Date(time.getTime());
          } else if (rae.el > 0 && inPass) {
            // During pass - track max elevation
            if (rae.el > maxEl) {
              maxEl = rae.el;
              maxElTime = new Date(time.getTime());
            }
          } else if (rae.el <= 0 && inPass) {
            // Pass end
            inPass = false;
            passNumber++;
            const setTime = new Date(time.getTime());
            const duration = riseTime ? (setTime.getTime() - riseTime.getTime()) / (MILLISECONDS_PER_SECOND * 60) : 0;

            body += `${passNumber},${this.formatTime_(riseTime!)},${this.formatTime_(setTime)},${duration.toFixed(2)},` +
              `${maxEl.toFixed(3)},${this.formatTime_(maxElTime!)}\n`;

            maxEl = 0;
            maxElTime = null;
            riseTime = null;
          }
        }

        if (passNumber === 0) {
          body += 'No passes found in the next 7 days!';
        }

        return {
          filename: `visibility-windows-${sat.sccNum}`,
          header,
          body,
          columns: 6,
          isHeaders: true,
        };
      },
    });

    // NEW: Sun/Eclipse Report
    ReportsPlugin.registerReport({
      id: 'sun-eclipse-report',
      name: 'Sun/Eclipse Analysis',
      description: 'Generate sun visibility and eclipse entry/exit times for power and thermal analysis',
      requiresSensor: false,
      generate: (sat: DetailedSatellite, _sensor: DetailedSensor | null, startTime: Date): ReportData => {
        const header = `Sun/Eclipse Analysis Report\n-------------------------------\n${this.createHeader_(sat)}`;
        let body = 'Time (UTC),Sun Illuminated,Eclipse Type,Sun Angle(°)\n';
        const durationInSeconds = 3 * 24 * 60 * 60; // 3 days
        let time = new Date(startTime.getTime());
        let wasIlluminated = true;
        // let eclipseEntryTime: Date | null = null;
        // let sunlightEntryTime: Date | null = null;

        for (let t = 0; t < durationInSeconds; t += 60) {
          time = new Date(startTime.getTime() + t * MILLISECONDS_PER_SECOND);

          // Calculate if satellite is illuminated by the sun
          const satPos = sat.eci(time)?.position;

          if (!satPos) {
            continue;
          }
          const sunPos = this.getSunPosition_(time);
          const earthRadius = 6371; // km

          // Calculate if satellite is in Earth's shadow
          const isIlluminated = this.isSatelliteIlluminated_(satPos, sunPos, earthRadius);

          // Calculate sun angle (angle between satellite and sun from Earth center)
          const sunAngle = this.calculateSunAngle_(satPos, sunPos);

          const illuminationStatus = isIlluminated ? 'Yes' : 'No';
          const eclipseType = isIlluminated ? 'None' : this.getEclipseType_(satPos, sunPos, earthRadius);

          body += `${this.formatTime_(time)},${illuminationStatus},${eclipseType},${sunAngle.toFixed(3)}\n`;

          // Track transitions
          if (!isIlluminated && wasIlluminated) {
            // eclipseEntryTime = time;
          } else if (isIlluminated && !wasIlluminated) {
            // sunlightEntryTime = time;
          }

          wasIlluminated = isIlluminated;
        }

        return {
          filename: `sun-eclipse-${sat.sccNum}`,
          header,
          body,
          columns: 4,
          isHeaders: true,
        };
      },
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

  /**
   * Get the sun's position in ECI coordinates at a given time
   * Simplified solar position algorithm
   */
  private getSunPosition_(time: Date): EciVec3<Kilometers> {
    const J2000 = new Date('2000-01-01T12:00:00Z').getTime();
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = (time.getTime() - J2000) / msPerDay;

    // Mean anomaly
    const M = (357.5291 + 0.98560028 * days) % 360;
    const Mrad = (M * Math.PI) / 180;

    // Ecliptic longitude
    const C = 1.9148 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad);
    const L = (280.4665 + 0.98564736 * days + C) % 360;
    const Lrad = (L * Math.PI) / 180;

    // Distance to sun (AU to km)
    const distance = 149597870.7; // 1 AU in km

    // Convert to ECI coordinates (simplified)
    const x = distance * Math.cos(Lrad);
    const y = distance * Math.sin(Lrad);
    const z = 0; // Simplified - sun is in ecliptic plane

    return { x, y, z } as EciVec3<Kilometers>;
  }

  /**
   * Calculate if satellite is illuminated by the sun
   * Uses simple cylindrical shadow model
   */
  private isSatelliteIlluminated_(satPos: EciVec3<Kilometers>, sunPos: EciVec3<Kilometers>, earthRadius: number): boolean {
    // Vector from satellite to sun
    // const toSun = {
    //   x: sunPos.x - satPos.x,
    //   y: sunPos.y - satPos.y,
    //   z: sunPos.z - satPos.z,
    // };

    // Check if satellite is on the dark side of Earth
    const dotProduct = satPos.x * sunPos.x + satPos.y * sunPos.y + satPos.z * sunPos.z;

    if (dotProduct > 0) {
      // Satellite is on the sunlit side
      return true;
    }

    // Calculate distance from Earth center to satellite
    const satDistance = Math.sqrt(satPos.x * satPos.x + satPos.y * satPos.y + satPos.z * satPos.z);

    // Simple cylindrical shadow check
    // If satellite is below LEO altitude and on dark side, it's in shadow
    if (satDistance < earthRadius + 1000) {
      return dotProduct > 0;
    }

    // For higher orbits, use more detailed check
    const crossX = satPos.y * sunPos.z - satPos.z * sunPos.y;
    const crossY = satPos.z * sunPos.x - satPos.x * sunPos.z;
    const crossZ = satPos.x * sunPos.y - satPos.y * sunPos.x;
    const crossMag = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
    const sunMag = Math.sqrt(sunPos.x * sunPos.x + sunPos.y * sunPos.y + sunPos.z * sunPos.z);
    const perpDist = crossMag / sunMag;

    return perpDist > earthRadius;
  }

  /**
   * Calculate the angle between satellite and sun as seen from Earth center
   */
  private calculateSunAngle_(satPos: EciVec3<Kilometers>, sunPos: EciVec3<Kilometers>): number {
    const satMag = Math.sqrt(satPos.x * satPos.x + satPos.y * satPos.y + satPos.z * satPos.z);
    const sunMag = Math.sqrt(sunPos.x * sunPos.x + sunPos.y * sunPos.y + sunPos.z * sunPos.z);
    const dotProduct = satPos.x * sunPos.x + satPos.y * sunPos.y + satPos.z * sunPos.z;

    const cosAngle = dotProduct / (satMag * sunMag);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    return (angle * 180) / Math.PI;
  }

  /**
   * Determine the type of eclipse (penumbral, umbral, etc.)
   */
  private getEclipseType_(satPos: EciVec3<Kilometers>, _sunPos: EciVec3<Kilometers>, earthRadius: number): string {
    const satDistance = Math.sqrt(satPos.x * satPos.x + satPos.y * satPos.y + satPos.z * satPos.z);

    // Simplified eclipse type determination
    if (satDistance < earthRadius + 200) {
      return 'Umbral';
    } else if (satDistance < earthRadius + 500) {
      return 'Penumbral';
    }

    return 'Umbral';
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
    const time = ServiceLocator.getTimeManager().getOffsetTimeObj(0);

    time.setMilliseconds(0);
    time.setSeconds(0);

    return time;
  }

  private getSat_(): DetailedSatellite | null {
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

  private getSensor_(): DetailedSensor | null {
    const sensorManager = ServiceLocator.getSensorManager();

    if (!sensorManager.isSensorSelected()) {
      errorManagerInstance.warn(t7e('errorMsgs.SelectSensorFirst'));

      return null;
    }

    const sensor = sensorManager.currentSensors[0];

    return sensor;
  }
}
