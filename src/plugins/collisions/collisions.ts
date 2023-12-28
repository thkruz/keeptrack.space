import { errorManagerInstance } from '@app/singletons/errorManager';
import collissionsPng from '@public/img/icons/socrates.png';

import { KeepTrackApiEvents } from '@app/interfaces';
import { getEl } from '@app/lib/get-el';
import { showLoading } from '@app/lib/showLoading';
import { keepTrackApi } from '../../keepTrackApi';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export interface CollisionEvent {
  sat1: string;
  sat1Name: string;
  sat1Status: string;
  sat2: string;
  sat2Name: string;
  sat2Status: string;
  /** Number of Days */
  sat1AgeOfTLE: number;
  /** Number of Days */
  sat2AgeOfTLE: number;
  /** ISO Date format */
  toca: string;
  minRng: number;
  dilutionThreshold: number;
  relSpeed: number;
  maxProb: number;
}

export class Collissions extends KeepTrackPlugin {
  static PLUGIN_NAME = 'collisions';

  constructor() {
    super(Collissions.PLUGIN_NAME);
  }

  private readonly collisionDataSrc = './tle/SOCRATES.json';
  private selectSatIdOnCruncher_: number | null = null;
  private collisionList_ = <CollisionEvent[]>[];

  bottomIconElementName: string = 'menu-satellite-collision';
  bottomIconImg = collissionsPng;
  bottomIconLabel: string = 'Collisions';
  sideMenuElementName: string = 'socrates-menu';
  sideMenuElementHtml = keepTrackApi.html`
  <div id="socrates-menu" class="side-menu-parent start-hidden text-select">
    <div id="socrates-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Possible Collisions</h5>
        <table id="socrates-table" class="center-align"></table>
      </div>
    </div>
  </div>`;

  helpTitle = `Collisions Menu`;
  helpBody = keepTrackApi.html`The Collisions Menu shows satellites with a high probability of collision.
  <br><br>
  Clicking on a row will select the two satellites involved in the collision and change the time to the time of the collision.`;

  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 500,
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
      cbName: this.PLUGIN_NAME,
      cb: this.uiManagerFinal_.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.onCruncherMessage,
      cbName: this.PLUGIN_NAME,
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
        if (!el.classList.contains('socrates-object')) return;
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
            errorManagerInstance.warn('No collisions data found!');
          }
        });
      });
    }
  }

  private eventClicked_(row: number) {
    const now = new Date();
    keepTrackApi.getTimeManager().changeStaticOffset(new Date(this.collisionList_[row].toca).getTime() - now.getTime() - 1000 * 30);
    keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false;

    const sat1 = this.collisionList_[row].sat1.padStart(5, '0');
    const sat2 = this.collisionList_[row].sat2.padStart(5, '0');

    keepTrackApi.getUiManager().doSearch(`${sat1},${sat2}`);
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    this.selectSatIdOnCruncher_ = catalogManagerInstance.getIdFromSccNum(parseInt(sat1));
  }

  private createTable_(): void {
    try {
      const tbl = <HTMLTableElement>getEl('socrates-table'); // Identify the table to update
      tbl.innerHTML = ''; // Clear the table from old object data

      Collissions.createHeaders_(tbl);

      this.createBody_(tbl);
    } catch (e) {
      errorManagerInstance.warn('Error processing SOCRATES data!');
    }
  }

  private createBody_(tbl: HTMLTableElement) {
    for (let i = 0; i < this.collisionList_.length; i++) {
      this.createRow_(tbl, i);
    }
  }

  private static createHeaders_(tbl: HTMLTableElement) {
    let tr = tbl.insertRow();
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
    tr.setAttribute('class', 'socrates-object link');
    tr.setAttribute('data-row', i.toString());

    // Populate the table with the data
    Collissions.createCell_(tr, this.collisionList_[i].toca.slice(0, 19).replace('T', ' '));
    Collissions.createCell_(tr, this.collisionList_[i].sat1);
    Collissions.createCell_(tr, this.collisionList_[i].sat2);
    Collissions.createCell_(tr, this.collisionList_[i].maxProb.toFixed(3));
    Collissions.createCell_(tr, this.collisionList_[i].minRng.toString());
    Collissions.createCell_(tr, this.collisionList_[i].relSpeed.toFixed(2));
    return tr;
  }

  private static createCell_(tr: HTMLTableRowElement, text: string): void {
    const cell = tr.insertCell();
    cell.appendChild(document.createTextNode(text));
  }
}
