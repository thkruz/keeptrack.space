import lookanglesPng from '@app/img/icons/lookangles.png';
import { GetSatType, SatObject, SensorObject } from '@app/js/interfaces';
import { keepTrackApi, KeepTrackApiMethods } from '@app/js/keepTrackApi';
import { dateFormat } from '@app/js/lib/dateFormat';
import { getEl } from '@app/js/lib/get-el';
import { saveCsv } from '@app/js/lib/saveVariable';
import { showLoading } from '@app/js/lib/showLoading';
import { SensorMath, TearrData } from '@app/js/static/sensor-math';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
export class LookAnglesPlugin extends KeepTrackPlugin {
  isRequireSatelliteSelected: boolean = true;
  isRequireSensorSelected: boolean = true;

  bottomIconCallback: () => void = () => {
    this.refreshSideMenuData();
  };

  bottomIconElementName = 'look-angles-icon';
  bottomIconLabel = 'Look Angles';
  bottomIconImg = lookanglesPng;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 300,
    maxWidth: 450,
  };

  helpTitle = `Look Angles Menu`;
  helpBody = keepTrackApi.html`
    The Look Angles menu allows you to calculate the range, azimuth, and elevation angles between a sensor and a satellite.
    A satellite and sensor must first be selected before the menu can be used.
    <br><br>
    The toggle only rise and set times will only calculate the rise and set times of the satellite.
    This is useful for quickly determining when a satellite will be visible to a sensor.
    <br><br>
    The search range can be modified by changing the length and interval options.`;

  static PLUGIN_NAME = 'Look Angles';
  /**
   * Flag to determine if the look angles should only show rise and set times
   */
  isRiseSetLookangles = true;
  /**
   * The interval between each line of look angles
   */
  lookanglesInterval = 30;
  /**
   * The length of the look angles
   */
  lookanglesLength = 2;
  /**
   * The last look angles array
   */
  lastlooksArray: TearrData[];

  constructor() {
    super(LookAnglesPlugin.PLUGIN_NAME);
  }

  sideMenuElementName: string = 'look-angles-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
    <div id="look-angles-menu" class="side-menu-parent start-hidden text-select">
        <div id="look-angles-content" class="side-menu">
            <div class="row">
            <h5 class="center-align">Sensor Look Angles</h5>
            <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
            <div id="settings-look-angles">
                <h5 class="center-align">Look Angles Settings</h5>
                <div class="switch row">
                <label>
                    <input id="settings-riseset" type="checkbox" checked="true" />
                    <span class="lever"></span>
                    Show Only Rise and Set Times
                </label>
                </div>
                <div class="input-field col s6">
                <input id="look-angles-length" value="2" type="text" class="tooltipped" data-position="right" data-delay="50" data-tooltip="How Many Days of Look Angles Should be Calculated" />
                <label for="look-anglesLength" class="active">Length (Days)</label>
                </div>
                <div class="input-field col s6">
                <input id="look-angles-interval" value="30" type="text" class="tooltipped" data-position="right" data-delay="50" data-tooltip="Seconds Between Each Line of Look Angles" />
                <label for="look-anglesInterval" class="active">Interval</label>
                </div>
                <div class="row"></div>
            </div>
            <table id="looks" class="center-align striped-light centered"></table>
            <br />
            <center>
                <button id="export-look-angles" class="btn btn-ui waves-effect waves-light">Export &#9658;</button>
            </center>
            </div>
        </div>
    </div>`;

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      method: KeepTrackApiMethods.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('look-angles-length').addEventListener('change', () => {
          this.lookanglesLength = parseInt(<string>(<HTMLInputElement>getEl('look-angles-length')).value);
          this.refreshSideMenuData();
        });

        getEl('look-angles-interval').addEventListener('change', () => {
          this.lookanglesInterval = parseInt(<string>(<HTMLInputElement>getEl('look-angles-interval')).value);
          this.refreshSideMenuData();
        });

        getEl('export-look-angles')?.addEventListener('click', () => {
          saveCsv(this.lastlooksArray, 'Look-Angles');
        });

        getEl('settings-riseset').addEventListener('change', this.settingsRisesetChange.bind(this));
      },
    });

    keepTrackApi.register({
      method: KeepTrackApiMethods.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (sat: SatObject) => {
        if (this.isMenuButtonEnabled && (!sat?.sccNum || !keepTrackApi.getSensorManager().isSensorSelected())) {
          this.setBottomIconToDisabled();
          this.closeSideMenu();
          return;
        } else {
          this.setBottomIconToEnabled();
          if (this.isMenuButtonEnabled && sat) {
            this.getlookangles(sat);
          }
        }
      },
    });
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      method: KeepTrackApiMethods.staticOffsetChange,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        this.refreshSideMenuData();
      },
    });
  }

  refreshSideMenuData = (): void => {
    if (this.isMenuButtonEnabled) {
      showLoading(() => {
        const sat = keepTrackApi.getCatalogManager().getSat(keepTrackApi.getCatalogManager().selectedSat, GetSatType.EXTRA_ONLY);
        this.getlookangles(sat);
      });
    }
  };

  getlookangles(sat: SatObject, sensors?: SensorObject[]): TearrData[] {
    const timeManagerInstance = keepTrackApi.getTimeManager();

    if (!sensors) {
      const sensorManagerInstance = keepTrackApi.getSensorManager();

      // Error Checking
      if (!sensorManagerInstance.isSensorSelected()) {
        console.debug('satellite.getlookangles requires a sensor to be set!');
        return [];
      }
      sensors = sensorManagerInstance.currentSensors;
    }

    // Set default timing settings. These will be changed to find look angles at different times in future.

    // const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion
    // Use custom interval unless doing rise/set lookangles - then use 1 second
    let lookanglesInterval = this.isRiseSetLookangles ? 1 : this.lookanglesInterval;

    let looksArray = <TearrData[]>[];
    let offset = 0;
    for (let i = 0; i < this.lookanglesLength * 24 * 60 * 60; i += lookanglesInterval) {
      offset = i * 1000; // Offset in seconds (msec * 1000)
      let now = timeManagerInstance.getOffsetTimeObj(offset);
      let looksPass = SensorMath.getTearData(now, sat.satrec, sensors, this.isRiseSetLookangles);
      if (looksPass.time !== '') {
        looksArray.push(looksPass); // Update the table with looks for this 5 second chunk and then increase table counter by 1
      }
      if (looksArray.length >= 1500) {
        // Maximum of 1500 lines in the look angles table
        break; // No more updates to the table (Prevent GEO object slowdown)
      }
    }

    looksArray.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    this.lastlooksArray = looksArray;

    // Populate the Side Menu
    (() => {
      let tbl = <HTMLTableElement>getEl('looks'); // Identify the table to update
      tbl.innerHTML = ''; // Clear the table from old object data
      let tr = tbl.insertRow();
      let tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode('Time'));
      tdT.setAttribute('style', 'text-decoration: underline');
      let tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode('El'));
      tdE.setAttribute('style', 'text-decoration: underline');
      let tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode('Az'));
      tdA.setAttribute('style', 'text-decoration: underline');
      let tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode('Rng'));
      tdR.setAttribute('style', 'text-decoration: underline');

      for (let i = 0; i < looksArray.length; i++) {
        if (tbl.rows.length > 0) {
          const tr = tbl.insertRow();
          tr.setAttribute('class', 'link');

          tdT = tr.insertCell();
          tdT.appendChild(document.createTextNode(dateFormat(looksArray[i].time, 'isoDateTime', false)));

          // Create click listener
          tdT.addEventListener('click', () => {
            timeManagerInstance.changeStaticOffset(new Date(dateFormat(looksArray[i].time, 'isoDateTime', false) + 'z').getTime() - timeManagerInstance.realTime);
            timeManagerInstance.calculateSimulationTime();
            keepTrackApi.methods.updateDateTime(new Date(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset));
          });

          tdE = tr.insertCell();
          tdE.appendChild(document.createTextNode(looksArray[i].el.toFixed(1)));
          tdA = tr.insertCell();
          tdA.appendChild(document.createTextNode(looksArray[i].az.toFixed(0)));
          tdR = tr.insertCell();
          tdR.appendChild(document.createTextNode(looksArray[i].rng.toFixed(0)));
        }
      }
    })();

    return looksArray;
  }

  settingsRisesetChange(e: any, isRiseSetChecked?: boolean): void {
    if (typeof e === 'undefined' || e === null) throw new Error('e is undefined');

    isRiseSetChecked ??= (<HTMLInputElement>getEl('settings-riseset')).checked;
    if (isRiseSetChecked) {
      this.isRiseSetLookangles = true;
    } else {
      this.isRiseSetLookangles = false;
    }
    this.refreshSideMenuData();
  }
}

export const lookAnglesPlugin = new LookAnglesPlugin();
