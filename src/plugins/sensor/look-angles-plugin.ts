import { GetSatType, KeepTrackApiEvents, MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { dateFormat } from '@app/lib/dateFormat';
import { getEl } from '@app/lib/get-el';
import { saveCsv } from '@app/lib/saveVariable';
import { showLoading } from '@app/lib/showLoading';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { TimeManager } from '@app/singletons/time-manager';
import { SensorMath, TearrData, TearrType } from '@app/static/sensor-math';
import tableChartPng from '@public/img/icons/table-chart.png';
import { BaseObject, DetailedSatellite, DetailedSensor, SpaceObjectType } from 'ootk';
import { ClickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

type LookAngleData = TearrData & { canStationObserve: boolean };

export class LookAnglesPlugin extends KeepTrackPlugin {
  readonly id = 'LookAnglesPlugin';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

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

  isRequireSatelliteSelected = true;
  isRequireSensorSelected = true;


  bottomIconImg = tableChartPng;
  bottomIconCallback: () => void = () => {
    this.refreshSideMenuData_();
  };

  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 400,
    maxWidth: 600,
  };

  sideMenuElementName: string = 'look-angles-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
    <div class="row"></div>
    <div class="row">
      <table id="looks" class="center-align striped-light centered"></table>
    </div>`;
  sideMenuSecondaryHtml = keepTrackApi.html`
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
  sideMenuSecondaryOptions = {
    width: 300,
    zIndex: 3,
  };

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
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
      cbName: this.id,
      cb: (obj: BaseObject) => {
        this.checkIfCanBeEnabled_(obj);
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.resetSensor,
      cbName: this.id,
      cb: () => {
        this.checkIfCanBeEnabled_(null);
      },
    });
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.staticOffsetChange,
      cbName: this.id,
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

  private refreshSideMenuData_(): void {
    if (this.isMenuButtonActive) {
      showLoading(() => {
        const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

        if (!obj.isSatellite()) {
          return;
        }
        this.getlookangles_(obj as DetailedSatellite);
      });
    }
  }

  private getlookangles_(sat: DetailedSatellite, sensors?: DetailedSensor[]): TearrData[] {
    const timeManagerInstance = keepTrackApi.getTimeManager();

    if (!sensors) {
      const sensorManagerInstance = keepTrackApi.getSensorManager();

      // Error Checking
      if (!sensorManagerInstance.isSensorSelected()) {
        errorManagerInstance.debug('satellite.getlookangles requires a sensor to be set!');

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

    const looksArray = <LookAngleData[]>[];
    let offset = 0;
    let isMaxElFound = false;

    for (let i = 0; i < this.lengthOfLookAngles_ * 24 * 60 * 60; i += lookanglesInterval) {
      offset = i * 1000; // Offset in seconds (msec * 1000)
      const now = timeManagerInstance.getOffsetTimeObj(offset);
      const tearrData = SensorMath.getTearData(now, sat.satrec, sensors, this.isRiseSetOnly_, isMaxElFound);
      const canStationObserve = sensors[0].type === SpaceObjectType.OPTICAL ? SensorMath.checkIfVisibleForOptical(sat, sensors[0], now) : true;
      const looksPass = { ...tearrData, canStationObserve };

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
    this.populateSideMenuTable_(looksArray, timeManagerInstance);

    return looksArray;
  }

  private populateSideMenuTable_(lookAngleData: LookAngleData[], timeManagerInstance: TimeManager) {
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
    const tdV = tr.insertCell();

    tdV.appendChild(document.createTextNode('Visible'));
    tdV.setAttribute('style', 'text-decoration: underline');

    for (const entry of lookAngleData) {
      LookAnglesPlugin.populateSideMenuRow_({ tbl, tdT, entry, timeManagerInstance, tdE, tdA, tdR, tdType, tdV });
    }

    if (lookAngleData.length === 0) {
      const tr = tbl.insertRow();
      const td = tr.insertCell();
      const searchLength = (this.lengthOfLookAngles_ * 24).toFixed(1);

      td.colSpan = 4;
      td.appendChild(document.createTextNode(`Satellite is not visible for the next ${searchLength} hours.`));
    }
  }

  private static populateSideMenuRow_(
    { tbl, tdT, entry, timeManagerInstance, tdE, tdA, tdR, tdType, tdV }:
      {
        tbl: HTMLTableElement;
        tdT: HTMLTableCellElement;
        entry: LookAngleData;
        timeManagerInstance: TimeManager;
        tdE: HTMLTableCellElement;
        tdA: HTMLTableCellElement;
        tdR: HTMLTableCellElement;
        tdType: HTMLTableCellElement;
        tdV: HTMLTableCellElement;
      },
  ) {
    if (tbl.rows.length > 0) {
      const tr = tbl.insertRow();

      tr.setAttribute('class', 'link');

      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(entry.time, 'isoDateTime', false)));

      // Create click listener
      tr.addEventListener('click', () => {
        timeManagerInstance.changeStaticOffset(new Date(`${dateFormat(entry.time, 'isoDateTime', false)}z`).getTime() - timeManagerInstance.realTime);
        keepTrackApi.runEvent(KeepTrackApiEvents.updateDateTime, new Date(timeManagerInstance.dynamicOffsetEpoch + timeManagerInstance.staticOffset));
      });

      if (tdType) {
        tdType = tr.insertCell();
        tdType.appendChild(document.createTextNode(this.tearrTypeToString_(entry.type)));
      }

      tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode(entry.el.toFixed(1)));
      tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode(entry.az.toFixed(0)));
      tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode(entry.rng.toFixed(0)));
      tdV = tr.insertCell();
      tdV.appendChild(document.createTextNode(entry.canStationObserve ? 'Yes' : 'No'));
      if (entry.canStationObserve) {
        tdV.setAttribute('style', 'color: #2d7b31');
      } else {
        tdV.setAttribute('style', 'color: #c62828');
      }
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


  private settingsRisesetChange_(e: Event, isRiseSetChecked?: boolean): void {
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
