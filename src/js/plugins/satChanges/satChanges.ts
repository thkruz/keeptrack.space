import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatChngObject } from '@app/js/api/keepTrackTypes';
import { dateFromJday } from '@app/js/timeManager/transforms';
import $ from 'jquery';
import satChngPng from '@app/img/icons/sats.png';

let issatChngMenuOpen = false;
keepTrackApi.programs.satChange = {
  satChngTable: null,
};

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'satChanges',
    cb: uiManagerInit,
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
  $('#left-menus').append(keepTrackApi.html`
        <div id="satChng-menu" class="side-menu-parent start-hidden text-select">
          <div id="satChng-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Interesting Movements</h5>
              <table id="satChng-table" class="center-align"></table>
            </div>
          </div>
        </div>
      `);

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-satChng" class="bmenu-item">
          <img alt="satchng" src="" delayedsrc=${satChngPng}/>
          <span class="bmenu-title">Satellite Changes</span>
          <div class="status-icon"></div>
        </div>
      `);

  $('#satChng-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#satChng-menu').on('click', '.satChng-object', function (evt: Event) {
    // Might be better code for this.
    const hiddenRow = (<any>evt.currentTarget).attributes.hiddenrow.value;
    if (hiddenRow !== null) {
      satChng(parseInt(hiddenRow));
    }
  });
};

export const satChng = (row: number): void => {
  const { satChange, uiManager } = keepTrackApi.programs;
  let satChngTable: SatChngObject[] = satChange.satChngTable;
  if (typeof row !== 'number') throw new Error('Row must be a number');
  if (row !== -1 && typeof satChngTable[row] === 'undefined') throw new Error('Row does not exist');

  if (row === -1 && satChngTable?.length === 0) {
    // Only generate the table if receiving the -1 argument for the first time
    $.get('./analysis/satchng.json?v=' + settingsManager.versionNumber).done((resp) => {
      ({ satChngTable } = getSatChngJson(resp));
      satChange.satChngTable = satChngTable;
    });
  }
  if (row !== -1) {
    // If an object was selected from the menu
    if (!satChngTable[row].SCC) return;
    uiManager.doSearch(satChngTable[row].SCC.toString()); // Actually perform the search of the two objects
    $('#anal-sat').val(satChngTable[row].SCC.toString());
  } // If a row was selected
};

export const hideSideMenus = (): void => {
  $('#satChng-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-satChng').removeClass('bmenu-item-selected');
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
      $('#satChng-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
      issatChngMenuOpen = true;
      satChng(-1);
      $('#menu-satChng').addClass('bmenu-item-selected');
      return;
    }
  }
};

export const getSatChngJson = (resp: any) => { // NOSONAR
  resp = [...new Set(resp)];

  const { satSet } = keepTrackApi.programs;

  for (let i = 0; i < resp.length; i++) {
    const prefix = resp[i].year > 50 ? '19' : '20';
    const year = parseInt(prefix + resp[i].year.toString());
    let date = dateFromJday(year, resp[i].day);
    date = new Date(date.getTime() + (resp[i].day % 1) * 1440 * 60000);
    resp[i].date = date;
  }
  const satChngTable = resp;
  // satChng Menu
  const tbl = <HTMLTableElement>document.getElementById('satChng-table'); // Identify the table to update
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
  for (let i = 0; i < Math.min(satChngTable.length, 20); i++) {
    const sat = satSet.getSat(satSet.getIdFromObjNum(satChngTable[i].SCC));

    // Skip Decays
    if (sat === null) continue;

    tr = tbl.insertRow();
    tr.setAttribute('class', 'satChng-object link');
    tr.setAttribute('hiddenrow', i.toString());
    tdT = tr.insertCell();
    const dateStr = satChngTable[i].date.toJSON();
    let timeTextStr = '';
    for (let iText = 0; iText < 20; iText++) {
      if (iText < 10) timeTextStr += dateStr[iText];
      if (iText === 10) timeTextStr += ' ';
      if (iText > 11) timeTextStr += dateStr[iText - 1];
    }
    tdT.appendChild(document.createTextNode(timeTextStr));
    tdSat = tr.insertCell();
    tdSat.appendChild(document.createTextNode(satChngTable[i].SCC.toString()));
    tdInc = tr.insertCell();
    tdInc.appendChild(document.createTextNode(satChngTable[i].inc.toFixed(2)));
    tdPer = tr.insertCell();
    const deltaMeanMo = satChngTable[i].meanmo;
    const origPer = 1440 / (sat.meanMotion + deltaMeanMo);
    const perDelta = 1440 / sat.meanMotion - origPer;
    tdPer.appendChild(document.createTextNode(perDelta.toFixed(2)));
  }
  return { resp, satChngTable };
};
