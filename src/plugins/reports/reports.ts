import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';
import analysisPng from '@public/img/icons/reports.png';


import { BaseObject, DetailedSatellite, MILLISECONDS_PER_SECOND } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class ReportsPlugin extends KeepTrackPlugin {
  static readonly PLUGIN_NAME = 'Reports';
  dependencies = [SelectSatManager.PLUGIN_NAME];
  private selectSatManager_: SelectSatManager;

  constructor() {
    super(ReportsPlugin.PLUGIN_NAME);
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  isRequireSatelliteSelected = true;

  bottomIconElementName = 'menu-reports';
  bottomIconLabel = 'Reports';
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
        <div class="center-align">
          <br>
          <button
              id="aer-report-btn" class="btn btn-ui waves-effect waves-light" type="button" name="action">Generate AER Report &#9658;
          </button>
        </div>
      </div>
    </div>
  </div>
  `;

  helpTitle = 'Reports Menu';
  helpBody = keepTrackApi.html`The Reports Menu is a collection of tools to help you analyze and understand the data you are viewing.`;

  dragOptions: clickDragOptions = {
    isDraggable: true,
  };

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('aer-report-btn').addEventListener('click', () => this.generateAerReport());
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.PLUGIN_NAME,
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

  generateAerReport() {
    const sensorManager = keepTrackApi.getSensorManager();
    const sat = this.selectSatManager_.primarySatObj as DetailedSatellite;


    if (!sensorManager.isSensorSelected()) {
      errorManagerInstance.warn('Select a sensor first!');

      return;
    }
    if (!sat) {
      errorManagerInstance.warn('Select a satellite first!');

      return;
    }

    if (!(sat instanceof DetailedSatellite)) {
      errorManagerInstance.warn('Satellite is not DetailedSatellite!');

      return;
    }

    const sensor = sensorManager.currentSensors[0];


    /*
     * Azimuth Elevation Range Report
     * ------------------------------
     * Satellite: [Satellite Name]
     * NORAD ID: [NORAD ID]
     * Date: [Date]
     */

    const reportHeader = `Azimuth Elevation Range Report\n-------------------------------\nSatellite: ${sat.name}\nNORAD ID: ${sat.sccNum}\nDate: ${new Date().toISOString()}\n\n`;
    let report = 'Time (UTC),Azimuth(°),Elevation(°),Range(km)\n';
    const durationInMinutes = 72 * 60;
    let isInCoverage = false;

    for (let t = 0; t < durationInMinutes; t++) {
      const time = keepTrackApi.getTimeManager().getOffsetTimeObj(t * MILLISECONDS_PER_SECOND * 60);
      const rae = sensor.rae(sat, time);

      if (rae.el > 0) {
        isInCoverage = true;
        report += `${time.toISOString()},${rae.az.toFixed(3)},${rae.el.toFixed(3)},${rae.rng.toFixed(3)}\n`;
      } else if (isInCoverage) {
        // If we were in coverage but now we are not, add a blank line to separate the passes
        report += '\n\n';
        isInCoverage = false;
      }
    }

    if (report === 'Time (UTC),Azimuth(°),Elevation(°),Range(km)\n') {
      report += 'No passes found!';
    }

    this.writeReport(sat, reportHeader, report);
  }

  writeReport(sat: DetailedSatellite, reportHeader: string, report: string) {
    // Open a new window and write the report to it - the title of the window should be the satellite name
    const win = window.open('text/plain', sat.name);

    const colWidths = [0, 0, 0, 0];

    if (win) {
      const formattedReport = report
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

          if (idx === 0) {
            // Add ---- under the entire header
            const header = values.join('   ');
            const headerUnderline = header.replace(/./gu, '-');


            return `${header}\n${headerUnderline}`;
          }


          return row;
        })
        .join('\n');

      win.document.write(`<plaintext>${reportHeader}${formattedReport}</plaintext>`);
      win.document.title = sat.name;
      win.history.replaceState(null, sat.name, `/${sat.name}.txt`);
    } else {
      // eslint-disable-next-line no-alert
      alert('Please allow popups for this site');
    }
  }
}
