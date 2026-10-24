import { OemSatellite } from '@app/app/objects/oem-satellite';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SensorMath, TearrData, TearrType } from '@app/app/sensors/sensor-math';
import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { dateFormat } from '@app/engine/utils/dateFormat';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite, SpaceObjectType } from '@ootk/src/main';
import tableChartPng from '@public/img/icons/table-chart.png';
import { ClickDragOptions, fileExcelPng, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './look-angles.css';

type LookAngleData = TearrData & { canStationObserve: boolean };

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.LookAnglesPlugin.${key}` as Parameters<typeof t7e>[0]);

/**
 * Compact UTC stamp (`YYYYMMDDTHHMMSSZ`) for export file names, built from a look-angle
 * `time` string (`yyyy-mm-dd HH:MM:ss`, already UTC). Returns '' when the input has no full date.
 */
export const compactUtcStamp = (time: string | undefined): string => {
  const digits = (time ?? '').replace(/\D/gu, '').slice(0, 14);

  if (digits.length < 14) {
    return '';
  }

  return `${digits.slice(0, 8)}T${digits.slice(8, 14)}Z`;
};

/** Makes a string safe for a download file name (no spaces, slashes or parentheses). */
export const fileSafeName = (name: string): string =>
  name
    .replace(/[^\w.-]+/gu, '_')
    .replace(/_+/gu, '_')
    .replace(/^_|_$/gu, '');

/** Rounds to a fixed number of decimals and keeps the value numeric, so XLSX writes a number cell. */
export const roundOrNull = (value: number | null | undefined, decimals: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(decimals)) : null;

export class LookAnglesPlugin extends KeepTrackPlugin {
  readonly id = 'LookAnglesPlugin';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  menuMode: MenuMode[] = [MenuMode.SENSORS, MenuMode.ALL];

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
    minWidth: 500,
    maxWidth: 800,
  };

  sideMenuElementName: string = 'look-angles-menu';
  sideMenuElementHtml: string = html`
    <section class="kt-section">
      <div class="kt-section-label">${l('sections.results')}</div>
      <table id="looks" class="la-table center-align"></table>
    </section>`;
  sideMenuSecondaryHtml = html`
    <section class="kt-section">
      <div class="kt-section-label">${l('sections.settings')}</div>
      <div class="switch la-switch-row">
          <label>
              <input id="settings-riseset" type="checkbox" checked="true" />
              <span class="lever"></span>
              ${l('settings.showRiseSetOnly')}
          </label>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
            <input id="look-angles-length" value="2" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('settings.calculationLengthTooltip')}" />
            <label for="look-angles-length" class="active">${l('settings.calculationLength')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
            <input id="look-angles-interval" value="30" type="text" data-position="bottom" data-delay="50" data-tooltip="${l('settings.intervalTooltip')}" />
            <label for="look-angles-interval" class="active">${l('settings.interval')}</label>
        </div>
      </div>
    </section>`;
  downloadIconSrc = fileExcelPng;
  downloadIconCb = () => {
    const sensor = ServiceLocator.getSensorManager().getSensor();

    if (!this.lastlooksArray_) {
      this.refreshSideMenuData_();
    }

    if (!this.lastlooksArray_) {
      errorManagerInstance.warn(l('msgs.noLookAnglesToDownload'));

      return;
    }

    // Prepare lastlooksArray_ for CSV
    let sensorDisplayName: string;

    if (sensor) {
      if (sensor.system) {
        sensorDisplayName = `${sensor.system} (${sensor.name})`;
      } else {
        sensorDisplayName = sensor.name;
      }
    } else {
      sensorDisplayName = 'Unknown Sensor';
    }

    const lookAnglesSat = this.selectSatManager_.getSelectedSat() as Satellite;

    saveXlsx(
      LookAnglesPlugin.buildExportRows_(this.lastlooksArray_, sensorDisplayName),
      LookAnglesPlugin.buildExportFileName_(sensorDisplayName, `${lookAnglesSat.sccNum6 ?? lookAnglesSat.sccNum}`, this.lastlooksArray_[0]?.time)
    );
  };

  /** Export rows. Numeric columns stay numbers (not toFixed strings) so the XLSX has number cells. */
  private static buildExportRows_(looks: TearrData[], sensorDisplayName: string): Record<string, string | number | null>[] {
    return looks.map((look) => ({
      Time: dateFormat(look.time, 'isoDateTime', false),
      Type: LookAnglesPlugin.tearrTypeToString_(look.type),
      Azimuth: roundOrNull(look.az, 1),
      Elevation: roundOrNull(look.el, 1),
      Range: roundOrNull(look.rng, 1),
      Sensor: sensorDisplayName,
    }));
  }

  /**
   * File name for a look-angles export: sensor, object, and the UTC start time of the first
   * row, so successive pass exports for the same object no longer overwrite each other.
   */
  private static buildExportFileName_(sensorName: string, objId: string, firstTime: string | undefined): string {
    const stamp = compactUtcStamp(firstTime);
    const parts = [fileSafeName(sensorName) || 'unk', fileSafeName(objId) || 'unk'];

    if (stamp) {
      parts.push(stamp);
    }
    parts.push('look-angles');

    return parts.join('-');
  }
  sideMenuSecondaryOptions = {
    width: 300,
    zIndex: 3,
  };

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/look-angles/look-angles-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.readingHeading'),
          content: l('help.reading'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2')],
    };
  }

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      getEl('look-angles-menu')?.classList.add('kt-ui-v13');
      getEl('look-angles-menu-secondary')?.classList.add('kt-ui-v13');

      getEl('look-angles-length')!.addEventListener('change', () => {
        this.lengthOfLookAngles_ = parseFloat((<HTMLInputElement>getEl('look-angles-length')).value);
        this.refreshSideMenuData_();
      });

      getEl('look-angles-interval')!.addEventListener('change', () => {
        this.angleCalculationInterval_ = parseInt((<HTMLInputElement>getEl('look-angles-interval')).value);
        this.refreshSideMenuData_();
      });

      getEl('settings-riseset')!.addEventListener('change', this.settingsRisesetChange_.bind(this));

      const sat = this.selectSatManager_.getSelectedSat();

      this.checkIfCanBeEnabled_(sat);
    });

    EventBus.getInstance().on(EventBusEvent.selectSatData, (obj: BaseObject) => {
      this.checkIfCanBeEnabled_(obj);
    });

    EventBus.getInstance().on(EventBusEvent.resetSensor, () => {
      this.checkIfCanBeEnabled_(null);
    });
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(EventBusEvent.staticOffsetChange, () => {
      this.refreshSideMenuData_();
    });
  }

  private checkIfCanBeEnabled_(obj: BaseObject | null) {
    if (obj?.isSatellite() && ServiceLocator.getSensorManager().isSensorSelected()) {
      this.setBottomIconToEnabled();
      if (this.isMenuButtonActive && obj) {
        this.getlookangles_(obj as Satellite);
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
        this.getlookangles_(obj as Satellite);
      });
    }
  }

  private getlookangles_(sat: Satellite, sensors?: DetailedSensor[]): TearrData[] {
    const timeManagerInstance = ServiceLocator.getTimeManager();

    if (!sensors) {
      const sensorManagerInstance = ServiceLocator.getSensorManager();

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

    const isOemSat = sat instanceof OemSatellite;

    // Cap loop to OEM ephemeris end time so we don't propagate beyond available data
    const maxSeconds = isOemSat
      ? Math.max(0, ((sat as unknown as OemSatellite).header.STOP_TIME.getTime() - timeManagerInstance.simulationTimeObj.getTime()) / 1000)
      : this.lengthOfLookAngles_ * 24 * 60 * 60;

    const looksArray = <LookAngleData[]>[];
    let offset = 0;
    let isMaxElFound = false;

    for (let i = 0; i < maxSeconds; i += lookanglesInterval) {
      offset = i * 1000; // Offset in seconds (msec * 1000)
      const now = timeManagerInstance.getOffsetTimeObj(offset);
      const tearrData = isOemSat
        ? (sat as unknown as OemSatellite).getTearData(now, sensors, this.isRiseSetOnly_, isMaxElFound)
        : SensorMath.getTearData(now, sat.satrec, sensors, this.isRiseSetOnly_, isMaxElFound);
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
            // The mask flag belongs to the rise edge only
            looksArray.push({ ...looksPass, type: TearrType.MAX_EL, maskLimited: false });
            break;
          case TearrType.MAX_EL_AND_SET:
            isMaxElFound = false;
            looksArray.push({ ...looksPass, type: TearrType.MAX_EL, maskLimited: false });
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

    tr.classList.add('la-table-header');
    const tdT = tr.insertCell();

    tdT.appendChild(document.createTextNode(l('table.time')));

    // Type column: Rise/Set/Max El in rise-set mode, "In View" for every sample otherwise
    const tdType: HTMLTableCellElement = tr.insertCell();

    tdType.appendChild(document.createTextNode(l('table.type')));

    const tdE = tr.insertCell();

    tdE.appendChild(document.createTextNode(l('table.el')));
    const tdA = tr.insertCell();

    tdA.appendChild(document.createTextNode(l('table.az')));
    const tdR = tr.insertCell();

    tdR.appendChild(document.createTextNode(l('table.rng')));
    const tdV = tr.insertCell();

    tdV.appendChild(document.createTextNode(l('table.visible')));

    for (const entry of lookAngleData) {
      LookAnglesPlugin.populateSideMenuRow_({ tbl, tdT, entry, timeManagerInstance, tdE, tdA, tdR, tdType, tdV });
    }

    if (lookAngleData.length === 0) {
      const tr = tbl.insertRow();
      const td = tr.insertCell();
      const searchLength = (this.lengthOfLookAngles_ * 24).toFixed(1);

      td.colSpan = 6;
      td.appendChild(document.createTextNode(l('msgs.notVisible').replace('{hours}', searchLength)));
    }
  }

  private static populateSideMenuRow_({
    tbl,
    tdT,
    entry,
    timeManagerInstance,
    tdE,
    tdA,
    tdR,
    tdType,
    tdV,
  }: {
    tbl: HTMLTableElement;
    tdT: HTMLTableCellElement;
    entry: LookAngleData;
    timeManagerInstance: TimeManager;
    tdE: HTMLTableCellElement;
    tdA: HTMLTableCellElement;
    tdR: HTMLTableCellElement;
    tdType: HTMLTableCellElement;
    tdV: HTMLTableCellElement;
  }) {
    if (tbl.rows.length > 0) {
      const tr = tbl.insertRow();

      tr.setAttribute('class', 'link');

      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(entry.time, 'isoDateTime', false)));

      // Create click listener
      tr.addEventListener('click', () => {
        timeManagerInstance.changeStaticOffset(new Date(`${dateFormat(entry.time, 'isoDateTime', false)}z`).getTime() - timeManagerInstance.realTime);
      });

      if (tdType) {
        tdType = tr.insertCell();
        tdType.appendChild(document.createTextNode(this.tearrTypeToString_(entry.type)));
        if (entry.maskLimited) {
          tdType.appendChild(LookAnglesPlugin.createMaskMarker_());
        }
      }

      tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode(entry.el?.toFixed(1) ?? 'Unknown'));
      tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode(entry.az?.toFixed(0) ?? 'Unknown'));
      tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode(entry.rng?.toFixed(0) ?? 'Unknown'));
      tdV = tr.insertCell();
      tdV.appendChild(document.createTextNode(entry.canStationObserve ? l('msgs.yes') : l('msgs.no')));
      if (entry.canStationObserve) {
        tdV.setAttribute('style', 'color: #2d7b31');
      } else {
        tdV.setAttribute('style', 'color: #c62828');
      }
    }
  }

  /** Small "mask" tag on a rise/set row whose edge was set by the horizon mask. */
  private static createMaskMarker_(): HTMLSpanElement {
    const marker = document.createElement('span');

    marker.className = 'la-mask-limited';
    marker.title = l('maskLimitedTitle');
    marker.textContent = l('maskLimited');

    return marker;
  }

  /**
   * Label for a row's pass type. Rows without a type come from the full (not rise/set only)
   * table, where every emitted sample is inside the sensor's field of view: label them "In View".
   */
  private static tearrTypeToString_(type?: TearrType): string {
    if (typeof type === 'undefined') {
      return l('msgs.inView');
    }

    switch (type) {
      case TearrType.RISE:
        return l('msgs.rise');
      case TearrType.SET:
        return l('msgs.set');
      case TearrType.MAX_EL:
        return l('msgs.maxEl');
      case TearrType.UNKNOWN:
      default:
        return l('msgs.unknown');
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
