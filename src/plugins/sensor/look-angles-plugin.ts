import { GetSatType, KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { dateFormat } from '@app/lib/dateFormat';
import { getEl } from '@app/lib/get-el';
import { saveCsv } from '@app/lib/saveVariable';
import { showLoading } from '@app/lib/showLoading';
import { TimeManager } from '@app/singletons/time-manager';
import { SensorMath, TearrData, TearrType } from '@app/static/sensor-math';
import lookanglesPng from '@public/img/icons/lookangles.png';
import { BaseObject, DetailedSatellite, DetailedSensor } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
export class LookAnglesPlugin extends KeepTrackPlugin {
  dependencies_ = [SelectSatManager.name];
  private selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  /**
   * Flag to determine if the look angles should only show rise and set times
   */
  private isRiseSetOnly_ = true;
  /**
   * The interval between each line of look angles
   */
  private angleCalculationInterval_ = 30;
  /**
   * The length of time to calculate look angles for
   */
  private lengthOfLookAngles_ = 2;

  /**
   * The last look angles array
   */
  private lastlooksArray_: TearrData[];

  isRequireSatelliteSelected: boolean = true;
  isRequireSensorSelected: boolean = true;

  bottomIconElementName = 'look-angles-icon';
  bottomIconLabel = 'Look Angles';
  bottomIconImg = lookanglesPng;
  bottomIconCallback: () => void = () => {
    this.refreshSideMenuData_();
  };

  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 400,
    maxWidth: 600,
  };

  helpTitle = 'Look Angles Menu';
  helpBody = keepTrackApi.html`
    The Look Angles menu allows you to calculate the range, azimuth, and elevation angles between a sensor and a satellite.
    A satellite and sensor must first be selected before the menu can be used.
    <br><br>
    The toggle only rise and set times will only calculate the rise and set times of the satellite.
    This is useful for quickly determining when a satellite will be visible to a sensor.
    <br><br>
    The search range can be modified by changing the length and interval options.`;

  sideMenuElementName: string = 'look-angles-menu';
  sideMenuTitle: string = 'Sensor Look Angles';
  sideMenuElementHtml: string = keepTrackApi.html`
    <div class="row"></div>
    <div class="row">
      <table id="looks" class="center-align striped-light centered"></table>
    </div>`;
  sideMenuSettingsHtml = keepTrackApi.html`
    <div class="switch row">
        <label>
            <input id="settings-riseset" type="checkbox" checked="true" />
            <span class="lever"></span>
            Show Only Rise and Set Times
        </label>
    </div>
    <div class="row">
      <div class="input-field col s12">
          <input id="look-angles-length" value="2" type="text" data-position="bottom" data-delay="50" data-tooltip="How Many Days of Look Angles Should be Calculated"
            style="text-align: center;"
          />
          <label for="look-anglesLength" class="active">Calculation Length (Days)</label>
      </div>
    </div>
    <div class="row">
      <div class="input-field col s12">
          <input id="look-angles-interval" value="30" type="text" data-position="bottom" data-delay="50" data-tooltip="Seconds Between Each Line of Look Angles"
            style="text-align: center;"
          />
          <label for="look-anglesInterval" class="active">Interval (Seconds)</label>
      </div>
    </div>`;
  downloadIconCb = () => {
    const sensor = keepTrackApi.getSensorManager().getSensor();

    // Prepare lastlooksArray_ for CSV
    const csvData = this.lastlooksArray_.map((look) => ({
      Time: dateFormat(look.time, 'isoDateTime', false),
      Type: LookAnglesPlugin.tearrTypeToString_(look.type),
      Azimuth: look.az.toFixed(1),
      Elevation: look.el.toFixed(1),
      Range: look.rng.toFixed(0),
      Sensor: sensor.system ? `${sensor.system} (${sensor.name})` : sensor.name,
    }));

    saveCsv(csvData, `${sensor.shortName ?? sensor.objName ?? 'unk'}-${(this.selectSatManager_.getSelectedSat() as DetailedSatellite).sccNum6}-look-angles`);
  };
  sideMenuSettingsOptions = {
    width: 300,
    zIndex: 3,
  };

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.constructor.name,
      cb: () => {
        getEl('look-angles-length').addEventListener('change', () => {
          this.lengthOfLookAngles_ = parseFloat((<HTMLInputElement>getEl('look-angles-length')).value);
          this.refreshSideMenuData_();
        });

        getEl('look-angles-interval').addEventListener('change', () => {
          this.angleCalculationInterval_ = parseInt((<HTMLInputElement>getEl('look-angles-interval')).value);
          this.refreshSideMenuData_();
        });

        getEl('settings-riseset').addEventListener('change', this.settingsRisesetChange_.bind(this));

        const sat = this.selectSatManager_.getSelectedSat();

        this.checkIfCanBeEnabled_(sat);
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.constructor.name,
      cb: (obj: BaseObject) => {
        this.checkIfCanBeEnabled_(obj);
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.resetSensor,
      cbName: this.constructor.name,
      cb: () => {
        this.checkIfCanBeEnabled_(null);
      },
    });
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.staticOffsetChange,
      cbName: this.constructor.name,
      cb: () => {
        this.refreshSideMenuData_();
      },
    });
  }

  private checkIfCanBeEnabled_(obj: BaseObject) {
    if (obj?.isSatellite() && keepTrackApi.getSensorManager().isSensorSelected()) {
      this.setBottomIconToEnabled();
      if (this.isMenuButtonActive && obj) {
        this.getlookangles_(obj as DetailedSatellite);
      }
    } else {
      if (this.isMenuButtonActive) {
        this.closeSideMenu();
      }
      this.setBottomIconToDisabled();
    }
  }

  private refreshSideMenuData_ = (): void => {
    if (this.isMenuButtonActive) {
      showLoading(() => {
        const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

        if (!obj.isSatellite()) {
          return;
        }
        this.getlookangles_(obj as DetailedSatellite);
      });
    }
  };

  private getlookangles_(sat: DetailedSatellite, sensors?: DetailedSensor[]): TearrData[] {
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

    /*
     * const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion
     * Use custom interval unless doing rise/set lookangles - then use 1 second
     */
    const lookanglesInterval = this.isRiseSetOnly_ ? 1 : this.angleCalculationInterval_;

    const looksArray = <TearrData[]>[];
    let offset = 0;
    let isMaxElFound = false;

    for (let i = 0; i < this.lengthOfLookAngles_ * 24 * 60 * 60; i += lookanglesInterval) {
      offset = i * 1000; // Offset in seconds (msec * 1000)
      const now = timeManagerInstance.getOffsetTimeObj(offset);
      const looksPass = SensorMath.getTearData(now, sat.satrec, sensors, this.isRiseSetOnly_, isMaxElFound);

      if (looksPass.time !== '') {
        // Update the table with looks for this 5 second chunk and then increase table counter by 1
        switch (looksPass.type) {
          case TearrType.RISE:
          case TearrType.SET:
            isMaxElFound = false;
            looksArray.push(looksPass);
            break;
          case TearrType.MAX_EL:
            isMaxElFound = true;
            looksArray.push(looksPass);
            break;
          case TearrType.RISE_AND_MAX_EL:
            isMaxElFound = true;
            looksArray.push({ ...looksPass, type: TearrType.RISE });
            looksArray.push({ ...looksPass, type: TearrType.MAX_EL });
            break;
          case TearrType.MAX_EL_AND_SET:
            isMaxElFound = false;
            looksArray.push({ ...looksPass, type: TearrType.MAX_EL });
            looksArray.push({ ...looksPass, type: TearrType.SET });
            break;
          default:
            looksArray.push(looksPass);
            break;
        }
      }
      if (looksArray.length >= 1500) {
        // Maximum of 1500 lines in the look angles table
        break; // No more updates to the table (Prevent GEO object slowdown)
      }
    }

    looksArray.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    this.lastlooksArray_ = looksArray;

    // Populate the Side Menu
    LookAnglesPlugin.populateSideMenuTable_(looksArray, timeManagerInstance);

    return looksArray;
  }

  private static populateSideMenuTable_(lookAngleData: TearrData[], timeManagerInstance: TimeManager) {
    const tbl = <HTMLTableElement>getEl('looks'); // Identify the table to update

    tbl.innerHTML = ''; // Clear the table from old object data
    const tr = tbl.insertRow();
    const tdT = tr.insertCell();

    tdT.appendChild(document.createTextNode('Time'));
    tdT.setAttribute('style', 'text-decoration: underline');

    // If isRiseSetOnly is true, add a column for type
    let tdType = null;

    if (lookAngleData.length > 0 && typeof lookAngleData[0].type !== 'undefined') {
      tdType = tr.insertCell();

      tdType.appendChild(document.createTextNode('Type'));
      tdType.setAttribute('style', 'text-decoration: underline');
    }

    const tdE = tr.insertCell();

    tdE.appendChild(document.createTextNode('El'));
    tdE.setAttribute('style', 'text-decoration: underline');
    const tdA = tr.insertCell();

    tdA.appendChild(document.createTextNode('Az'));
    tdA.setAttribute('style', 'text-decoration: underline');
    const tdR = tr.insertCell();

    tdR.appendChild(document.createTextNode('Rng'));
    tdR.setAttribute('style', 'text-decoration: underline');

    for (const lookAngleRow of lookAngleData) {
      LookAnglesPlugin.populateSideMenuRow_(tbl, tdT, lookAngleRow, timeManagerInstance, tdE, tdA, tdR, tdType);
    }
  }

  private static populateSideMenuRow_(
    tbl: HTMLTableElement,
    tdT: HTMLTableCellElement,
    lookAngleRow: TearrData,
    timeManagerInstance: TimeManager,
    tdE: HTMLTableCellElement,
    tdA: HTMLTableCellElement,
    tdR: HTMLTableCellElement,
    tdType: HTMLTableCellElement,
  ) {
    if (tbl.rows.length > 0) {
      const tr = tbl.insertRow();

      tr.setAttribute('class', 'link');

      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(lookAngleRow.time, 'isoDateTime', false)));

      // Create click listener
      tdT.addEventListener('click', () => {
        timeManagerInstance.changeStaticOffset(new Date(`${dateFormat(lookAngleRow.time, 'isoDateTime', false)}z`).getTime() - timeManagerInstance.realTime);
        timeManagerInstance.calculateSimulationTime();
        keepTrackApi.runEvent(KeepTrackApiEvents.updateDateTime, new Date(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset));
      });

      if (tdType) {
        tdType = tr.insertCell();
        tdType.appendChild(document.createTextNode(this.tearrTypeToString_(lookAngleRow.type)));
      }

      tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode(lookAngleRow.el.toFixed(1)));
      tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode(lookAngleRow.az.toFixed(0)));
      tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode(lookAngleRow.rng.toFixed(0)));
    }
  }

  private static tearrTypeToString_(type: TearrType): string {
    switch (type) {
      case TearrType.RISE:
        return 'Rise';
      case TearrType.SET:
        return 'Set';
      case TearrType.MAX_EL:
        return 'Max El';
      default:
        return 'Unknown';
    }
  }


  private settingsRisesetChange_(e: any, isRiseSetChecked?: boolean): void {
    if (typeof e === 'undefined' || e === null) {
      throw new Error('e is undefined');
    }

    isRiseSetChecked ??= (<HTMLInputElement>getEl('settings-riseset')).checked;
    if (isRiseSetChecked) {
      this.isRiseSetOnly_ = true;
    } else {
      this.isRiseSetOnly_ = false;
    }
    this.refreshSideMenuData_();
  }
}
