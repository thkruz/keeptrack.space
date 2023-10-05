import collissionsPng from '@app/img/icons/socrates.png';
import { keepTrackContainer } from '@app/js/container';
import { CatalogManager, Singletons } from '@app/js/interfaces';
import { errorManagerInstance } from '@app/js/singletons/errorManager';

import { getEl } from '@app/js/lib/get-el';
import { showLoading } from '@app/js/lib/showLoading';
import { keepTrackApi } from '../../keepTrackApi';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';

interface CollisionEvent {
  sat1: string;
  sat2: string;
  toca: Date;
  minRng: number;
  maxProb: number;
  relSpeed: number;
}

export class CollissionsPlugin extends KeepTrackPlugin {
  bottomIconElementName: string = 'menu-satellite-collision';
  bottomIconImg = collissionsPng;
  bottomIconLabel: string = 'Collisions';
  sideMenuElementName: string = 'socrates-menu';
  sideMenuElementHtml = keepTrackApi.html`
  <div id="socrates-menu" class="side-menu-parent start-hidden text-select">
    <div id="socrates-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Possible collisions</h5>
        <table id="socrates-table" class="center-align"></table>
      </div>
    </div>
  </div>`;

  helpTitle = `Collisions Menu`;
  helpBody = keepTrackApi.html`The Collisions Menu shows satellites with a high probability of collision.
  <br><br>
  Clicking on a row will select the two satellites involved in the collision and change the time to the time of the collision.`;

  private socratesOnSatCruncher: number | null = null;
  collisionList = <CollisionEvent[]>[];
  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 350,
    maxWidth: 500,
  };

  static PLUGIN_NAME = 'collisions';
  constructor() {
    super(CollissionsPlugin.PLUGIN_NAME);
  }

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonEnabled) {
      this.parseCollisionData_();
    }
  };

  private uiManagerFinal() {
    getEl('socrates-menu').addEventListener('click', (evt: any) => {
      showLoading(() => {
        const el = <HTMLElement>evt.target.parentElement;
        if (!el.classList.contains('socrates-object')) return;
        // Might be better code for this.
        const hiddenRow = (<any>el.attributes).hiddenrow.value;
        if (hiddenRow !== null) {
          this.eventClicked_(hiddenRow);
        }
      });
    });
  }

  public addJs(): void {
    super.addJs();

    keepTrackApi.register({
      method: 'uiManagerFinal',
      cbName: 'collisions',
      cb: this.uiManagerFinal.bind(this),
    });

    keepTrackApi.register({
      method: 'onCruncherMessage',
      cbName: 'collisions',
      cb: () => {
        if (this.socratesOnSatCruncher !== null) {
          keepTrackApi.getCatalogManager().setSelectedSat(this.socratesOnSatCruncher);
          this.socratesOnSatCruncher = null;
        }
      },
    });
  }

  private parseCollisionData_() {
    if (this.collisionList.length === 0) {
      // Only generate the table if receiving the -1 argument for the first time
      fetch('./SOCRATES.html').then((response) => {
        response.text().then((text) => {
          const parser = new DOMParser();
          const socratesHTM = parser.parseFromString(text, 'text/html');
          this.processSocratesHtm(socratesHTM);

          if (this.collisionList.length === 0) {
            errorManagerInstance.warn('No collisions data found!');
          }
        });
      });
    }
  }

  private eventClicked_(row: number) {
    const now = new Date();
    keepTrackApi.getTimeManager().changeStaticOffset(this.collisionList[row].toca.getTime() - now.getTime() - 1000 * 30);
    keepTrackApi.getMainCamera().isCamSnapMode = false;

    keepTrackApi.getUiManager().doSearch(`${this.collisionList[row].sat1},${this.collisionList[row].sat2}`);
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    this.socratesOnSatCruncher = catalogManagerInstance.getIdFromObjNum(parseInt(this.collisionList[row].sat1));
  }

  private processSocratesHtm(socratesHTM: Document): void {
    try {
      // Find a table whose class is "center outline" using pure javascript
      const table = socratesHTM.getElementsByClassName('center outline')[0];
      // Filter out all tr elements that have a class of "header" using pure javascript
      const tableRows = Array.from(table.getElementsByTagName('tr')).filter((tr) => !tr.classList.contains('header'));

      // Split the td elements into an array of arrays using pure javascript
      const tableData = tableRows.map((tr) => Array.from(tr.getElementsByTagName('td'))).map((tds) => tds.map((td) => td.innerText));

      for (let row = 0; row < tableData.length; row = row + 2) {
        const event: CollisionEvent = {
          sat1: tableData[row][1],
          sat2: tableData[row + 1][1],
          toca: new Date(tableData[row][4]),
          minRng: parseFloat(tableData[row][5]),
          maxProb: parseFloat(tableData[row + 1][5]),
          relSpeed: parseFloat(tableData[row][6]),
        };
        this.collisionList.push(event);
      }

      // SOCRATES Menu
      const tbl = <HTMLTableElement>getEl('socrates-table'); // Identify the table to update
      tbl.innerHTML = ''; // Clear the table from old object data
      let tr = tbl.insertRow();
      let tdToca = tr.insertCell();
      tdToca.appendChild(document.createTextNode('TOCA'));
      tdToca.setAttribute('style', 'text-decoration: underline');
      let tdSat1 = tr.insertCell();
      tdSat1.appendChild(document.createTextNode('#1'));
      tdSat1.setAttribute('style', 'text-decoration: underline');
      let tdSat2 = tr.insertCell();
      tdSat2.appendChild(document.createTextNode('#2'));
      tdSat2.setAttribute('style', 'text-decoration: underline');
      let tdDist = tr.insertCell();
      tdDist.appendChild(document.createTextNode('Probability'));
      tdDist.setAttribute('style', 'text-decoration: underline');

      for (let i = 0; i < this.collisionList.length; i++) {
        tr = tbl.insertRow();
        tr.setAttribute('class', 'socrates-object link');
        tr.setAttribute('hiddenrow', i.toString());
        tdToca = tr.insertCell();
        // Add the time in the format "YYYY-MM-DD HH:MM:SS"
        tdToca.appendChild(document.createTextNode(this.collisionList[i].toca.toISOString().slice(0, 19).replace('T', ' ')));
        tdSat1 = tr.insertCell();
        tdSat1.appendChild(document.createTextNode(this.collisionList[i].sat1));
        tdSat2 = tr.insertCell();
        tdSat2.appendChild(document.createTextNode(this.collisionList[i].sat2));
        tdDist = tr.insertCell();
        tdDist.appendChild(document.createTextNode(this.collisionList[i].minRng.toString()));
      }
    } catch (e) {
      errorManagerInstance.warn('Error parsing SOCRATES data!');
    }
  }
}

export const collissionsPlugin = new CollissionsPlugin();
