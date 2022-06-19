import satChngPng from '@app/img/icons/sats.png';
import { isThisJest, keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatChngObject } from '@app/js/api/keepTrackTypes';
import { clickAndDragWidth, getEl, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import { dateFromJday } from '@app/js/timeManager/transforms';
import './components/sat-changes.css';

let issatChngMenuOpen = false;

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'satChanges',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'satChanges',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'satChanges',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'satChanges',
    cb: hideSideMenus,
  });
};

export const uiManagerInit = () => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="satChng-menu" class="side-menu-parent start-hidden text-select">
          <div id="satChng-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Interesting Movements</h5>
              <table id="satChng-table" class="center-align"></table>
            </div>
          </div>
        </div>
      `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-satChng" class="bmenu-item">
          <img alt="satchng" src="" delayedsrc="${satChngPng}" />
          <span class="bmenu-title">Satellite Changes</span>
          <div class="status-icon"></div>
        </div>
        `
  );
};

const uiManagerFinal = () => {
  clickAndDragWidth(getEl('satChng-menu'), {
    minWidth: 330,
    maxWidth: 600,
  });

  getEl('satChng-menu').addEventListener('click', function (evt: Event) {
    if (!(<HTMLElement>evt.target).classList.contains('satChng-object')) return;
    // Might be better code for this.
    const hiddenRow = (<any>evt.currentTarget).attributes.hiddenrow.value;
    if (hiddenRow !== null) {
      satChng(parseInt(hiddenRow));
    }
  });
};

let satChngTable: SatChngObject[] = [];
export const satChng = (row: number, testOverride?: any): void => {
  const { uiManager } = keepTrackApi.programs;

  // If we are testing, we can override the satChange object.
  if (isThisJest()) {
    ({ satChngTable } = getSatChngJson(testOverride));
  }

  if (typeof row !== 'number') throw new Error('Row must be a number');
  if (row !== -1 && typeof satChngTable[row] === 'undefined') throw new Error('Row does not exist');

  if (row === -1 && satChngTable?.length === 0) {
    // Only generate the table if receiving the -1 argument for the first time
    fetch('./analysis/satchng.json?v=' + settingsManager.versionNumber).then((resp) => {
      resp.json().then((json) => {
        ({ satChngTable } = getSatChngJson(json));
      });
    });
  }
  if (row !== -1) {
    // If an object was selected from the menu
    if (!satChngTable[row].SCC) return;
    uiManager.doSearch(satChngTable[row].SCC.toString()); // Actually perform the search of the two objects
    (<HTMLInputElement>getEl('anal-sat')).value = satChngTable[row].SCC.toString();
  } // If a row was selected
};

export const hideSideMenus = (): void => {
  slideOutLeft(getEl('satChng-menu'), 1000);
  getEl('menu-satChng').classList.remove('bmenu-item-selected');
  issatChngMenuOpen = false;
};

export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-satChng') {
    const { uiManager } = keepTrackApi.programs;
    if (issatChngMenuOpen) {
      issatChngMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();
      slideInRight(getEl('satChng-menu'), 1000);
      issatChngMenuOpen = true;
      satChng(-1);
      getEl('menu-satChng').classList.add('bmenu-item-selected');
      return;
    }
  }
};

export const getSatChngJson = (json: any) => { // NOSONAR
  // TODO: This is a temporary fix for the fact that the JSON is not being parsed correctly.
  if (!json && isThisJest()) return { resp: json, satChngTable: [] };  
  const { satSet } = keepTrackApi.programs;

  for (let i = 0; i < json.length; i++) {
    const prefix = json[i].year > 50 ? '19' : '20';
    const year = parseInt(prefix + json[i].year.toString());
    let date = dateFromJday(year, json[i].day);
    date = new Date(date.getTime() + (json[i].day % 1) * 1440 * 60000);
    json[i].date = date;
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
    const sat = satSet.getSat(satSet.getIdFromObjNum(_satChngTable[i].SCC));

    // Skip Decays
    if (sat === null) continue;

    tr = tbl.insertRow();
    tr.setAttribute('class', 'satChng-object link');
    tr.setAttribute('hiddenrow', i.toString());
    tdT = tr.insertCell();
    const dateStr = _satChngTable[i].date.toJSON();
    let timeTextStr = '';
    for (let iText = 0; iText < 20; iText++) {
      if (iText < 10) timeTextStr += dateStr[iText];
      if (iText === 10) timeTextStr += ' ';
      if (iText > 11) timeTextStr += dateStr[iText - 1];
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
