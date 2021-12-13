import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatChngObject } from '@app/js/api/keepTrackTypes';
import { dateFromJday } from '@app/js/timeManager/transforms';
import { uiManager } from '@app/js/uiManager/uiManager';
import $ from 'jquery';

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
          <img alt="satchng" src="" delayedsrc="data:image/png;base64,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">
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
  const { satChange } = keepTrackApi.programs;
  let satChngTable: SatChngObject[] = satChange.satChngTable;
  if (typeof row !== 'number') throw new Error('Row must be a number');
  if (row !== -1 && typeof satChngTable[row] === 'undefined') throw new Error('Row does not exist');

  if (row === -1 && satChngTable?.length === 0) {
    // Only generate the table if receiving the -1 argument for the first time
    $.get('/analysis/satchng.json?v=' + settingsManager.versionNumber).done((resp) => {
      ({ resp, satChngTable } = getSatChngJson(resp, satChngTable));
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

export const getSatChngJson = (resp: any, satChngTable: SatChngObject[]) => {
  resp = [...new Set(resp)];

  const { satSet } = keepTrackApi.programs;

  for (let i = 0; i < resp.length; i++) {
    const prefix = resp[i].year > 50 ? '19' : '20';
    const year = parseInt(prefix + resp[i].year.toString());
    let date = dateFromJday(year, resp[i].day);
    date = new Date(date.getTime() + (resp[i].day % 1) * 1440 * 60000);
    resp[i].date = date;
  }
  satChngTable = resp;
  // satChng Menu
  const tbl = <HTMLTableElement>document.getElementById('satChng-table'); // Identify the table to update
  tbl.innerHTML = ''; // Clear the table from old object data

  // var tblLength = 0;                                   // Iniially no rows to the table
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
