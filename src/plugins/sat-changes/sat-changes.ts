/* eslint-disable no-use-before-define */
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { clickAndDragWidth } from '@app/engine/utils/click-and-drag';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { slideInRight, slideOutLeft } from '@app/engine/utils/slide';
import { dateFromJday } from '@app/engine/utils/transforms';
import satChngPng from '@public/img/icons/sats.png';
import './components/sat-changes.css';
import { ServiceLocator } from '@app/engine/core/service-locator';

/**
 *  ////////////////////////////////////////////////////////////////////////////
 * TODO: This is currently obsolete and needs to be updated to the new Plugin
 * Framework. The backend that finds these changes is not currently running.
 *  //////////////////////////////////////////////////////////////////////////
 */

/* istanbul ignore file */

export interface SatChngObject {
  SCC: number;
  date: Date;
  inc: number;
  meanmo: number;
}

let issatChngMenuOpen = false;

export const uiManagerInit = () => {
  // Side Menu
  getEl('left-menus')?.insertAdjacentHTML(
    'beforeend',
    html`
        <div id="satChng-menu" class="side-menu-parent start-hidden text-select">
          <div id="satChng-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Interesting Movements</h5>
              <table id="satChng-table" class="center-align"></table>
            </div>
          </div>
        </div>
      `,
  );

  // Bottom Icon
  getEl('bottom-icons')?.insertAdjacentHTML(
    'beforeend',
    html`
        <div id="menu-satChng" class="bmenu-item">
          <div class="bmenu-item-inner">
            <img alt="satchng" src="" delayedsrc="${satChngPng}" />
          </div>
          <span class="bmenu-title">Satellite Changes</span>
        </div>
        `,
  );
};

export const init = (): void => {
  // Add HTML
  EventBus.getInstance().on(EventBusEvent.uiManagerInit, uiManagerInit);
  EventBus.getInstance().on(EventBusEvent.uiManagerFinal, uiManagerFinal);

  // Add JavaScript
  EventBus.getInstance().on(EventBusEvent.bottomMenuClick, bottomMenuClick);
  EventBus.getInstance().on(EventBusEvent.hideSideMenus, hideSideMenus);
};

const uiManagerFinal = () => {
  clickAndDragWidth(getEl('satChng-menu'), {
    minWidth: 330,
    maxWidth: 600,
  });

  getEl('satChng-menu')!.addEventListener('click', (evt: Event) => {
    if (!(<HTMLElement>evt.target).classList.contains('satChng-object')) {
      return;
    }
    // Might be better code for this.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hiddenRow = (<any>evt.currentTarget).attributes.hiddenrow.value;

    if (hiddenRow !== null) {
      satChng(parseInt(hiddenRow));
    }
  });
};

let satChngTable: SatChngObject[] = [];

export const satChng = (row: number, testOverride?: undefined): void => {
  // If we are testing, we can override the satChange object.
  if (isThisNode()) {
    ({ satChngTable } = getSatChngJson(testOverride));
  }

  if (typeof row !== 'number') {
    throw new Error('Row must be a number');
  }
  if (row !== -1 && typeof satChngTable[row] === 'undefined') {
    throw new Error('Row does not exist');
  }

  if (row === -1 && satChngTable?.length === 0) {
    // Only generate the table if receiving the -1 argument for the first time
    fetch(`./analysis/satchng.json?v=${settingsManager.versionNumber}`).then((resp) => {
      resp.json().then((json) => {
        ({ satChngTable } = getSatChngJson(json));
      });
    });
  }
  if (row !== -1) {
    // If an object was selected from the menu
    if (!satChngTable[row].SCC) {
      return;
    }
    const uiManagerInstance = ServiceLocator.getUiManager();

    uiManagerInstance.doSearch(satChngTable[row].SCC.toString()); // Actually perform the search of the two objects
    (<HTMLInputElement>getEl('anal-sat')).value = satChngTable[row].SCC.toString();
  } // If a row was selected
};

