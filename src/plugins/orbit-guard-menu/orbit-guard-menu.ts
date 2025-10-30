import orbitguardPng from '@public/img/icons/orbitguard.png';
import './orbit-guard-menu.css';

import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ClickDragOptions, KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';

// Define the maneuver data interface based on orbitguard_output.json
export interface OrbitGuardEvent {
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

export class OrbitGuardMenuPlugin extends KeepTrackPlugin {
  readonly id = 'OrbitGuardMenuPlugin';
  dependencies_ = [];
  private readonly maneuverDataSrc = 'http://192.34.81.138:8501/orbitguard'; // API endpoint
  private readonly bearerToken = 'Bearer guruspace5172x2';

  private selectSatIdOnCruncher_: number | null = null;
  private orbitGuardEvents = <OrbitGuardEvent[]>[];

  // Pagination variables
  private readonly pageSize: number = 20; // Set to 20 rows per page
  private currentPage: number = 1; // Current page number

  bottomIconImg = orbitguardPng;
  sideMenuElementName: string = 'maneuver-detection-menu';
  sideMenuElementHtml = html`
    <div id="maneuver-detection-menu" class="side-menu-parent start-hidden text-select">
      <div id="maneuver-detection-content" class="side-menu">
        <div class="row">
          <h1 class="center-align">OrbitGuard</h1>
          <table id="maneuver-detection-table" class="center-align"></table>
          <sub class="center-align">*OrbitGuard Data provided by MSBAI.</sub>
          <div id="pagination-controls" class="pagination">
            <button id="prev-page" class="pagination-btn">Previous</button>
            <span id="current-page" class="pagination-text">Page 1</span>
            <button id="next-page" class="pagination-btn">Next</button>
          </div>
        </div>
      </div>
    </div>`;

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];
  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 1200,
    maxWidth: 1600,
  };

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      this.parseManeuverData_();
    }
  };

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));

    EventBus.getInstance().on(EventBusEvent.onCruncherMessage, () => {
      if (this.selectSatIdOnCruncher_ !== null) {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(this.selectSatIdOnCruncher_);
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

    // Add event listeners for pagination buttons
    getEl('prev-page')!.addEventListener('click', this.goToPreviousPage_.bind(this));
    getEl('next-page')!.addEventListener('click', this.goToNextPage_.bind(this));
  }

  private eventClicked_(row: number) {
    const sat = ServiceLocator.getCatalogManager().sccNum2Sat(parseInt(this.orbitGuardEvents[row].satNo));

    if (!sat) {
      ServiceLocator.getUiManager().toast('Satellite appears to have decayed!', ToastMsgType.caution);

      return;
    }

    const now = new Date();
    const eventTime = new Date(this.orbitGuardEvents[row].event_end_timestamp);

    ServiceLocator.getTimeManager().changeStaticOffset(eventTime.getTime() - now.getTime());
    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

    ServiceLocator.getUiManager().doSearch(`${sat.sccNum5}`);
    this.selectSatIdOnCruncher_ = sat.id;
    this.closeSideMenu();
  }

  private parseManeuverData_() {
    if (this.orbitGuardEvents.length === 0) {
      fetch(this.maneuverDataSrc, {
        method: 'GET',
        headers: {
          'Authorization': this.bearerToken, // Add Bearer token from your script
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return response.json();
        })
        .then((maneuverList: OrbitGuardEvent[]) => {
          this.setManeuverList_(maneuverList);
          this.createTable_();
          if (this.orbitGuardEvents.length === 0) {
            errorManagerInstance.warn('No OrbitGuard data found!');
          }
        })
        .catch((error) => {
          errorManagerInstance.warn(`Error fetching OrbitGuard data: ${error.message}`);
        });
    }
  }

  private setManeuverList_(maneuverList: OrbitGuardEvent[]) {
    this.orbitGuardEvents = maneuverList;
    this.orbitGuardEvents.sort((a, b) => new Date(b.event_end_timestamp).getTime() - new Date(a.event_end_timestamp).getTime());
    this.orbitGuardEvents = this.orbitGuardEvents.filter((v, i, a) => a.findIndex((t) => t.satNo === v.satNo) === i);

    this.currentPage = 1; // Reset to the first page whenever new data is loaded
    this.updatePaginationControls_(); // Update pagination controls for the first page
  }

  private updatePaginationControls_() {
    const totalPages = Math.ceil(this.orbitGuardEvents.length / this.pageSize);
    const pageText = getEl('current-page') as HTMLElement;

    pageText.innerText = `Page ${this.currentPage} of ${totalPages}`;

    const prevBtn = getEl('prev-page') as HTMLButtonElement;
    const nextBtn = getEl('next-page') as HTMLButtonElement;

    // Disable/Enable the previous/next buttons based on current page
    prevBtn.disabled = this.currentPage <= 1;
    nextBtn.disabled = this.currentPage >= totalPages;
  }

  private goToNextPage_() {
    const totalPages = Math.ceil(this.orbitGuardEvents.length / this.pageSize);

    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.createTable_(); // Rebuild the table for the new page
      this.updatePaginationControls_(); // Update pagination controls
    }
  }

  private goToPreviousPage_() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.createTable_(); // Rebuild the table for the new page
      this.updatePaginationControls_(); // Update pagination controls
    }
  }

  private createTable_(): void {
    try {
      const tbl = <HTMLTableElement>getEl('maneuver-detection-table');

      tbl.innerHTML = '';
      tbl.classList.add('centered');

      this.createHeaders_(tbl);
      this.createBody_(tbl);
    } catch {
      errorManagerInstance.warn('Error processing maneuver data!');
    }
  }

  private createBody_(tbl: HTMLTableElement) {
    // Calculate the starting and ending indices for the current page
    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    const pageData = this.orbitGuardEvents.slice(startIdx, endIdx);

    // Create rows for the current page data
    pageData.forEach((_, i) => {
      this.createRow_(tbl, startIdx + i); // Adjust row index
    });
  }

  private createHeaders_(tbl: HTMLTableElement) {
    const tr = tbl.insertRow();
    const names = [
      'NORAD',
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

    const formatDateTime = (isoString: string) => {
      const date = new Date(isoString.slice(-1).toUpperCase() === 'Z' ? isoString : `${isoString}Z`); // Ensure UTC parsing
      const iso = date.toISOString().replace('T', ' ').split('.')[0];

      return iso;
    };

    const cells = [
      this.orbitGuardEvents[i].satNo,
      formatDateTime(this.orbitGuardEvents[i].event_start_timestamp),
      formatDateTime(this.orbitGuardEvents[i].event_end_timestamp),
      this.orbitGuardEvents[i].maneuver_class ?? 'None',
      (this.orbitGuardEvents[i].maneuver_probability * 100).toFixed(2),
      this.orbitGuardEvents[i].oof_detection === 0 ? 'False' : 'True',
      this.orbitGuardEvents[i].stability_change_detection === 0 ? 'False' : 'True',
      (this.orbitGuardEvents[i].stability_change_probability * 100).toFixed(2),
    ];

    cells.forEach((cellText, index) => {
      const cell = OrbitGuardMenuPlugin.createCell_(tr, cellText);

      if (this.shouldHighlightRed_(index, i)) {
        cell.classList.add('highlight-red');
      }
    });

    return tr;
  }

  private shouldHighlightRed_(index: number, rowIndex: number): boolean {
    const event = this.orbitGuardEvents[rowIndex];

    // Highlight based on column index
    switch (index) {
      case 3: // "Maneuver Class" column (index 3)
        if (event.maneuver_class !== null) {
          return true; // Highlight "maneuver_class" if it's not None
        }
        break;
      case 5: // "Orbit Out of Family" column (index 5)
        if (event.oof_detection !== 0) {
          return true; // Highlight "Orbit Out of Family" if it's true
        }
        break;
      case 6: // "Stability Change Detection" column (index 6)
        if (event.stability_change_detection !== 0) {
          return true; // Highlight "stability_change_detection" if it's not 0
        }
        break;
      case 7: // "Stability Change Probability" column (index 7)
        if (event.stability_change_probability !== 0.0) {
          return true; // Highlight "stability_change_probability" if it's not 0.0
        }
        break;
      default:
        break;
    }

    return false;
  }

  private static createCell_(tr: HTMLTableRowElement, text: string): HTMLTableCellElement {
    const cell = tr.insertCell();

    cell.appendChild(document.createTextNode(text));

    return cell;
  }
}
