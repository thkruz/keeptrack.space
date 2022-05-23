import calendar2Png from '@app/img/icons/calendar2.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { LaunchInfoObject } from '@app/js/api/keepTrackTypes';
import { dateFormat } from '@app/js/lib/external/dateFormat.js';
import { clickAndDragWidth, getEl, openColorbox, saveCsv, slideInRight, slideOutLeft, truncateString } from '@app/js/lib/helpers';
import { uiManager } from '@app/js/uiManager/uiManager';
/* */

let isNextLaunchMenuOpen = false;

/**
 * @returns {HTMLTableElement | boolean} The Table Element to be modified in the UI or a false boolean to kill the parent method
 */
export const getTableElement = (): HTMLTableElement | boolean => {
  const tbl: HTMLTableElement = <HTMLTableElement>getEl('nextLaunch-table'); // Identify the table to update
  if (tbl == null) {
    return false;
  }
  return tbl;
};

export const makeTableHeaders = (tbl: HTMLTableElement): void => {
  const tr = tbl.insertRow();
  const tdT = tr.insertCell();
  tdT.appendChild(document.createTextNode('Launch Window'));
  tdT.setAttribute('style', 'text-decoration: underline; width: 120px;');
  const tdN = tr.insertCell();
  tdN.appendChild(document.createTextNode('Mission'));
  tdN.setAttribute('style', 'text-decoration: underline; width: 140px;');
  const tdL = tr.insertCell();
  tdL.appendChild(document.createTextNode('Location'));
  tdL.setAttribute('style', 'text-decoration: underline');
  const tdA = tr.insertCell();
  tdA.appendChild(document.createTextNode('Agency'));
  tdA.setAttribute('style', 'text-decoration: underline');
  const tdC = tr.insertCell();
  tdC.appendChild(document.createTextNode('Country'));
  tdC.setAttribute('style', 'text-decoration: underline');
};

export const initTable = (tbl: HTMLTableElement, launchList: LaunchInfoObject[]) => {
  // NOSONAR
  makeTableHeaders(tbl);

  for (let i = 0; i < launchList.length; i++) {
    const tr = tbl.insertRow();

    // Time Cells
    const tdT = tr.insertCell();
    let timeText;
    if (launchList[i].windowStart.valueOf() <= Date.now() - 1000 * 60 * 60 * 24) {
      timeText = 'TBD';
    } else {
      timeText = dateFormat(launchList[i].windowStart, 'isoDateTime', true) + ' UTC';
    }
    tdT.appendChild(document.createTextNode(timeText));

    // Name Cells
    const tdN = tr.insertCell();

    // Mission Name Text
    const nameText = typeof launchList[i].missionName != 'undefined' ? launchList[i].missionName : 'Unknown';
    // Mission Name HTML Setup
    let nameHTML;
    if (typeof launchList[i].missionURL == 'undefined' || launchList[i].missionURL == '') {
      nameHTML = `${truncateString(nameText, 15)}`;
    } else {
      nameHTML = `<a class='iframe' href="${launchList[i].missionURL}">${truncateString(nameText, 15)}</a>`;
    }

    // Rocket Name HTML Setup
    let rocketHTML;
    if (typeof launchList[i].rocketURL == 'undefined') {
      rocketHTML = `${launchList[i].rocket}`;
    } else {
      rocketHTML = `<a class='iframe' href="${launchList[i].rocketURL}">${launchList[i].rocket}</a>`;
    }

    // Set Name and Rocket HTML
    tdN.innerHTML = `${nameHTML}<br />${rocketHTML}`;

    // Location Name HTML Setup
    let locationHTML;
    if (typeof launchList[i].locationURL == 'undefined' || launchList[i].locationURL == '') {
      locationHTML = `${truncateString(launchList[i].location, 25)}`;
    } else {
      locationHTML = `<a class='iframe' href="${launchList[i].locationURL}">${truncateString(launchList[i].location, 25)}</a>`;
    }

    const tdL = tr.insertCell();
    tdL.innerHTML = locationHTML;

    // Agency Name HTML Setup
    let agencyHTML;
    if (typeof launchList[i].agencyURL == 'undefined') {
      agencyHTML = `${truncateString(launchList[i].agency, 30)}`;
    } else {
      agencyHTML = `<a class='iframe' href="${launchList[i].agencyURL}">${truncateString(launchList[i].agency, 30)}</a>`;
    }

    const tdA = tr.insertCell();
    tdA.innerHTML = agencyHTML;

    // Country Cell
    const tdC = tr.insertCell();
    tdC.innerHTML = `<span class="badge dark-blue-badge" data-badge-caption="${launchList[i].country}"></span>`;
  }
};

export const hideSideMenus = (): void => {
  slideOutLeft(getEl('nextLaunch-menu'), 1000);
  getEl('menu-nextLaunch').classList.remove('bmenu-item-selected');
  isNextLaunchMenuOpen = false;
};
export const uiManagerInit = () => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
      <div id="nextLaunch-menu" class="side-menu-parent start-hidden text-select">
        <div id="nextLaunch-content" class="side-menu">
          <div class="row">
            <h5 class="center-align">Next Launches</h5>
            <table id="nextLaunch-table" class="center-align striped-light centered"></table>
          </div>
          <div class="row">
            <center>
              <button id="export-launch-info" class="btn btn-ui waves-effect waves-light">Export Launch Info &#9658;</button>
            </center>
          </div>
        </div>
      </div>
    `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-nextLaunch" class="bmenu-item">
          <img alt="calendar" src="" delayedsrc="${calendar2Png}" />
          <span class="bmenu-title">Next Launches</span>
          <div class="status-icon"></div>
        </div>
      `
  );

  clickAndDragWidth(getEl('nextLaunch-menu'), {
    maxWidth: 650,
    minWidth: 450,
  });

  getEl('export-launch-info').addEventListener('click', function () {
    saveCsv(<any>nextLaunchManager.launchList, 'launchList');
  });
};

