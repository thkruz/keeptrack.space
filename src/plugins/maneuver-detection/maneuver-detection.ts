import { errorManagerInstance } from '@app/singletons/errorManager';
import sputnickPng from '@public/img/icons/sputnick.png';
import './maneuver-detection.css';

import { KeepTrackApiEvents, MenuMode, ToastMsgType } from '@app/interfaces';
import { getEl } from '@app/lib/get-el';
import { showLoading } from '@app/lib/showLoading';
import { keepTrackApi } from '../../keepTrackApi';
import { ClickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

// Define the maneuver data interface based on orbitguard_output.json
export interface ManeuverDataMsg {
  event_end_timestamp: string;
  event_start_timestamp: string;
  inference_timestamp: string;
  maneuver_class: string | null;
  maneuver_probability: number;
  oof_detection: number;
  satNo: string;
  stability_change_detection: number;
  stability_change_probability: number;
}

export class ManeuverDetection extends KeepTrackPlugin {
  readonly id = 'ManeuverDetection';
  dependencies_ = [];
  private readonly maneuverDataSrc = '/data/orbitguard_output.json'; // Updated data source
  private selectSatIdOnCruncher_: number | null = null;
  private maneuverEvents_ = <ManeuverDataMsg[]>[];

  bottomIconImg = sputnickPng;
  sideMenuElementName: string = 'maneuver-detection-menu';
  sideMenuElementHtml = keepTrackApi.html`
    <div id="maneuver-detection-menu" class="side-menu-parent start-hidden text-select">
      <div id="maneuver-detection-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">OrbitGuard Anomaly Detection</h5>
          <table id="maneuver-detection-table" class="center-align"></table>
          <sub class="center-align">*OrbitGuard Data provided by MSBAI.</sub>
        </div>
      </div>
    </div>`;

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];
  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 1200,
    maxWidth: 1600, // Increased to accommodate two time columns
  };

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      this.parseManeuverData_();
    }
  };

  addJs(): void {
    super.addJs();

    keepTrackApi.on(KeepTrackApiEvents.uiManagerFinal, this.uiManagerFinal_.bind(this));

    keepTrackApi.on(KeepTrackApiEvents.onCruncherMessage, () => {
      if (this.selectSatIdOnCruncher_ !== null) {
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.selectSatIdOnCruncher_);
        this.selectSatIdOnCruncher_ = null;
      }
    });
  }

  private uiManagerFinal_() {
    getEl(this.sideMenuElementName)!.addEventListener('click', (evt: Event) => {
      const el = (<HTMLElement>evt.target)?.parentElement;

      if (!el?.classList.contains('maneuver-object')) {
        return;
      }

      showLoading(() => {
        const hiddenRow = el.dataset?.row ?? null;
        if (hiddenRow !== null) {
          this.eventClicked_(parseInt(hiddenRow));
        }
      });
    });
  }

  private parseManeuverData_() {
    if (this.maneuverEvents_.length === 0) {
      fetch(this.maneuverDataSrc)
        .then((response) => response.json())
        .then((maneuverList: ManeuverDataMsg[]) => {
          this.setManeuverList_(maneuverList);
          this.createTable_();
          if (this.maneuverEvents_.length === 0) {
            errorManagerInstance.warn('No OrbitGuard data found!');
          }
        })
        .catch(() => {
          errorManagerInstance.warn('Error fetching OrbitGuard data!');
        });
    }
  }

  private setManeuverList_(maneuverList: ManeuverDataMsg[]) {
    this.maneuverEvents_ = maneuverList;
    this.maneuverEvents_.sort((a, b) => new Date(b.event_end_timestamp).getTime() - new Date(a.event_end_timestamp).getTime());
    this.maneuverEvents_ = this.maneuverEvents_.filter((v, i, a) => a.findIndex((t) => t.satNo === v.satNo) === i);
  }

  private eventClicked_(row: number) {
    const sat = keepTrackApi.getCatalogManager().sccNum2Sat(parseInt(this.maneuverEvents_[row].satNo));

    if (!sat) {
      keepTrackApi.getUiManager().toast('Satellite appears to have decayed!', ToastMsgType.caution);
      return;
    }

    const now = new Date();
    const eventTime = new Date(this.maneuverEvents_[row].event_end_timestamp); // Using event_end_timestamp for consistency with sorting
    keepTrackApi.getTimeManager().changeStaticOffset(eventTime.getTime() - now.getTime());
    keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false;

    keepTrackApi.getUiManager().doSearch(`${sat.sccNum5}`);
    this.selectSatIdOnCruncher_ = sat.id;
    this.closeSideMenu();
  }

  private createTable_(): void {
    try {
      const tbl = <HTMLTableElement>getEl('maneuver-detection-table');
      tbl.innerHTML = '';
      tbl.classList.add('centered');

      ManeuverDetection.createHeaders_(tbl);
      this.createBody_(tbl);
    } catch (e) {
      errorManagerInstance.warn('Error processing maneuver data!');
    }
  }

  private createBody_(tbl: HTMLTableElement) {
    for (let i = 0; i < this.maneuverEvents_.length; i++) {
      this.createRow_(tbl, i);
    }
  }

  private static createHeaders_(tbl: HTMLTableElement) {
    const tr = tbl.insertRow();
    const names = [
      'NORAD ID',
      'Event Start Time',
      'Event End Time',
      'Maneuver Class',
      'Maneuver Probability (%)',
      'Orbit Out of Family',
      'Stability Change',
      'Stability Change Probability (%)',
    ];

    for (const name of names) {
      const column = tr.insertCell();
      column.appendChild(document.createTextNode(name));
      column.setAttribute('style', 'text-decoration: underline');
      column.setAttribute('class', 'center');
    }
  }

  private createRow_(tbl: HTMLTableElement, i: number): HTMLTableRowElement {
    const tr = tbl.insertRow();
    tr.setAttribute('class', 'maneuver-object link');
    tr.setAttribute('data-row', i.toString());

    ManeuverDetection.createCell_(tr, this.maneuverEvents_[i].satNo);
    ManeuverDetection.createCell_(tr, this.maneuverEvents_[i].event_start_timestamp);
    ManeuverDetection.createCell_(tr, this.maneuverEvents_[i].event_end_timestamp);
    ManeuverDetection.createCell_(tr, this.maneuverEvents_[i].maneuver_class ?? 'None');
    ManeuverDetection.createCell_(tr, (this.maneuverEvents_[i].maneuver_probability * 100).toFixed(2));
    ManeuverDetection.createCell_(tr, this.maneuverEvents_[i].oof_detection === 0 ? 'false' : 'true');
    ManeuverDetection.createCell_(tr, this.maneuverEvents_[i].stability_change_detection === 0 ? 'false' : 'true');
    ManeuverDetection.createCell_(tr, (this.maneuverEvents_[i].stability_change_probability * 100).toFixed(2));

    return tr;
  }

  private static createCell_(tr: HTMLTableRowElement, text: string): void {
    const cell = tr.insertCell();
    cell.appendChild(document.createTextNode(text));
  }
}
