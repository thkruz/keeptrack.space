/* */

import { saveCsv, truncateString } from '@app/js/lib/helpers';
import $ from 'jquery';
import { dateFormat } from '@app/js/lib/external/dateFormat.js';
import { keepTrackApi } from '@app/js/api/externalApi';
import { settingsManager } from '@app/js/settingsManager/settingsManager';

type LaunchInfoObject = {
  name: string;
  updated: Date;
  windowStart: Date;
  windowEnd: Date;
  location: string;
  locationURL: string;
  agency: string;
  agencyURL: string;
  country: string;
  mission: string;
  missionName: string;
  missionType: string;
  missionURL: string;
  rocket: string;
  rocketConfig: string;
  rocketFamily: string;
  rocketURL: string;
};

/**
 * @returns {HTMLTableElement | boolean} The Table Element to be modified in the UI or a false boolean to kill the parent method
 */
const _getTableElement = (): HTMLTableElement | boolean => {
  const tbl: HTMLTableElement = <HTMLTableElement>document.getElementById('nextLaunch-table'); // Identify the table to update
  if (tbl == null) {
    console.warn('nextLaunchManager.showTable failed to find nextLaunch-table element!');
    return false;
  }
  return tbl;
};

const _makeTableHeaders = (tbl: HTMLTableElement): void => {
  let tr = tbl.insertRow();
  let tdT = tr.insertCell();
  tdT.appendChild(document.createTextNode('Launch Window'));
  tdT.setAttribute('style', 'text-decoration: underline; width: 120px;');
  let tdN = tr.insertCell();
  tdN.appendChild(document.createTextNode('Mission'));
  tdN.setAttribute('style', 'text-decoration: underline; width: 140px;');
  let tdL = tr.insertCell();
  tdL.appendChild(document.createTextNode('Location'));
  tdL.setAttribute('style', 'text-decoration: underline');
  let tdA = tr.insertCell();
  tdA.appendChild(document.createTextNode('Agency'));
  tdA.setAttribute('style', 'text-decoration: underline');
  let tdC = tr.insertCell();
  tdC.appendChild(document.createTextNode('Country'));
  tdC.setAttribute('style', 'text-decoration: underline');
};

const _initTable = (tbl: HTMLTableElement, launchList: LaunchInfoObject[]) => {
  _makeTableHeaders(tbl);

  for (let i = 0; i < launchList.length; i++) {
    let tr = tbl.insertRow();

    // Time Cells
    let tdT = tr.insertCell();
    let timeText;
    if (launchList[i].windowStart.valueOf() <= Date.now() - 1000 * 60 * 60 * 24) {
      timeText = 'TBD';
    } else {
      timeText = dateFormat(launchList[i].windowStart, 'isoDateTime', true) + ' UTC';
    }
    tdT.appendChild(document.createTextNode(timeText));

    // Name Cells
    let tdN = tr.insertCell();

    // Mission Name Text
    let nameText = typeof launchList[i].missionName != 'undefined' ? launchList[i].missionName : 'Unknown';
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
      if (window.location.protocol === 'http:') {
        locationHTML = `<a class='iframe' href="${launchList[i].locationURL}">${truncateString(launchList[i].location, 25)}</a>`;
      } else {
        locationHTML = `<a class='iframe' href="${launchList[i].locationURL}">${truncateString(launchList[i].location, 25)}</a>`;
      }
    }

    let tdL = tr.insertCell();
    tdL.innerHTML = locationHTML;

    // Agency Name HTML Setup
    let agencyHTML;
    if (typeof launchList[i].agencyURL == 'undefined') {
      agencyHTML = `${truncateString(launchList[i].agency, 30)}`;
    } else {
      if (window.location.protocol === 'http:') {
        agencyHTML = `<a class='iframe' href="${launchList[i].agencyURL}">${truncateString(launchList[i].agency, 30)}</a>`;
      } else {
        agencyHTML = `<a class='iframe' href="${launchList[i].agencyURL}">${truncateString(launchList[i].agency, 30)}</a>`;
      }
    }

    let tdA = tr.insertCell();
    tdA.innerHTML = agencyHTML;

    // Country Cell
    let tdC = tr.insertCell();
    tdC.innerHTML = `<span class="badge dark-blue-badge" data-badge-caption="${launchList[i].country}"></span>`;
  }
};

