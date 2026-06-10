import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { openColorbox } from '@app/engine/utils/colorbox';
import { dateFormat } from '@app/engine/utils/dateFormat';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { truncateString } from '@app/engine/utils/truncate-string';
import calendar2Png from '@public/img/icons/calendar2.png';
import fetchPng from '@public/img/icons/download.png';
import exportPng from '@public/img/icons/export.png';
import refreshPng from '@public/img/icons/refresh.png';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import './next-launches.css';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.NextLaunchesPlugin.${key}` as Parameters<typeof t7e>[0]);

interface LaunchInfoData {
  window_start: string | number | Date;
  window_end: string | number | Date;
  last_updated: string | number | Date;
  name: string;
  pad?: {
    location: {
      name: string;
    };
    wiki_url: string;
  };
  launch_service_provider?: {
    name: string;
    country_code: string;
    wiki_url: string;
  };
  mission?: {
    description: string;
    name: string;
    type: string;
    wiki_url: string;
  };
  rocket?: {
    configuration: {
      full_name: string;
      name: string;
      family: string;
      wiki_url: string;
    };
  };

}

export interface LaunchInfoObject {
  agency: string;
  agencyURL: string;
  country: string;
  location: string;
  locationURL: string;
  mission: string;
  missionName: string;
  missionType: string;
  missionURL: string;
  name: string;
  rocket: string;
  rocketConfig: string;
  rocketFamily: string;
  rocketURL: string;
  updated: Date;
  windowEnd: Date;
  windowStart: Date;
}

export class NextLaunchesPlugin extends KeepTrackPlugin {
  readonly id = 'NextLaunchesPlugin';
  dependencies_ = [];
  private isLoggedIn_ = false;
  private isFetching_ = false;
  requiresInternet = true;

  bottomIconElementName: string = 'menu-nextLaunch';
  bottomIconImg = calendar2Png;

  dragOptions: ClickDragOptions = {
    isDraggable: true,
    maxWidth: 1000,
    minWidth: 625,
  };

  menuMode: MenuMode[] = [MenuMode.EVENTS, MenuMode.ALL];

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/next-launches/next-launches-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2')],
    };
  }

  sideMenuElementName: string = 'nextLaunch-menu';
  sideMenuElementHtml: string = html`
  <div id="nextLaunch-menu" class="side-menu-parent start-hidden">
    <div id="nextLaunch-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">${l('sideMenuTitle')}</h5>
        <div class="nl-toolbar">
          <button id="nextLaunch-fetch-btn" class="btn btn-ui waves-effect waves-light icon-btn"
            type="button" kt-tooltip="${l('tooltips.fetchData')}">
            <img src="${fetchPng}" class="icon-btn-img" alt="" />
          </button>
          <button id="nextLaunch-refresh-btn" class="btn btn-ui waves-effect waves-light icon-btn"
            type="button" kt-tooltip="${l('tooltips.refresh')}" style="display:none;">
            <img src="${refreshPng}" class="icon-btn-img" alt="" />
          </button>
          <button id="export-launch-info" class="btn btn-ui waves-effect waves-light icon-btn"
            type="button" kt-tooltip="${l('tooltips.exportLaunchInfo')}">
            <img src="" delayedsrc="${exportPng}" class="icon-btn-img" alt="" />
          </button>
        </div>
        <table id="nextLaunch-table" class="center-align striped-light centered"></table>
      </div>
    </div>
  </div>`;

  launchList = [] as LaunchInfoObject[];

  onBottomIconClick(): void {
    if (!this.isMenuButtonActive) {
      return;
    }

    this.updateToolbarForLoginState_();

    if (this.isLoggedIn_ && this.launchList.length === 0) {
      this.fetchLaunchData_();
    }
  }

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.userLogin, this.onUserLogin_.bind(this));
    EventBus.getInstance().on(EventBusEvent.userLogout, this.onUserLogout_.bind(this));

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('nextLaunch-fetch-btn', true)?.addEventListener('click', () => {
          hideEl('nextLaunch-fetch-btn');
          showEl('nextLaunch-refresh-btn', 'inline-flex');
          this.fetchLaunchData_();
        });

        getEl('nextLaunch-refresh-btn', true)?.addEventListener('click', () => {
          this.launchList = [];
          const tbl = getEl('nextLaunch-table') as HTMLTableElement | null;

          if (tbl) {
            tbl.innerHTML = '';
          }
          this.fetchLaunchData_();
        });

        getEl('export-launch-info')!.addEventListener('click', () => {
          ServiceLocator.getSoundManager()?.play(SoundNames.EXPORT);
          saveXlsx(this.launchList as unknown as Array<Record<string, unknown>>, 'launchList');
        });
      },
    );
  }

  private fetchLaunchData_(): void {
    if (this.isFetching_) {
      return;
    }
    this.isFetching_ = true;

    const apiUrl = window.location.hostname === 'localhost' ? 'lldev' : 'll';

    fetch(`https://${apiUrl}.thespacedevs.com/2.0.0/launch/upcoming/?format=json&limit=20&mode=detailed`)
      .then((resp) => resp.json())
      .then((data) => this.processData(data))
      .catch(() => errorManagerInstance.warn(`https://${apiUrl}.thespacedevs.com/2.0.0/ is Unavailable!`))
      .finally(() => {
        this.isFetching_ = false;

        const tbl = getEl('nextLaunch-table') as HTMLTableElement | null;

        if (!tbl) {
          return;
        }

        if (tbl.innerHTML === '') {
          NextLaunchesPlugin.initTable(tbl, this.launchList);
          const aElements = getEl('nextLaunch-table')!.querySelectorAll('a');

          aElements.forEach((element) => {
            element.addEventListener('click', (e) => {
              e.preventDefault();
              openColorbox(element.href);
            });
          });
        }

        hideEl('nextLaunch-fetch-btn');
        showEl('nextLaunch-refresh-btn', 'inline-flex');
      });
  }

  private onUserLogin_(): void {
    this.isLoggedIn_ = true;

    if (this.isMenuButtonActive) {
      this.updateToolbarForLoginState_();
      if (this.launchList.length === 0) {
        this.fetchLaunchData_();
      }
    }
  }

  private onUserLogout_(): void {
    this.isLoggedIn_ = false;

    if (this.isMenuButtonActive) {
      this.updateToolbarForLoginState_();
    }
  }

  private updateToolbarForLoginState_(): void {
    const fetchBtn = getEl('nextLaunch-fetch-btn', true);
    const refreshBtn = getEl('nextLaunch-refresh-btn', true);

    if (this.isLoggedIn_) {
      if (fetchBtn) {
        hideEl(fetchBtn);
      }
      if (refreshBtn) {
        showEl(refreshBtn, 'inline-flex');
      }
    } else {
      if (fetchBtn) {
        if (this.launchList.length === 0) {
          showEl(fetchBtn, 'inline-flex');
        } else {
          hideEl(fetchBtn);
        }
      }
      if (refreshBtn) {
        if (this.launchList.length > 0) {
          showEl(refreshBtn, 'inline-flex');
        } else {
          hideEl(refreshBtn);
        }
      }
    }
  }

  processData(resp: { results: LaunchInfoData[] }) {
    for (let i = 0; i < resp.results.length; i++) {
      /**
       * Info from launchlibrary.net
       */
      const launchLibResult = resp.results[i];

      const launchInfo: LaunchInfoObject = {
        name: '',
        updated: null as unknown as Date,
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

      if (typeof launchLibResult.last_updated !== 'undefined') {
        launchInfo.updated = new Date(launchLibResult.last_updated);
      }
      launchInfo.name = typeof launchLibResult.name !== 'undefined' ? launchLibResult.name : l('msgs.unknown');
      launchInfo.location = launchLibResult.pad?.location?.name.split(',', 1)[0] ?? l('msgs.unknown');
      launchInfo.locationURL = launchLibResult.pad?.wiki_url ?? '';
      if (typeof launchLibResult.launch_service_provider !== 'undefined') {
        launchInfo.agency = typeof launchLibResult.launch_service_provider.name !== 'undefined' ? launchLibResult.launch_service_provider.name : l('msgs.unknown');
        launchInfo.country = typeof launchLibResult.launch_service_provider.country_code !== 'undefined' ? launchLibResult.launch_service_provider.country_code : l('msgs.unknown');
        if (typeof launchLibResult.launch_service_provider.wiki_url !== 'undefined') {
          launchInfo.agencyURL = launchLibResult.launch_service_provider.wiki_url;
        }
      } else {
        launchInfo.agency = l('msgs.unknown');
        launchInfo.country = 'UNK';
        launchInfo.agencyURL = '';
      }
      if (launchLibResult.mission) {
        launchInfo.mission = launchLibResult.mission.description;
        launchInfo.missionName = launchLibResult.mission.name;
        launchInfo.missionType = launchLibResult.mission.type;
        if (typeof launchLibResult.mission.wiki_url !== 'undefined') {
          launchInfo.missionURL = launchLibResult.mission.wiki_url;
        }
      }
      if (launchLibResult.rocket) {
        launchInfo.rocket = launchLibResult.rocket?.configuration.full_name;
        launchInfo.rocketConfig = launchLibResult.rocket?.configuration.name;
        launchInfo.rocketFamily = launchLibResult.rocket?.configuration.family;
        if (typeof launchLibResult.rocket.configuration.wiki_url !== 'undefined') {
          launchInfo.rocketURL = launchLibResult.rocket.configuration.wiki_url;
        }
      }
      this.launchList[i] = launchInfo;
    }
  }

  static makeTableHeaders(tbl: HTMLTableElement): void {
    const tr = tbl.insertRow();
    const tdT = tr.insertCell();

    tdT.appendChild(document.createTextNode(l('table.launchWindow')));
    tdT.setAttribute('style', 'text-decoration: underline; width: 120px;');
    const tdN = tr.insertCell();

    tdN.appendChild(document.createTextNode(l('table.mission')));
    tdN.setAttribute('style', 'text-decoration: underline; width: 140px;');
    const tdL = tr.insertCell();

    tdL.appendChild(document.createTextNode(l('table.location')));
    tdL.setAttribute('style', 'text-decoration: underline');
    const tdA = tr.insertCell();

    tdA.appendChild(document.createTextNode(l('table.agency')));
    tdA.setAttribute('style', 'text-decoration: underline');
    const tdC = tr.insertCell();

    tdC.appendChild(document.createTextNode(l('table.country')));
    tdC.setAttribute('style', 'text-decoration: underline');
  }

  static initTable(tbl: HTMLTableElement, launchList: LaunchInfoObject[]) {
    NextLaunchesPlugin.makeTableHeaders(tbl);

    for (const launchEvent of launchList) {
      const tr = tbl.insertRow();

      // Time Cells
      const tdT = tr.insertCell();
      const timeText = launchEvent.windowStart.valueOf() <= Date.now() - 1000 * 60 * 60 * 24 ? l('msgs.tbd') : `${dateFormat(launchEvent.windowStart, 'isoDateTime', true)} UTC`;

      tdT.appendChild(document.createTextNode(timeText));

      // Name Cells
      const tdN = tr.insertCell();

      // Mission Name Text
      const nameText = launchEvent?.missionName || l('msgs.unknown');
      // Mission Name HTML Setup
      const nameHTML =
        !launchEvent?.missionURL || launchEvent.missionURL === ''
          ? `${truncateString(nameText, 15)}`
          : `<a class='iframe' href="${launchEvent.missionURL}">${truncateString(nameText, 15)}</a>`;

      // Rocket Name HTML Setup
      const rocketHTML = !launchEvent?.rocketURL ? `${launchEvent.rocket}` : `<a class='iframe' href="${launchEvent.rocketURL}">${launchEvent.rocket}</a>`;

      // Set Name and Rocket HTML
      tdN.innerHTML = `${nameHTML}<br />${rocketHTML}`;

      // Location Name HTML Setup
      const locationHTML =
        !launchEvent?.locationURL || launchEvent?.locationURL === ''
          ? `${truncateString(launchEvent.location, 25)}`
          : `<a class='iframe' href="${launchEvent.locationURL}">${truncateString(launchEvent.location, 25)}</a>`;

      const tdL = tr.insertCell();

      tdL.innerHTML = locationHTML;

      // Agency Name HTML Setup
      const agencyHTML = !launchEvent?.agencyURL
        ? `${truncateString(launchEvent.agency, 30)}`
        : `<a class='iframe' href="${launchEvent.agencyURL}">${truncateString(launchEvent.agency, 30)}</a>`;

      const tdA = tr.insertCell();

      tdA.innerHTML = agencyHTML;

      // Country Cell
      const tdC = tr.insertCell();

      tdC.innerHTML = `<span class="badge dark-gray-badge" data-badge-caption="${launchEvent.country}"></span>`;
    }
  }
}
