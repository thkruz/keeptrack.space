import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { hideAsyncIndicator, showAsyncIndicator } from '@app/engine/utils/asyncIndicator';
import { openColorbox } from '@app/engine/utils/colorbox';
import { dateFormat } from '@app/engine/utils/dateFormat';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { truncateString } from '@app/engine/utils/truncate-string';
import { t7e } from '@app/locales/keys';
import type { WorkSheet } from '@e965/xlsx';
import calendar2Png from '@public/img/icons/calendar2.png';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import './thespacedev-launch-calendar.css';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.TheSpaceDevLaunchCalendarPlugin.${key}` as Parameters<typeof t7e>[0]);

type XlsxModule = typeof import('@e965/xlsx');

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

/** Error message for an HTTP 429, so the rate-limit toast replaces the generic one. */
const RATE_LIMITED = 'TheSpaceDevs rate limited';

/** Export column order: every LaunchInfoObject field, under a readable header (locale key `export.<field>`). */
const EXPORT_FIELDS: (keyof LaunchInfoObject)[] = [
  'name',
  'updated',
  'windowStart',
  'windowEnd',
  'location',
  'locationURL',
  'agency',
  'agencyURL',
  'country',
  'mission',
  'missionName',
  'missionType',
  'missionURL',
  'rocket',
  'rocketConfig',
  'rocketFamily',
  'rocketURL',
];

export class TheSpaceDevLaunchCalendarPlugin extends KeepTrackPlugin {
  readonly id = 'TheSpaceDevLaunchCalendarPlugin';
  dependencies_ = [];
  private isLoggedIn_ = false;
  private isFetching_ = false;
  requiresInternet = true;

  bottomIconElementName: string = 'menu-launch-calendar';
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

  sideMenuElementName: string = 'launch-calendar-menu';
  sideMenuElementHtml: string = html`
  <div id="launch-calendar-menu" class="side-menu-parent start-hidden kt-ui-v13" style="width: 900px;">
    <div id="launch-calendar-content" class="side-menu">
      <section class="kt-section">
        <div class="kt-section-label">${l('labels.dataActions')}</div>
        <button id="launch-calendar-fetch-btn" class="kt-action waves-effect" type="button">
          <span class="kt-action-label">${l('tooltips.fetchData')}</span>
        </button>
        <button id="launch-calendar-refresh-btn" class="kt-action waves-effect" type="button" style="display:none;">
          <span class="kt-action-label">${l('tooltips.refresh')}</span>
        </button>
        <div class="kt-divider"></div>
        <button id="export-launch-info" class="kt-action waves-effect" type="button">
          <span class="kt-action-label">${l('tooltips.exportLaunchInfo')}</span>
        </button>
      </section>
      <section class="kt-section">
        <div class="kt-section-label">${l('labels.results')}</div>
        <table id="launch-calendar-table" class="launch-calendar-results-table"></table>
      </section>
    </div>
  </div>`;

  launchList = [] as LaunchInfoObject[];

  onBottomIconClick(): void {
    if (!this.isMenuButtonActive) {
      return;
    }

    // Fetch the launch list automatically the first time the menu is opened so
    // the user does not have to hunt for a button. Subsequent opens reuse the
    // already-loaded data (a manual Refresh re-downloads).
    if (this.launchList.length === 0) {
      this.fetchLaunchData_();
    } else {
      this.updateToolbarForLoginState_();
    }
  }

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.userLogin, this.onUserLogin_.bind(this));
    EventBus.getInstance().on(EventBusEvent.userLogout, this.onUserLogout_.bind(this));

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      getEl('launch-calendar-fetch-btn', true)?.addEventListener('click', () => {
        this.fetchLaunchData_();
      });

      // Refresh keeps the rows on screen until a new list arrives: a failed request (the free API tier
      // throttles often) must not throw away the best data the user has.
      getEl('launch-calendar-refresh-btn', true)?.addEventListener('click', () => {
        this.fetchLaunchData_();
      });

      getEl('export-launch-info')!.addEventListener('click', () => {
        this.exportLaunchList_();
      });
    });
  }

  /** Writes the launch list to launchList.xlsx, or explains why there is nothing to write. */
  private exportLaunchList_(): Promise<void> {
    if (this.launchList.length === 0) {
      ServiceLocator.getUiManager()?.toast(l('msgs.nothingToExport'), ToastMsgType.caution);

      return Promise.resolve();
    }

    ServiceLocator.getSoundManager()?.play(SoundNames.EXPORT);
    const launchList = this.launchList;

    return import('@e965/xlsx')
      .then((XLSX) => {
        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, TheSpaceDevLaunchCalendarPlugin.buildExportSheet(XLSX, launchList), 'Sheet1');
        XLSX.writeFile(wb, 'launchList.xlsx');
      })
      .catch((e: unknown) => errorManagerInstance.error(e as Error, 'TheSpaceDevLaunchCalendarPlugin', t7e('errorMsgs.SaveVariable.xlsx')));
  }

  /**
   * Builds the export sheet: every field of each launch (more than the table shows) under readable
   * column headers, with dates written as spreadsheet dates in UTC so the file matches the table.
   */
  static buildExportSheet(XLSX: XlsxModule, launchList: LaunchInfoObject[]): WorkSheet {
    const headers = EXPORT_FIELDS.map((field) => l(`export.${field}`));
    const cell = (value: unknown): unknown => {
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? '' : value;
      }

      return value ?? '';
    };
    const rows = launchList.map((launch) => Object.fromEntries(EXPORT_FIELDS.map((field, i) => [headers[i], cell(launch[field])])));

    return XLSX.utils.json_to_sheet(rows, { header: headers, UTC: true, dateNF: 'yyyy-mm-dd hh:mm:ss' });
  }

  private fetchLaunchData_(): void {
    if (this.isFetching_) {
      return;
    }
    this.isFetching_ = true;

    // The Space Devs detailed query is slow; show the non-modal async
    // indicator (a small ring under the top bar) so the user knows the
    // request is in flight but can still switch menus/screens meanwhile.
    showAsyncIndicator(l('msgs.fetching'));
    hideEl('launch-calendar-fetch-btn');

    const apiUrl = window.location.hostname === 'localhost' ? 'lldev' : 'll';
    const apiRoot = `https://${apiUrl}.thespacedevs.com/2.0.0/`;

    fetch(`${apiRoot}launch/upcoming/?format=json&limit=20&mode=detailed`)
      .then((resp) => {
        if (resp.status === 429) {
          throw new Error(RATE_LIMITED);
        }
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        return resp.json();
      })
      .then((data: { results?: LaunchInfoData[] } | null) => {
        // Replace the list (and the table) only once a new list has arrived.
        this.processData({ results: Array.isArray(data?.results) ? data.results : [] });
        this.renderTable_();
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.message === RATE_LIMITED) {
          errorManagerInstance.warn(l('msgs.rateLimited'));
        } else {
          errorManagerInstance.warn(l('msgs.apiUnavailable').replace('{url}', apiRoot));
        }
      })
      .finally(() => {
        this.isFetching_ = false;
        hideAsyncIndicator();

        if (this.launchList.length > 0) {
          hideEl('launch-calendar-fetch-btn');
          showEl('launch-calendar-refresh-btn', 'flex');
        } else {
          // Fetch failed or returned nothing: let the user retry via Fetch.
          showEl('launch-calendar-fetch-btn', 'flex');
          hideEl('launch-calendar-refresh-btn');
        }
      });
  }

  /** Rebuilds the results table from `launchList`; an empty list shows a message row. */
  private renderTable_(): void {
    const tbl = getEl('launch-calendar-table', true) as HTMLTableElement | null;

    if (!tbl) {
      return;
    }

    tbl.replaceChildren();

    if (this.launchList.length === 0) {
      TheSpaceDevLaunchCalendarPlugin.makeEmptyRow(tbl);

      return;
    }

    TheSpaceDevLaunchCalendarPlugin.initTable(tbl, this.launchList);
    tbl.querySelectorAll('a').forEach((element) => {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        openColorbox(element.href);
      });
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
    const fetchBtn = getEl('launch-calendar-fetch-btn', true);
    const refreshBtn = getEl('launch-calendar-refresh-btn', true);

    if (this.isLoggedIn_) {
      if (fetchBtn) {
        hideEl(fetchBtn);
      }
      if (refreshBtn) {
        showEl(refreshBtn, 'flex');
      }
    } else {
      if (fetchBtn) {
        if (this.launchList.length === 0) {
          showEl(fetchBtn, 'flex');
        } else {
          hideEl(fetchBtn);
        }
      }
      if (refreshBtn) {
        if (this.launchList.length > 0) {
          showEl(refreshBtn, 'flex');
        } else {
          hideEl(refreshBtn);
        }
      }
    }
  }

  /** Replaces `launchList` with the flattened feed records. Tolerates missing or malformed parts. */
  processData(resp: { results: LaunchInfoData[] }) {
    const unknown = l('msgs.unknown');
    const text = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
    const toDate = (value: unknown): Date => new Date(value as string | number | Date);

    this.launchList = resp.results.map((launchLibResult): LaunchInfoObject => {
      const provider = launchLibResult?.launch_service_provider;
      const mission = launchLibResult?.mission;
      const rocket = launchLibResult?.rocket?.configuration;
      const locationName = launchLibResult?.pad?.location?.name;

      return {
        name: text(launchLibResult?.name, unknown),
        updated: typeof launchLibResult?.last_updated === 'undefined' ? (null as unknown as Date) : toDate(launchLibResult.last_updated),
        windowStart: toDate(launchLibResult?.window_start),
        windowEnd: toDate(launchLibResult?.window_end),
        location: typeof locationName === 'string' ? locationName.split(',', 1)[0] : unknown,
        locationURL: text(launchLibResult?.pad?.wiki_url),
        agency: provider ? text(provider.name, unknown) : unknown,
        agencyURL: text(provider?.wiki_url),
        country: provider ? text(provider.country_code, unknown) : 'UNK',
        mission: text(mission?.description),
        missionName: text(mission?.name),
        missionType: text(mission?.type),
        missionURL: text(mission?.wiki_url),
        rocket: text(rocket?.full_name),
        rocketConfig: text(rocket?.name),
        rocketFamily: text(rocket?.family),
        rocketURL: text(rocket?.wiki_url),
      };
    });
  }

  static makeTableHeaders(tbl: HTMLTableElement): void {
    const tr = tbl.insertRow();
    const tdT = tr.insertCell();

    tdT.appendChild(document.createTextNode(l('table.launchWindow')));
    tdT.setAttribute('style', 'width: 120px;');
    const tdN = tr.insertCell();

    tdN.appendChild(document.createTextNode(l('table.mission')));
    tdN.setAttribute('style', 'width: 140px;');
    const tdL = tr.insertCell();

    tdL.appendChild(document.createTextNode(l('table.location')));
    const tdA = tr.insertCell();

    tdA.appendChild(document.createTextNode(l('table.agency')));
    const tdC = tr.insertCell();

    tdC.appendChild(document.createTextNode(l('table.country')));
  }

  /** The single row shown when the feed answered with no launches. */
  static makeEmptyRow(tbl: HTMLTableElement): void {
    const tr = tbl.insertRow();
    const td = tr.insertCell();

    tr.className = 'launch-calendar-empty-row';
    td.colSpan = 5;
    td.textContent = l('msgs.noLaunches');
  }

  /** The launch window cell text: UTC date and time, or TBD for a stale or unparseable date. */
  static formatWindow(windowStart: Date | null | undefined): string {
    const time = windowStart instanceof Date ? windowStart.getTime() : Number.NaN;

    if (Number.isNaN(time) || time <= Date.now() - 1000 * 60 * 60 * 24) {
      return l('msgs.tbd');
    }

    try {
      return `${dateFormat(windowStart as Date, 'isoDateTime', true)} UTC`;
    } catch {
      return l('msgs.tbd');
    }
  }

  /** Only absolute http(s) links from the feed are kept; anything else renders as plain text. */
  static safeUrl(url: string | null | undefined): string | null {
    if (typeof url !== 'string' || url === '') {
      return null;
    }

    try {
      const parsed = new URL(url);

      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
    } catch {
      return null;
    }
  }

  /**
   * Appends feed text to a cell as a text node, wrapped in an in-app link when the feed has a safe URL.
   * Feed strings come from a third party: they are never parsed as markup.
   */
  static appendFeedText(cell: HTMLElement, label: string, url?: string): void {
    const href = TheSpaceDevLaunchCalendarPlugin.safeUrl(url);

    if (!href) {
      cell.appendChild(document.createTextNode(label));

      return;
    }

    const a = document.createElement('a');

    a.className = 'iframe';
    a.href = href;
    a.textContent = label;
    cell.appendChild(a);
  }

  static initTable(tbl: HTMLTableElement, launchList: LaunchInfoObject[]) {
    TheSpaceDevLaunchCalendarPlugin.makeTableHeaders(tbl);

    for (const launchEvent of launchList) {
      const tr = tbl.insertRow();

      // Time Cell
      tr.insertCell().textContent = TheSpaceDevLaunchCalendarPlugin.formatWindow(launchEvent.windowStart);

      // Mission name, line break, rocket name
      const tdN = tr.insertCell();

      TheSpaceDevLaunchCalendarPlugin.appendFeedText(tdN, truncateString(launchEvent.missionName || l('msgs.unknown'), 15), launchEvent.missionURL);
      tdN.appendChild(document.createElement('br'));
      TheSpaceDevLaunchCalendarPlugin.appendFeedText(tdN, launchEvent.rocket ?? '', launchEvent.rocketURL);

      TheSpaceDevLaunchCalendarPlugin.appendFeedText(tr.insertCell(), truncateString(launchEvent.location ?? '', 25), launchEvent.locationURL);
      TheSpaceDevLaunchCalendarPlugin.appendFeedText(tr.insertCell(), truncateString(launchEvent.agency ?? '', 30), launchEvent.agencyURL);

      // Country Cell (wraps long comma-separated country lists, e.g. ESA members).
      // Render a space after each comma so the cell wraps at code boundaries
      // rather than mid-code.
      const tdC = tr.insertCell();

      tdC.className = 'launch-calendar-country-cell';
      tdC.textContent = (launchEvent.country ?? '').replace(/,/gu, ', ');
    }
  }
}
