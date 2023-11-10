import calendar2Png from '@app/img/icons/calendar2.png';
import { LaunchInfoObject } from '@app/js/interfaces';
import { keepTrackApi, KeepTrackApiEvents } from '@app/js/keepTrackApi';
import { openColorbox } from '@app/js/lib/colorbox';
import { dateFormat } from '@app/js/lib/dateFormat';
import { getEl } from '@app/js/lib/get-el';
import { saveCsv } from '@app/js/lib/saveVariable';
import { truncateString } from '@app/js/lib/truncate-string';
import { errorManagerInstance } from '@app/js/singletons/errorManager';
import { clickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';

export class NextLaunchesPlugin extends KeepTrackPlugin {
  bottomIconCallback: () => void = () => {
    if (!this.isMenuButtonEnabled) return;
    if (window.location.hostname === 'localhost') {
      keepTrackApi.getUiManager().toast('This feature is a static table when in offline mode.', 'caution');
    }
    this.showTable();
  };

  static PLUGIN_NAME = 'Next Launches';
  constructor() {
    super(NextLaunchesPlugin.PLUGIN_NAME);
  }

  bottomIconElementName: string = 'menu-nextLaunch';
  bottomIconImg = calendar2Png;
  bottomIconLabel: string = 'Next Launches';

  dragOptions: clickDragOptions = {
    isDraggable: true,
    maxWidth: 650,
    minWidth: 450,
  };

  helpTitle = `Next Launches Menu`;
  helpBody = keepTrackApi.html`The Next Launches Menu pulls data from <a href="https://thespacedevs.com/" target="_blank">The Space Devs</a> to display upcoming launches.`;

  sideMenuElementName: string = 'nextLaunch-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
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
  </div>`;

  launchList = [];

  addHtml(): void {
    super.addHtml();
    import('./next-launches.css').then((resp) => resp);
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('export-launch-info').addEventListener('click', () => {
          saveCsv(this.launchList, 'launchList');
        });
      },
    });
  }

  showTable() {
    if (this.launchList.length === 0) {
      const apiUrl = window.location.hostname === 'localhost' ? 'lldev' : 'll';
      fetch(`https://${apiUrl}.thespacedevs.com/2.0.0/launch/upcoming/?format=json&limit=20&mode=detailed`)
        .then((resp) => resp.json())
        .then((data) => this.processData(data))
        .catch(() => errorManagerInstance.warn(`https://${apiUrl}.thespacedevs.com/2.0.0/ is Unavailable!`))
        .finally(() => {
          const tbl: HTMLTableElement = <HTMLTableElement>getEl('nextLaunch-table'); // Identify the table to update
          if (!tbl) return;

          // Only needs populated once
          if (tbl.innerHTML == '') {
            NextLaunchesPlugin.initTable(tbl, this.launchList);
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

  processData(resp: { results: Array<any> }) {
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
      launchInfo.location = launchLibResult.pad?.location?.name.split(',', 1)[0];
      launchInfo.locationURL = launchLibResult.pad?.wiki_url;
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
      launchInfo.rocket = launchLibResult.rocket?.configuration.full_name;
      launchInfo.rocketConfig = launchLibResult.rocket?.configuration.name;
      launchInfo.rocketFamily = launchLibResult.rocket?.configuration.family;
      if (typeof launchLibResult.rocket.configuration.wiki_url != 'undefined') {
        launchInfo.rocketURL = launchLibResult.rocket.configuration.wiki_url;
      }
      this.launchList[i] = launchInfo;
    }
  }

  static makeTableHeaders(tbl: HTMLTableElement): void {
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
  }

  static initTable(tbl: HTMLTableElement, launchList: LaunchInfoObject[]) {
    NextLaunchesPlugin.makeTableHeaders(tbl);

    for (let i = 0; i < launchList.length; i++) {
      const tr = tbl.insertRow();

      // Time Cells
      const tdT = tr.insertCell();
      const timeText = launchList[i].windowStart.valueOf() <= Date.now() - 1000 * 60 * 60 * 24 ? 'TBD' : dateFormat(launchList[i].windowStart, 'isoDateTime', true) + ' UTC';
      tdT.appendChild(document.createTextNode(timeText));

      // Name Cells
      const tdN = tr.insertCell();

      // Mission Name Text
      const nameText = launchList[i]?.missionName || 'Unknown';
      // Mission Name HTML Setup
      const nameHTML =
        !launchList[i]?.missionURL || launchList[i].missionURL === ''
          ? `${truncateString(nameText, 15)}`
          : `<a class='iframe' href="${launchList[i].missionURL}">${truncateString(nameText, 15)}</a>`;

      // Rocket Name HTML Setup
      const rocketHTML = !launchList[i]?.rocketURL ? `${launchList[i].rocket}` : `<a class='iframe' href="${launchList[i].rocketURL}">${launchList[i].rocket}</a>`;

      // Set Name and Rocket HTML
      tdN.innerHTML = `${nameHTML}<br />${rocketHTML}`;

      // Location Name HTML Setup
      const locationHTML =
        !launchList[i]?.locationURL || launchList[i]?.locationURL === ''
          ? `${truncateString(launchList[i].location, 25)}`
          : `<a class='iframe' href="${launchList[i].locationURL}">${truncateString(launchList[i].location, 25)}</a>`;

      const tdL = tr.insertCell();
      tdL.innerHTML = locationHTML;

      // Agency Name HTML Setup
      const agencyHTML = !launchList[i]?.agencyURL
        ? `${truncateString(launchList[i].agency, 30)}`
        : `<a class='iframe' href="${launchList[i].agencyURL}">${truncateString(launchList[i].agency, 30)}</a>`;

      const tdA = tr.insertCell();
      tdA.innerHTML = agencyHTML;

      // Country Cell
      const tdC = tr.insertCell();
      tdC.innerHTML = `<span class="badge dark-gray-badge" data-badge-caption="${launchList[i].country}"></span>`;
    }
  }
}

export const nextLaunchesPlugin = new NextLaunchesPlugin();
