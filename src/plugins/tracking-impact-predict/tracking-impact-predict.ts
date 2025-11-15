import { errorManagerInstance } from '@app/engine/utils/errorManager';
import sputnickPng from '@public/img/icons/sputnick.png';
import './tracking-impact-predict.css';

import { SatMath } from '@app/app/analysis/sat-math';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { RAD2DEG } from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

export interface TipMsg {
  NORAD_CAT_ID: string;
  MSG_EPOCH: string;
  INSERT_EPOCH: string;
  DECAY_EPOCH: string;
  WINDOW: string;
  REV: string;
  DIRECTION: string;
  LAT: string;
  LON: string;
  INCL: string;
  NEXT_REPORT: string;
  ID: string;
  HIGH_INTEREST: string;
  OBJECT_NUMBER: string;
}

export class TrackingImpactPredict extends KeepTrackPlugin {
  readonly id = 'TrackingImpactPredict';
  dependencies_ = [];
  private readonly tipDataSrc = 'https://r2.keeptrack.space/spacetrack-tip.json';
  private selectSatIdOnCruncher_: number | null = null;
  private tipList_ = <TipMsg[]>[];

  bottomIconImg = sputnickPng;
  sideMenuElementName: string = 'tip-menu';
  sideMenuElementHtml = html`
  <div id="tip-menu" class="side-menu-parent start-hidden text-select">
    <div id="tip-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Recent and Upcoming Reentry Predictions</h5>
        <table id="tip-table" class="center-align"></table>
        <sub class="center-align">*Tracking and Impact Prediction (TIP) messages provided by the US Space Command (USSPACECOM).</sub>
      </div>
    </div>
  </div>`;

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 1200,
    maxWidth: 1500,
  };

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      this.parsetipData_();
    }
  };

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      this.uiManagerFinal_.bind(this),
    );

    EventBus.getInstance().on(
      EventBusEvent.onCruncherMessage,
      () => {
        if (this.selectSatIdOnCruncher_ !== null) {
          // If selectedSatManager is loaded, set the selected sat to the one that was just added
          PluginRegistry.getPlugin(SelectSatManager)?.selectSat(this.selectSatIdOnCruncher_);

          this.selectSatIdOnCruncher_ = null;
        }
      },
    );
  }

  private uiManagerFinal_() {
    getEl(this.sideMenuElementName)!.addEventListener('click', (evt: Event) => {
      const el = (<HTMLElement>evt.target)?.parentElement;

      if (!el?.classList.contains('tip-object')) {
        return;
      }

      showLoading(() => {
        // Might be better code for this.
        const hiddenRow = el.dataset?.row ?? null;

        if (hiddenRow !== null) {
          this.eventClicked_(parseInt(hiddenRow));
        }
      });
    });
  }

  private parsetipData_() {
    if (this.tipList_.length === 0) {
      // Only generate the table if receiving the -1 argument for the first time
      fetch(this.tipDataSrc)
        .then((response) => response.json())
        .then((tipList: TipMsg[]) => {
          this.setTipList_(tipList);
          this.createTable_();

          if (this.tipList_.length === 0) {
            errorManagerInstance.warn('No tip data found!');
          }
        })
        .catch(() => {
          errorManagerInstance.warn('Error fetching reentry data!');
        });
    }
  }

  // sort by MSG_EPOCH and then keep only the newest for each NORAD_CAT_ID
  private setTipList_(tipList: TipMsg[]) {
    this.tipList_ = tipList;
    this.tipList_.sort((a, b) => new Date(b.MSG_EPOCH).getTime() - new Date(a.MSG_EPOCH).getTime());
    this.tipList_ = this.tipList_.filter((v, i, a) => a.findIndex((t) => t.NORAD_CAT_ID === v.NORAD_CAT_ID) === i);
    this.tipList_.sort((a, b) => new Date(b.DECAY_EPOCH).getTime() - new Date(a.DECAY_EPOCH).getTime());
  }

  private eventClicked_(row: number) {
    // Check if the selected satellite is still in orbit
    const sat = ServiceLocator.getCatalogManager().sccNum2Sat(parseInt(this.tipList_[row].NORAD_CAT_ID));

    if (!sat) {
      ServiceLocator.getUiManager().toast('Satellite appears to have decayed!', ToastMsgType.caution);

      return;
    }

    const now = new Date();
    const decayEpoch = new Date(
      Date.UTC(
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(0, 4)), // year
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(5, 7)) - 1, // month (0-based)
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(8, 10)), // day
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(11, 13)), // hour
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(14, 16)), // minute
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(17, 19)), // second
      ),
    );

    ServiceLocator.getTimeManager().changeStaticOffset(decayEpoch.getTime() - now.getTime());
    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

    ServiceLocator.getUiManager().doSearch(`${sat.sccNum5}`);

    this.selectSatIdOnCruncher_ = sat.id;
  }

  private createTable_(): void {
    try {
      const tbl = <HTMLTableElement>getEl('tip-table'); // Identify the table to update

      tbl.innerHTML = ''; // Clear the table from old object data
      tbl.classList.add('centered');

      TrackingImpactPredict.createHeaders_(tbl);

      this.createBody_(tbl);
    } catch {
      errorManagerInstance.warn('Error processing reentry data!');
    }
  }

  private createBody_(tbl: HTMLTableElement) {
    for (let i = 0; i < this.tipList_.length; i++) {
      this.createRow_(tbl, i);
    }
  }

  private static createHeaders_(tbl: HTMLTableElement) {
    const tr = tbl.insertRow();
    const names = [
      'NORAD',
      'Decay Date',
      'Latitude',
      'Longitude',
      'Window (min)',
      'Next Report (hrs)',
      'Reentry Angle (deg)',
      'RCS (m^2)',
      'GP Age (hrs)',
      'Dry Mass (kg)',
      'Volume (m^3)',
    ];

    for (const name of names) {
      const column = tr.insertCell();

      column.appendChild(document.createTextNode(name));
      column.setAttribute('style', 'text-decoration: underline');
      column.setAttribute('class', 'center');
    }
  }

  private createRow_(tbl: HTMLTableElement, i: number): HTMLTableRowElement {
    // Create a new row
    const tr = tbl.insertRow();

    tr.setAttribute('class', 'tip-object link');
    tr.setAttribute('data-row', i.toString());

    const sat = ServiceLocator.getCatalogManager().sccNum2Sat(parseInt(this.tipList_[i].NORAD_CAT_ID));
    let rcs = 'Reentered';
    let age = 'Reentered';
    let volume = 'Reentered';
    let gammaDegrees = 'Reentered';

    if (sat) {
      // Get Flight path angle at terminal point
      const decayEpochDate = new Date(this.tipList_[i].DECAY_EPOCH);
      let nu: number | null = null;

      try {
        nu = sat.toClassicalElements(decayEpochDate)?.trueAnomaly;
      } catch {
        // This is expected to fail for some satellites since they are rentries
      }

      if (nu !== null) {
        const sinNu = Math.sin(nu);
        const gamma = Math.atan((sat.eccentricity * sinNu) / (1 + sat.eccentricity * Math.cos(nu)));

        gammaDegrees = `${Math.abs(gamma * RAD2DEG).toFixed(2)}°`;
      } else {
        gammaDegrees = 'Unknown';
      }

      if (sat?.rcs) {
        rcs = `${sat.rcs}`;
      } else {
        const rcsEst = SatMath.estimateRcsUsingHistoricalData(sat);

        rcs = rcsEst ? `${rcsEst.toFixed(2)}` : 'Unknown';
      }

      age = sat ? `${sat.ageOfElset(new Date(), 'hours').toFixed(2)}` : 'Unknown';

      // remove any non-numeric characters from the length, diameter, and span
      const span = sat?.span ? parseFloat(sat.span.replace(/[^0-9.]/gu, '')) : -1;
      const length = sat?.length ? parseFloat(sat.length.replace(/[^0-9.]/gu, '')) : -1;
      const diameter = sat?.diameter ? parseFloat(sat.diameter.replace(/[^0-9.]/gu, '')) : -1;

      volume = span !== -1 && length !== -1 && diameter !== -1 ? `${((Math.PI / 6) * span * length * diameter).toFixed(2)}` : 'Unknown';
    }

    // Populate the table with the data
    TrackingImpactPredict.createCell_(tr, this.tipList_[i].NORAD_CAT_ID);
    TrackingImpactPredict.createCell_(tr, this.tipList_[i].DECAY_EPOCH);
    TrackingImpactPredict.createCell_(tr, this.lat2degrees_(this.tipList_[i].LAT));
    TrackingImpactPredict.createCell_(tr, this.lon2degrees_(this.tipList_[i].LON));
    TrackingImpactPredict.createCell_(tr, this.tipList_[i].WINDOW);
    TrackingImpactPredict.createCell_(tr, this.tipList_[i].NEXT_REPORT);
    TrackingImpactPredict.createCell_(tr, gammaDegrees);
    TrackingImpactPredict.createCell_(tr, rcs);
    TrackingImpactPredict.createCell_(tr, age);
    TrackingImpactPredict.createCell_(tr, sat?.dryMass ?? 'Reentered');
    TrackingImpactPredict.createCell_(tr, volume);

    return tr;
  }

  private lon2degrees_(lon: string): string {
    // Convert longitude from 0-360 to -180-180 and add E or W
    let lonDeg = parseFloat(lon);
    let direction = 'E';

    if (lonDeg > 180) {
      lonDeg -= 360;
    }

    if (lonDeg < 0) {
      direction = 'W';
      lonDeg = Math.abs(lonDeg);
    }

    return `${lonDeg.toFixed(2)}° ${direction}`;
  }

  private lat2degrees_(lat: string): string {
    // Add N or S to latitude
    let latDeg = parseFloat(lat);
    let direction = 'N';

    if (latDeg < 0) {
      direction = 'S';
      latDeg = Math.abs(latDeg);
    }

    return `${latDeg.toFixed(2)}° ${direction}`;
  }

  private static createCell_(tr: HTMLTableRowElement, text: string): void {
    const cell = tr.insertCell();

    cell.appendChild(document.createTextNode(text));
  }
}