export const nextLaunchManager: { launchList: Array<LaunchInfoObject>; init: () => void; showTable: () => void; processData: (resp: { results: Array<any> }) => void } = {
  launchList: [],
  init: () => {
    if ((<any>settingsManager).offline) {
      $('#menu-nextLaunch').hide();
      return;
    }

    // Won't Work Offline
    if (window.location.hostname === 'localhost') return;

    $.get('https://ll.thespacedevs.com/2.0.0/launch/upcoming/?format=json&limit=20&mode=detailed')
      .done((resp) => nextLaunchManager.processData(resp))
      .fail(() => console.warn(`https://ll.thespacedevs.com/2.0.0/ is Unavailable!`));
  },
  showTable: () => {
    const tbl = _getTableElement();
    if (typeof tbl == 'boolean') return;

    // Only needs populated once
    if (tbl.innerHTML == '') {
      _initTable(tbl, nextLaunchManager.launchList);
      try {
        $('a.iframe').colorbox({
          iframe: true,
          width: '80%',
          height: '80%',
          fastIframe: false,
          closeButton: false,
        });
      } catch (error) {
        console.warn(error);
      }
    }
  },
  processData: (resp: { results: Array<any> }) => {
    for (let i = 0; i < resp.results.length; i++) {
      /**
       * Info from launchlibrary.net
       */
      const launchLibResult = resp.results[i];

      let launchInfo: LaunchInfoObject = {
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

export const init = (): void => {
  // Load CSS
  import('@app/js/plugins/nextLaunch/nextLaunch.css').then((resp) => resp);

  let isNextLaunchMenuOpen = false;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'nextLaunchManager',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
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
    `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-nextLaunch" class="bmenu-item">
          <img alt="calendar" src="" delayedsrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAABNUlEQVR4nO3cQWrCQBiAUS29Tne9/wm680C6Erow0GBnvtG8txQxkY8/jBP1dAIAAADgKM4zD/b1c70+evzyfZ56HncrnM/HrAPxmACxp0Zta4SP5plLlgmICRATICZATIDY54gX3VoVrPDB57e95zNi1WcCYgLEhlyCtlSXmi0rnI8JiAkQG3IJskf0dyYgJkBMgJgAMQFiU/eCXp29oDckQEyAmAAxAWJTt6P3+q87VivfoTMBMQFiAsQEiAkQW3oVtHc1Mvr5I5iAmAAxAWICxASITV0Frba3Yy8IAWoCxASICRAb8kv5FfZYRhjxfk1ATICYADEBYgLEDr0XtAITEBMgJkBMgJgAsaX/rOMVv+ezlwmICRATICZATICY/wuKmYCYADEBYgLEBAAAAAAAgPd3AzYrWtKgtEhrAAAAAElFTkSuQmCC">
          <span class="bmenu-title">Next Launches</span>
          <div class="status-icon"></div>
        </div>
      `);

      $('#nextLaunch-menu').resizable({
        handles: 'e',
        stop: function () {
          $(this).css('height', '');
        },
        maxWidth: 650,
        minWidth: 450,
      });

      $('#export-launch-info').on('click', function () {
        saveCsv(<any>nextLaunchManager.launchList, 'launchList');
      });
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'nextLaunch',
    cb: (iconName: string): void => {
      if (iconName === 'menu-nextLaunch') {
        if (isNextLaunchMenuOpen) {
          keepTrackApi.programs.uiManager.hideSideMenus();
          isNextLaunchMenuOpen = false;
          return;
        } else {
          keepTrackApi.programs.uiManager.hideSideMenus();
          nextLaunchManager.showTable();
          $('#nextLaunch-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isNextLaunchMenuOpen = true;
          $('#menu-nextLaunch').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'nextLaunch',
    cb: (): void => {
      $('#nextLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-nextLaunch').removeClass('bmenu-item-selected');
      isNextLaunchMenuOpen = false;
    },
  });

  keepTrackApi.register({
    method: 'onCruncherReady',
    cbName: 'nextLaunch',
    cb: (): void => {
      nextLaunchManager.init();
    },
  });
};
