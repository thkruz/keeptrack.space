import socratesPng from '@app/img/icons/socrates.png';
import $ from 'jquery';
import { keepTrackApi } from '../../api/keepTrackApi';
import { stringPad } from '../../lib/helpers';

let isSocratesMenuOpen = false;
let socratesOnSatCruncher: number | null = null;
keepTrackApi.programs.socrates = {
  socratesObjOne: [], // Array for tr containing CATNR1
  socratesObjTwo: [], // Array for tr containing CATNR2
};

export const uiManagerInit = () => {
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
        <div id="socrates-menu" class="side-menu-parent start-hidden text-select">
          <div id="socrates-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Possible collisions</h5>
              <table id="socrates-table" class="center-align"></table>
            </div>
          </div>
        </div>
      `);

  $('#socrates-menu').on('click', '.socrates-object', (evt: any) => {
    // Might be better code for this.
    const hiddenRow = evt.currentTarget.attributes.hiddenrow.value;
    if (hiddenRow !== null) {
      socrates(hiddenRow);
    }
  });

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-satellite-collision" class="bmenu-item">
          <img alt="socrates" src="" delayedsrc=${socratesPng}/>
          <span class="bmenu-title">Collisions</span>
          <div class="status-icon"></div>
        </div>
      `);

  // Allow resizing of the side menu
  $('#socrates-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 290,
  });
};
export const adviceReady = () => {
  const aM = keepTrackApi.programs.adviceManager;
  aM.adviceCount.socrates = 0;

  aM.adviceList.socrates = () => {
    // Only Do this Twice
    if (aM.adviceCount.socrates >= 3) return;
    aM.adviceCount.socrates += 1;

    aM.showAdvice(
      'SOCRATES Near Conjunction List',
      'Did you know that objects frequently come close to colliding? Using data from Center for Space Standards and Innovation you can find upcoming possible collisions.',
      $('#menu-satellite-collision'),
      'bottom'
    );
  };
  aM.adviceArray.push(aM.adviceList.socrates);
};
export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-satellite-collision') {
    if (isSocratesMenuOpen) {
      isSocratesMenuOpen = false;
      keepTrackApi.programs.uiManager.hideSideMenus();
      return;
    } else {
      if (settingsManager.isMobileModeEnabled) keepTrackApi.programs.uiManager.searchToggle(false);
      keepTrackApi.programs.uiManager.hideSideMenus();
      $('#socrates-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
      isSocratesMenuOpen = true;
      socrates(-1);
      $('#menu-satellite-collision').addClass('bmenu-item-selected');
      return;
    }
  }
};
export const hideSideMenus = (): void => {
  $('#socrates-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-satellite-collision').removeClass('bmenu-item-selected');
  isSocratesMenuOpen = false;
};
export const onCruncherMessage = (): void => {
  if (socratesOnSatCruncher !== null) {
    keepTrackApi.programs.objectManager.setSelectedSat(socratesOnSatCruncher);
    socratesOnSatCruncher = null;
  }
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'collisions',
    cb: uiManagerInit,
  });

  // Add Advice Info
  keepTrackApi.register({
    method: 'adviceReady',
    cbName: 'Collisions',
    cb: adviceReady,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'collisions',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'collisions',
    cb: hideSideMenus,
  });

  keepTrackApi.register({
    method: 'onCruncherMessage',
    cbName: 'collisions',
    cb: onCruncherMessage,
  });
};

export const MMMtoInt = (month: string) => {
  switch (month) {
    case 'Jan':
      return 0;
    case 'Feb':
      return 1;
    case 'Mar':
      return 2;
    case 'Apr':
      return 3;
    case 'May':
      return 4;
    case 'Jun':
      return 5;
    case 'Jul':
      return 6;
    case 'Aug':
      return 7;
    case 'Sep':
      return 8;
    case 'Oct':
      return 9;
    case 'Nov':
      return 10;
    case 'Dec':
      return 11;
    default:
      throw new Error('Invalid Month');
  }
};
export const findFutureDate = (socratesObjTwo: any[][], row: number) => {
  const socratesDate = socratesObjTwo[row][4].split(' '); // Date/time is on the second line 5th column
  const socratesTime = socratesDate[3].split(':'); // Split time from date for easier management

  const sYear = parseInt(socratesDate[0]); // UTC Year
  const sMon = MMMtoInt(socratesDate[1]); // UTC Month in MMM prior to converting
  const sDay = parseInt(socratesDate[2]); // UTC Day
  const sHour = parseInt(socratesTime[0]); // UTC Hour
  const sMin = parseInt(socratesTime[1]); // UTC Min
  const sSec = parseInt(socratesTime[2]); // UTC Sec - This is a decimal, but when we convert to int we drop those

  const selectedDate = new Date(sYear, sMon, sDay, sHour, sMin, sSec); // New Date object of the future collision
  // Date object defaults to local time.
  selectedDate.setUTCDate(sDay); // Move to UTC day.
  selectedDate.setUTCHours(sHour); // Move to UTC Hour

  const today = new Date();
  // Find the offset from today 60 seconds before possible collision
  keepTrackApi.programs.timeManager.changeStaticOffset(selectedDate.getTime() - today.getTime() - 1000 * 30);
  keepTrackApi.programs.mainCamera.isCamSnapMode = false;
  keepTrackApi.programs.timeManager.calculateSimulationTime();
}; // Allows passing -1 argument to socrates function to skip these steps

