import { errorManagerInstance } from '@app/singletons/errorManager';
import sputnickPng from '@public/img/icons/sputnick.png';
import './tracking-impact-predict.css';

import { KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { getEl } from '@app/lib/get-el';
import { showLoading } from '@app/lib/showLoading';
import { keepTrackApi } from '../../keepTrackApi';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export interface TipMsg {
  'NORAD_CAT_ID': string,
  'MSG_EPOCH': string,
  'INSERT_EPOCH': string,
  'DECAY_EPOCH': string,
  'WINDOW': string,
  'REV': string,
  'DIRECTION': string,
  'LAT': string,
  'LON': string,
  'INCL': string,
  'NEXT_REPORT': string,
  'ID': string,
  'HIGH_INTEREST': string,
  'OBJECT_NUMBER': string,
}

export class TrackingImpactPredict extends KeepTrackPlugin {
  readonly id = 'TrackingImpactPredict';
  dependencies_ = [];
  private readonly tipDataSrc = './data/tip.json';
  private selectSatIdOnCruncher_: number | null = null;
  private tipList_ = <TipMsg[]>[];

  bottomIconImg = sputnickPng;
  sideMenuElementName: string = 'tip-menu';
  sideMenuElementHtml = keepTrackApi.html`
  <div id="tip-menu" class="side-menu-parent start-hidden text-select">
    <div id="tip-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Tracking and Impact Messages</h5>
        <table id="tip-table" class="center-align"></table>
      </div>
    </div>
  </div>`;

  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 700,
    maxWidth: 850,
  };

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      this.parsetipData_();
    }
  };

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: this.uiManagerFinal_.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.onCruncherMessage,
      cbName: this.id,
      cb: () => {
        if (this.selectSatIdOnCruncher_ !== null) {
          // If selectedSatManager is loaded, set the selected sat to the one that was just added
          keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.selectSatIdOnCruncher_);

          this.selectSatIdOnCruncher_ = null;
        }
      },
    });
  }

  private uiManagerFinal_() {
    getEl(this.sideMenuElementName).addEventListener('click', (evt: any) => {
      showLoading(() => {
        const el = <HTMLElement>evt.target.parentElement;

        if (!el.classList.contains('tip-object')) {
          return;
        }
        // Might be better code for this.
        const hiddenRow = el.dataset?.row;

        if (hiddenRow !== null) {
          this.eventClicked_(parseInt(hiddenRow));
        }
      });
    });
  }

  private parsetipData_() {
    if (this.tipList_.length === 0) {
      // Only generate the table if receiving the -1 argument for the first time
      fetch(this.tipDataSrc).then((response) => {
        response.json().then((tipList: TipMsg[]) => {
          this.setTipList_(tipList);


          this.createTable_();

          if (this.tipList_.length === 0) {
            errorManagerInstance.warn('No tip data found!');
          }
        });
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
    const sat = keepTrackApi.getCatalogManager().sccNum2Sat(parseInt(this.tipList_[row].NORAD_CAT_ID));

    if (!sat) {
      keepTrackApi.getUiManager().toast('Satellite appears to have decayed!', ToastMsgType.caution);

      return;
    }


    const now = new Date();

    const decayEpoch = new Date(Date.UTC(
      parseInt(this.tipList_[row].DECAY_EPOCH.substring(0, 4)), // year
      parseInt(this.tipList_[row].DECAY_EPOCH.substring(5, 7)) - 1, // month (0-based)
      parseInt(this.tipList_[row].DECAY_EPOCH.substring(8, 10)), // day
      parseInt(this.tipList_[row].DECAY_EPOCH.substring(11, 13)), // hour
      parseInt(this.tipList_[row].DECAY_EPOCH.substring(14, 16)), // minute
      parseInt(this.tipList_[row].DECAY_EPOCH.substring(17, 19)), // second
    ));

    keepTrackApi.getTimeManager().changeStaticOffset(decayEpoch.getTime() - now.getTime());
    keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false;


    keepTrackApi.getUiManager().doSearch(`${sat.sccNum5}`);

    this.selectSatIdOnCruncher_ = sat.id;
  }

  private createTable_(): void {
    try {
      const tbl = <HTMLTableElement>getEl('tip-table'); // Identify the table to update

      tbl.innerHTML = ''; // Clear the table from old object data

      TrackingImpactPredict.createHeaders_(tbl);

      this.createBody_(tbl);
    } catch (e) {
      errorManagerInstance.warn('Error processing SOCRATES data!');
    }
  }

  private createBody_(tbl: HTMLTableElement) {
    for (let i = 0; i < this.tipList_.length; i++) {
      this.createRow_(tbl, i);
    }
  }

  private static createHeaders_(tbl: HTMLTableElement) {
    const tr = tbl.insertRow();
    const names = ['NORAD', 'Decay Date', 'Latitude', 'Longitude', 'Window (min)', 'Next Report', 'High Interest?'];

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

    // Populate the table with the data
    TrackingImpactPredict.createCell_(tr, this.tipList_[i].NORAD_CAT_ID);
    TrackingImpactPredict.createCell_(tr, this.tipList_[i].DECAY_EPOCH);
    TrackingImpactPredict.createCell_(tr, this.tipList_[i].LAT);
    TrackingImpactPredict.createCell_(tr, this.tipList_[i].LON);
    TrackingImpactPredict.createCell_(tr, this.tipList_[i].WINDOW);
    TrackingImpactPredict.createCell_(tr, this.tipList_[i].NEXT_REPORT);
    TrackingImpactPredict.createCell_(tr, this.tipList_[i].HIGH_INTEREST);

    return tr;
  }

  private static createCell_(tr: HTMLTableRowElement, text: string): void {
    const cell = tr.insertCell();

    cell.appendChild(document.createTextNode(text));
  }
}