export const hideSideMenus = (): void => {
  slideOutLeft(getEl('satChng-menu'), 1000);
  getEl('menu-satChng')?.classList.remove('bmenu-item-selected');
  issatChngMenuOpen = false;
};

export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-satChng') {
    const uiManagerInstance = ServiceLocator.getUiManager();

    if (issatChngMenuOpen) {
      issatChngMenuOpen = false;
      uiManagerInstance.hideSideMenus();

    } else {
      if (settingsManager.isMobileModeEnabled) {
        uiManagerInstance.searchManager.closeSearch();
      }
      uiManagerInstance.hideSideMenus();
      slideInRight(getEl('satChng-menu'), 1000);
      issatChngMenuOpen = true;
      satChng(-1);
      getEl('menu-satChng')?.classList.add('bmenu-item-selected');

    }
  }
};

export const getSatChngJson = (json) => {
  const catalogManagerInstance = ServiceLocator.getCatalogManager();

  // TODO: This is a temporary fix for the fact that the JSON is not being parsed correctly.
  if (!json && isThisNode()) {
    return { resp: json, satChngTable: [] };
  }
  for (const element of json) {
    const prefix = element.year > 50 ? '19' : '20';
    const year = parseInt(prefix + element.year.toString());
    let date = dateFromJday(year, element.day);

    date = new Date(date.getTime() + (element.day % 1) * 1440 * 60000);
    element.date = date;
  }
  const _satChngTable = json;
  // satChng Menu
  const tbl = <HTMLTableElement>getEl('satChng-table'); // Identify the table to update

  tbl.innerHTML = ''; // Clear the table from old object data

  let tr = tbl.insertRow();
  let tdT = tr.insertCell();

  tdT.appendChild(document.createTextNode('Time'));
  tdT.setAttribute('style', 'text-decoration: underline');
  let tdSat = tr.insertCell();

  tdSat.appendChild(document.createTextNode('Sat'));
  tdSat.setAttribute('style', 'text-decoration: underline');
  let tdInc = tr.insertCell();

  tdInc.appendChild(document.createTextNode('Inc'));
  tdInc.setAttribute('style', 'text-decoration: underline');
  let tdPer = tr.insertCell();

  tdPer.appendChild(document.createTextNode('Per'));
  tdPer.setAttribute('style', 'text-decoration: underline');

  // 20 rows max
  for (let i = 0; i < Math.min(_satChngTable.length, 20); i++) {
    const sat = catalogManagerInstance.sccNum2Sat(_satChngTable[i].SCC);

    // Skip Decays
    if (sat === null) {
      continue;
    }

    tr = tbl.insertRow();
    tr.setAttribute('class', 'satChng-object link');
    tr.setAttribute('hiddenrow', i.toString());
    tdT = tr.insertCell();
    const dateStr = _satChngTable[i].date.toJSON();
    let timeTextStr = '';

    for (let iText = 0; iText < 20; iText++) {
      if (iText < 10) {
        timeTextStr += dateStr[iText];
      }
      if (iText === 10) {
        timeTextStr += ' ';
      }
      if (iText > 11) {
        timeTextStr += dateStr[iText - 1];
      }
    }
    tdT.appendChild(document.createTextNode(timeTextStr));
    tdSat = tr.insertCell();
    tdSat.appendChild(document.createTextNode(_satChngTable[i].SCC.toString()));
    tdInc = tr.insertCell();
    tdInc.appendChild(document.createTextNode(_satChngTable[i].inc.toFixed(2)));
    tdPer = tr.insertCell();
    const deltaMeanMo = _satChngTable[i].meanmo;
    const origPer = 1440 / (sat.meanMotion + deltaMeanMo);
    const perDelta = 1440 / sat.meanMotion - origPer;

    tdPer.appendChild(document.createTextNode(perDelta.toFixed(2)));
  }

  return { resp: json, satChngTable: _satChngTable };
};