export const socrates = (row: number) => {
  if (isNaN(row)) throw new Error('SOCRATES: Row is not a number');

  // SOCRATES Variables
  const { socratesObjOne, socratesObjTwo } = keepTrackApi.programs.socrates;

  /* SOCRATES.htm is a 20 row .pl script pulled from celestrak.com/cgi-bin/searchSOCRATES.pl
    If it ever becomes unavailable a similar, but less accurate (maybe?) cron job could be
    created using satCruncer.

    The variable row determines which set of objects on SOCRATES.htm we are using. First
    row is 0 and last one is 19. */
  if (row === -1 && socratesObjOne.length === 0 && socratesObjTwo.length === 0) {
    // Only generate the table if receiving the -1 argument for the first time
    $.get('/SOCRATES.htm', (socratesHTM: Document) => processSocratesHtm(socratesHTM));
  }
  if (row !== -1) {
    // If an object was selected from the menu
    findFutureDate(socratesObjTwo, row); // Jump to the date/time of the collision

    keepTrackApi.programs.uiManager.doSearch(socratesObjOne[row][1] + ',' + socratesObjTwo[row][0]); // Actually perform the search of the two objects
    socratesOnSatCruncher = keepTrackApi.programs.satSet.getIdFromObjNum(socratesObjOne[row][1]);
  } // If a row was selected
};
export const processSocratesHtm = (socratesHTM: Document): void => {
  const { socratesObjOne, socratesObjTwo } = keepTrackApi.programs.socrates;

  // Load SOCRATES.htm so we can use it instead of index.html
  const tableRowOne = $("[name='CATNR1']", socratesHTM).closest('tr'); // Find the row(s) containing the hidden input named CATNR1
  const tableRowTwo = $("[name='CATNR2']", socratesHTM).closest('tr'); // Find the row(s) containing the hidden input named CATNR2

  // eslint-disable-next-line no-unused-vars
  tableRowOne.each(function (_rowIndex: number, _r: number) {
    const cols: any[] = [];
    $(this)
      .find('td')
      .each(function (_colIndex: number, c: any) {
        cols.push(c.textContent);
      });
    socratesObjOne.push(cols);
  });
  // eslint-disable-next-line no-unused-vars
  tableRowTwo.each(function (_rowIndex: number, _r: number) {
    const cols: any[] = [];
    $(this)
      .find('td')
      .each(function (_colIndex: number, c: any) {
        cols.push(c.textContent);
      });
    socratesObjTwo.push(cols);
  });
  // SOCRATES Menu
  const tbl = <HTMLTableElement>document.getElementById('socrates-table'); // Identify the table to update
  tbl.innerHTML = ''; // Clear the table from old object data
  let tr = tbl.insertRow();
  let tdT = tr.insertCell();
  tdT.appendChild(document.createTextNode('Time'));
  tdT.setAttribute('style', 'text-decoration: underline');
  let tdS1 = tr.insertCell();
  tdS1.appendChild(document.createTextNode('#1'));
  tdS1.setAttribute('style', 'text-decoration: underline');
  let tdS2 = tr.insertCell();
  tdS2.appendChild(document.createTextNode('#2'));
  tdS2.setAttribute('style', 'text-decoration: underline');

  for (let i = 0; i < 20; i++) {
    if (typeof socratesObjTwo[i] == 'undefined') break;
    // 20 rows
    if (typeof socratesObjTwo[i][4] == 'undefined') continue;
    tr = tbl.insertRow();
    tr.setAttribute('class', 'socrates-object link');
    tr.setAttribute('hiddenrow', i.toString());
    tdT = tr.insertCell();
    const socratesDate = socratesObjTwo[i][4].split(' '); // Date/time is on the second line 5th column
    const socratesTime = socratesDate[3].split(':'); // Split time from date for easier management
    const socratesTimeS = socratesTime[2].split('.'); // Split time from date for easier management
    tdT.appendChild(
      document.createTextNode(
        socratesDate[2] +
          ' ' +
          socratesDate[1] +
          ' ' +
          socratesDate[0] +
          ' - ' +
          stringPad.pad0(socratesTime[0], 2) +
          ':' +
          stringPad.pad0(socratesTime[1], 2) +
          ':' +
          stringPad.pad0(socratesTimeS[0], 2) +
          'Z'
      )
    );
    tdS1 = tr.insertCell();
    tdS1.appendChild(document.createTextNode(socratesObjOne[i][1]));
    tdS2 = tr.insertCell();
    tdS2.appendChild(document.createTextNode(socratesObjTwo[i][0]));
  }

  keepTrackApi.programs.socrates = { socratesObjOne, socratesObjTwo };
};
