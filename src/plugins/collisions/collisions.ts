import { errorManagerInstance } from '@app/singletons/errorManager';
import collissionsPng from '@public/img/icons/collisions.png';
import './collisions.css';

import { KeepTrackApiEvents } from '@app/interfaces';
import { getEl } from '@app/lib/get-el';
import { showLoading } from '@app/lib/showLoading';
import i18next from 'i18next';
import { keepTrackApi } from '../../keepTrackApi';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

//  Updated to match KeepTrack API v2
export interface CollisionEvent {
  ID: number;
  SAT1: number;
  SAT1_NAME: string;
  SAT1_STATUS: string;
  SAT2: number;
  SAT2_NAME: string;
  SAT2_STATUS: string;
  SAT1_AGE_OF_TLE: number;
  SAT2_AGE_OF_TLE: number;
  TOCA: string;
  MIN_RNG: number;
  DILUTION_THRESHOLD: number;
  REL_SPEED: number;
  MAX_PROB: number;
}

export class Collissions extends KeepTrackPlugin {
  readonly id = 'Collissions';
  dependencies_ = [];
  private readonly collisionDataSrc = 'https://api.keeptrack.space/v2/socrates/latest';
  private selectSatIdOnCruncher_: number | null = null;
  private collisionList_ = <CollisionEvent[]>[];

  bottomIconElementName: string = 'menu-satellite-collision';
  bottomIconImg = collissionsPng;
  sideMenuElementName: string = 'collisions-menu';
  sideMenuElementHtml = keepTrackApi.html`
  <div id="collisions-menu" class="side-menu-parent start-hidden text-select">
    <div id="collisions-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Possible Collisions</h5>
        <table id="collisions-table" class="center-align"></table>
      </div>
    </div>
  </div>`;

  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 540,
    maxWidth: 650,
  };

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      this.parseCollisionData_();
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
    getEl(this.sideMenuElementName).addEventListener('click', (evt: MouseEvent) => {
      showLoading(() => {
        const el = (<HTMLElement>evt.target).parentElement;

        if (!el.classList.contains('collisions-object')) {
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

  private parseCollisionData_() {
    if (this.collisionList_.length === 0) {
      // Only generate the table if receiving the -1 argument for the first time
      fetch(this.collisionDataSrc).then((response) => {
        response.json().then((collisionList: CollisionEvent[]) => {
          this.collisionList_ = collisionList;
          this.createTable_();

          if (this.collisionList_.length === 0) {
            errorManagerInstance.warn(i18next.t('errorMsgs.Collissions.noCollisionsData'));
          }
        });
      });
    }
  }

  private eventClicked_(row: number) {
    const now = new Date();

    keepTrackApi.getTimeManager().changeStaticOffset(new Date(this.collisionList_[row].TOCA).getTime() - now.getTime() - 1000 * 30);
    keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false;

    const sat1 = this.collisionList_[row].SAT1.toString().padStart(5, '0');
    const sat2 = this.collisionList_[row].SAT2.toString().padStart(5, '0');

    keepTrackApi.getUiManager().doSearch(`${sat1},${sat2}`);
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    this.selectSatIdOnCruncher_ = catalogManagerInstance.sccNum2Id(parseInt(sat1));
  }

  private createTable_(): void {
    try {
      const tbl = <HTMLTableElement>getEl('collisions-table'); // Identify the table to update

      tbl.innerHTML = ''; // Clear the table from old object data

      Collissions.createHeaders_(tbl);

      this.createBody_(tbl);
    } catch (e) {
      errorManagerInstance.warn(i18next.t('errorMsgs.Collissions.errorProcessingCollisions'));
    }
  }

  private createBody_(tbl: HTMLTableElement) {
    for (let i = 0; i < this.collisionList_.length; i++) {
      this.createRow_(tbl, i);
    }
  }

  private static createHeaders_(tbl: HTMLTableElement) {
    const tr = tbl.insertRow();
    const names = ['TOCA', '#1', '#2', 'Max Prob', 'Min Range (km)', 'Rel Speed (km/s)'];

    for (const name of names) {
      const column = tr.insertCell();

      column.appendChild(document.createTextNode(name));
      column.setAttribute('style', 'text-decoration: underline');
    }
  }

  private createRow_(tbl: HTMLTableElement, i: number): HTMLTableRowElement {
    // Create a new row
    const tr = tbl.insertRow();

    tr.setAttribute('class', 'collisions-object link');
    tr.setAttribute('data-row', i.toString());

    // Populate the table with the data
    Collissions.createCell_(tr, this.collisionList_[i].TOCA.slice(0, 19).replace('T', ' '));
    Collissions.createCell_(tr, this.collisionList_[i].SAT1.toString());
    Collissions.createCell_(tr, this.collisionList_[i].SAT2.toString());
    Collissions.createCell_(tr, this.collisionList_[i].MAX_PROB.toFixed(3));
    Collissions.createCell_(tr, this.collisionList_[i].MIN_RNG.toString());
    Collissions.createCell_(tr, this.collisionList_[i].REL_SPEED.toFixed(2));

    return tr;
  }

  private static createCell_(tr: HTMLTableRowElement, text: string): void {
    const cell = tr.insertCell();

    cell.appendChild(document.createTextNode(text));
  }
}