export const init = (): void => {
  // Load CSS
  import('./next-launch.css').then((resp) => resp);

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'nextLaunchManager',
    cb: uiManagerInit,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'nextLaunch',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'nextLaunch',
    cb: hideSideMenus,
  });

  keepTrackApi.register({
    method: 'onCruncherReady',
    cbName: 'nextLaunch',
    cb: (): void => {
      nextLaunchManager.init();
    },
  });
};

export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-nextLaunch') {
    if (window.location.hostname === 'localhost') {
      uiManager.toast('This feature is not available offline.', 'critical');
    } else {
      if (isNextLaunchMenuOpen) {
        keepTrackApi.programs.uiManager.hideSideMenus();
        isNextLaunchMenuOpen = false;
        return;
      } else {
        keepTrackApi.programs.uiManager.hideSideMenus();
        nextLaunchManager.showTable();
        slideInRight(getEl('nextLaunch-menu'), 1000);
        isNextLaunchMenuOpen = true;
        getEl('menu-nextLaunch').classList.add('bmenu-item-selected');
        return;
      }
    }
  }
};

export const nextLaunchManager: { launchList: Array<LaunchInfoObject>; init: () => void; showTable: () => void; processData: any } = {
  launchList: [],
  init: () => {
    if (settingsManager.offline) getEl('menu-nextLaunch').style.display = 'none';
  },
  showTable: () => {
    // NOSONAR
    if (nextLaunchManager.launchList.length === 0) {
      if (window.location.hostname !== 'localhost') {
        fetch('https://ll.thespacedevs.com/2.0.0/launch/upcoming/?format=json&limit=20&mode=detailed')
          .then((resp) => resp.json())
          .then((data) => nextLaunchManager.processData(data))
          .catch(() => console.debug(`https://ll.thespacedevs.com/2.0.0/ is Unavailable!`))
          .finally(() => {
            const tbl = getTableElement();
            if (typeof tbl == 'boolean') return;

            // Only needs populated once
            if (tbl.innerHTML == '') {
              initTable(tbl, nextLaunchManager.launchList);
              const aElements = getEl('nextLaunch-table').querySelectorAll('a');
              aElements.forEach((element) => {
                element.addEventListener('click', (e) => {
                  e.preventDefault();
                  openColorbox(element.href);
                });
              });
            }
          });
      }
    }
  },
  processData: (resp: { results: Array<any> }) => {
    // NOSONAR
    for (let i = 0; i < resp.results.length; i++) {
      /**
       * Info from launchlibrary.net
       */
      const launchLibResult = resp.results[i];

      const launchInfo: LaunchInfoObject = {
        name: '',
        updated: null,
        windowStart: new Date(launchLibResult.window_start),
        windowEnd: new Date(launchLibResult.window_end),
        location: '',
        locationURL: '',
        agency: '',
        agencyURL: '',
        country: '',
        mission: '',
        missionName: '',
        missionType: '',
        missionURL: '',
        rocket: '',
        rocketConfig: '',
        rocketFamily: '',
        rocketURL: '',
      };

      if (typeof launchLibResult.last_updated !== 'undefined') launchInfo.updated = new Date(launchLibResult.last_updated);
      launchInfo.name = typeof launchLibResult.name != 'undefined' ? launchLibResult.name : 'Unknown';
      launchInfo.location = launchLibResult.pad.location.name.split(',', 1);
      launchInfo.location = launchInfo.location[0];
      launchInfo.locationURL = launchLibResult.pad.wiki_url;
      if (typeof launchLibResult.launch_service_provider != 'undefined') {
        launchInfo.agency = typeof launchLibResult.launch_service_provider.name != 'undefined' ? launchLibResult.launch_service_provider.name : 'Unknown';
        launchInfo.country = typeof launchLibResult.launch_service_provider.country_code != 'undefined' ? launchLibResult.launch_service_provider.country_code : 'Unknown';
        if (typeof launchLibResult.launch_service_provider.wiki_url != 'undefined') {
          launchInfo.agencyURL = launchLibResult.launch_service_provider.wiki_url;
        }
      } else {
        launchInfo.agency = 'Unknown';
        launchInfo.country = 'UNK';
        launchInfo.agencyURL = '';
      }
      if (launchLibResult.mission != null) {
        launchInfo.mission = launchLibResult.mission.description;
        launchInfo.missionName = launchLibResult.mission.name;
        launchInfo.missionType = launchLibResult.mission.type;
        if (typeof launchLibResult.mission.wiki_url != 'undefined') {
          launchInfo.missionURL = launchLibResult.mission.wiki_url;
        }
      }
      launchInfo.rocket = launchLibResult.rocket.configuration.full_name;
      launchInfo.rocketConfig = launchLibResult.rocket.configuration.name;
      launchInfo.rocketFamily = launchLibResult.rocket.configuration.family;
      if (typeof launchLibResult.rocket.configuration.wiki_url != 'undefined') {
        launchInfo.rocketURL = launchLibResult.rocket.configuration.wiki_url;
      }
      nextLaunchManager.launchList[i] = launchInfo;
    }
  },
};
