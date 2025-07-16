import { errorManagerInstance } from '@app/singletons/errorManager';
import sputnickPng from '@public/img/icons/sputnick.png';
import './maneuver-detection.css';

import { KeepTrackApiEvents, MenuMode, ToastMsgType } from '@app/interfaces';
import { getEl } from '@app/lib/get-el';
import { showLoading } from '@app/lib/showLoading';
import { keepTrackApi } from '../../keepTrackApi';
import { ClickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

// Example API interface for maneuver detection messages
export interface ManeuverDataMsg {
  'EventId': string,
  'EventTime': string,
  'NoradId': string,
  'DeltaVDetected': string,
  'Confidence': string,
  'HighInterest': string,
}

export class ManeuverDetection extends KeepTrackPlugin {
  readonly id = 'ManeuverDetection';
  dependencies_ = [];
  // private readonly maneuverDataSrc = 'https://r2.keeptrack.space/maneuver-detection.json'; // Example URL for static maneuver detection data
  private readonly maneuverDataSrc = '/data/maneuver-detection.json'; // Local static maneuver detection data
  // private readonly maneuverDataSrc = 'https://api.keeptrack.space/maneuver-detection/latest'; // Example for API based maneuver detection data
  private selectSatIdOnCruncher_: number | null = null;
  private maneuverEvents_ = <ManeuverDataMsg[]>[];

  bottomIconImg = sputnickPng;
  sideMenuElementName: string = 'maneuver-detection-menu';
  sideMenuElementHtml = keepTrackApi.html`
  <div id="maneuver-detection-menu" class="side-menu-parent start-hidden text-select">
    <div id="maneuver-detection-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Potential Maneuvers Detected</h5>
        <table id="maneuver-detection-table" class="center-align"></table>
        <sub class="center-align">*Maneuver Detection Data provided by Notional Business Partner (NBP).</sub>
      </div>
    </div>
  </div>`;

  // Defines which menus this plugin will be available in
  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  // Defines the drag options for the side menu
  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 1200,
    maxWidth: 1500,
  };

  // Callback for the bottom icon click
  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      this.parseManeuverData_();
    }
  };

  // Adds the necessary JavaScript for the plugin
  addJs(): void {
    super.addJs();

    keepTrackApi.on(
      KeepTrackApiEvents.uiManagerFinal, // Once all HTML is loaded
      this.uiManagerFinal_.bind(this),
    );

    keepTrackApi.on(
      KeepTrackApiEvents.onCruncherMessage, // When a message is received from the satellite position web worker
      () => {
        if (this.selectSatIdOnCruncher_ !== null) {
          // If selectedSatManager is loaded, set the selected sat to the one that was just added
          keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.selectSatIdOnCruncher_);

          this.selectSatIdOnCruncher_ = null;
        }
      },
    );
  }

  private uiManagerFinal_() {
    getEl(this.sideMenuElementName)!.addEventListener('click', (evt: Event) => { // When the side menu is clicked
      const el = (<HTMLElement>evt.target)?.parentElement;

      if (!el?.classList.contains('maneuver-object')) {
        return; // If the clicked element is not a maneuver object, do nothing
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

  private parseManeuverData_() {
    if (this.maneuverEvents_.length === 0) {
      // Only generate the table if receiving the -1 argument for the first time
      fetch(this.maneuverDataSrc)
        .then((response) => response.json())
        .then((maneuverList: ManeuverDataMsg[]) => {
          this.setManeuverList_(maneuverList);
          this.createTable_();

          if (this.maneuverEvents_.length === 0) {
            errorManagerInstance.warn('No maneuver data found!');
          }
        })
        .catch(() => {
          errorManagerInstance.warn('Error fetching maneuver data!');
        });
    }
  }

  // sort by event time and then keep only the newest for each noradId
  private setManeuverList_(maneuverList: ManeuverDataMsg[]) {
    this.maneuverEvents_ = maneuverList;
    this.maneuverEvents_.sort((a, b) => new Date(b.EventTime).getTime() - new Date(a.EventTime).getTime());
    this.maneuverEvents_ = this.maneuverEvents_.filter((v, i, a) => a.findIndex((t) => t.NoradId === v.NoradId) === i);
  }

  private eventClicked_(row: number) {
    // Check if the selected satellite is still in orbit
    const sat = keepTrackApi.getCatalogManager().sccNum2Sat(parseInt(this.maneuverEvents_[row].NoradId));

    if (!sat) {
      keepTrackApi.getUiManager().toast('Satellite appears to have decayed!', ToastMsgType.caution);

      return;
    }


    const now = new Date();
    const decayEpoch = new Date(this.maneuverEvents_[row].EventTime);

    keepTrackApi.getTimeManager().changeStaticOffset(decayEpoch.getTime() - now.getTime());
    keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false;


    keepTrackApi.getUiManager().doSearch(`${sat.sccNum5}`);

    this.selectSatIdOnCruncher_ = sat.id;

    this.closeSideMenu(); // Close the side menu after selecting the satellite
  }

  private createTable_(): void {
    try {
      const tbl = <HTMLTableElement>getEl('maneuver-detection-table'); // Identify the table to update

      tbl.innerHTML = ''; // Clear the table from old object data
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
      'Event Time',
      'Delta V Detected (m/s)',
      'Confidence (%)',
      'High Interest',
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

    tr.setAttribute('class', 'maneuver-object link');
    tr.setAttribute('data-row', i.toString());

    // Populate the table with the data
    ManeuverDetection.createCell_(tr, this.maneuverEvents_[i].NoradId);
    ManeuverDetection.createCell_(tr, this.maneuverEvents_[i].EventTime);
    ManeuverDetection.createCell_(tr, this.maneuverEvents_[i].DeltaVDetected);
    ManeuverDetection.createCell_(tr, this.maneuverEvents_[i].Confidence);
    ManeuverDetection.createCell_(tr, this.maneuverEvents_[i].HighInterest);

    return tr;
  }

  private static createCell_(tr: HTMLTableRowElement, text: string): void {
    const cell = tr.insertCell();

    cell.appendChild(document.createTextNode(text));
  }
}
