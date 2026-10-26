import { SatMath } from '@app/app/analysis/sat-math';
import { apiFetch } from '@app/app/data/api-fetch';
import { CatalogSearch } from '@app/app/data/catalog-search';
import { isSyntheticVimpel } from '@app/app/data/synthetic-vimpel';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, IDragOptions, IHelpConfig, IKeyboardShortcut, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { buildSideMenuTabsHtml, initSideMenuTabs, updateSideMenuTabIndicator } from '@app/engine/ui/side-menu-tabs';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { hideLoading, showLoading, showLoadingSticky } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import { Degrees, RAD2DEG, Satellite, SpaceObjectType } from '@ootk/src/main';
import sputnickPng from '@public/img/icons/sputnick.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './reentries.css';

const TABS_ID = 'reentries-tabs';

/** Menu width (px) the tables are laid out for when the viewport has room. */
export const REENTRIES_PREFERRED_WIDTH = 1200;
/** Widest the user can drag the menu. */
export const REENTRIES_MAX_WIDTH = 1500;
/** Narrowest the user can drag the menu; the tables scroll sideways below their natural width. */
export const REENTRIES_MIN_DRAG_WIDTH = 480;
/** Gap (px) kept between the menu's right edge and the viewport edge so the close button stays reachable. */
export const REENTRIES_VIEWPORT_MARGIN = 16;
/** Below this menu width (px) the low-priority columns fold away unless the user asks for all of them. */
export const REENTRIES_COMPACT_WIDTH = 1000;
/** sessionStorage key remembering the "Show all columns" choice for this browser session. */
export const REENTRIES_SHOW_ALL_COLUMNS_KEY = 'keeptrack-reentries-show-all-columns';

/** One results-table column: its header locale key and how it behaves on a narrow menu. */
export interface ReentriesColumn {
  /** `plugins.Reentries.table.<key>` header and the cell's `data-col` value. */
  key: string;
  /** Stays in view (position: sticky) while the table scrolls sideways. */
  isPinned?: boolean;
  /** Folds away below REENTRIES_COMPACT_WIDTH unless "Show all columns" is on. */
  isLowPriority?: boolean;
}

/**
 * TIP Messages columns in display order. Identity, decay epoch, window, the
 * predicted location and the reentry angle always show; the report cadence and
 * the catalog-derived physical columns fold away on a narrow menu.
 */
export const TIP_COLUMNS: readonly ReentriesColumn[] = [
  { key: 'norad', isPinned: true },
  { key: 'decayDate' },
  { key: 'latitude' },
  { key: 'longitude' },
  { key: 'window' },
  { key: 'nextReport', isLowPriority: true },
  { key: 'reentryAngle' },
  { key: 'rcs', isLowPriority: true },
  { key: 'gpAge', isLowPriority: true },
  { key: 'dryMass', isLowPriority: true },
  { key: 'volume', isLowPriority: true },
];

/**
 * Reentry Analysis columns in display order. Identity, type and the altitudes
 * that drive the risk shading always show; inclination and RCS fold away.
 */
export const ANALYSIS_COLUMNS: readonly ReentriesColumn[] = [
  { key: 'norad', isPinned: true },
  { key: 'name', isPinned: true },
  { key: 'type' },
  { key: 'perigee' },
  { key: 'apogee' },
  { key: 'meanAlt' },
  { key: 'incl', isLowPriority: true },
  { key: 'rcsSup', isLowPriority: true },
];

/**
 * Menu width that fits the viewport: the preferred width (kept inside the drag
 * limits), capped by the space right of the drawer rail minus a margin, so the
 * whole menu including its close button is always on screen. On a viewport too
 * small for even the drag minimum the available space wins.
 */
export const clampReentriesMenuWidth = (preferredWidth: number, viewportWidth: number, drawerOffset: number, margin: number = REENTRIES_VIEWPORT_MARGIN): number => {
  const preferred = Math.min(Math.max(preferredWidth, REENTRIES_MIN_DRAG_WIDTH), REENTRIES_MAX_WIDTH);
  const available = Math.max(0, viewportWidth - Math.max(0, drawerOffset) - margin);

  return Math.floor(Math.min(preferred, available));
};

/** True when the low-priority columns should be hidden at this menu width. */
export const isReentriesMenuCompact = (menuWidth: number): boolean => menuWidth > 0 && menuWidth < REENTRIES_COMPACT_WIDTH;

/** Tags each cell of a table row with its column key and its pin and fold classes. */
export const applyReentriesColumnClasses = (tr: HTMLTableRowElement, columns: readonly ReentriesColumn[]): void => {
  let lastPinned = -1;

  columns.forEach((column, i) => {
    if (column.isPinned) {
      lastPinned = i;
    }
  });

  columns.forEach((column, i) => {
    const cell = tr.cells[i];

    if (!cell) {
      return;
    }

    cell.dataset.col = column.key;
    if (column.isPinned) {
      cell.classList.add('re-col-pin', `re-col-pin-${column.key}`);
      if (i === lastPinned) {
        cell.classList.add('re-col-pin-last');
      }
    }
    if (column.isLowPriority) {
      cell.classList.add('re-col-low');
    }
  });
};

const readShowAllColumns = (): boolean => {
  try {
    return globalThis.sessionStorage?.getItem(REENTRIES_SHOW_ALL_COLUMNS_KEY) === 'true';
  } catch {
    // sessionStorage can throw in locked-down/private contexts; default to folding.
    return false;
  }
};

const writeShowAllColumns = (isShowAll: boolean): void => {
  try {
    globalThis.sessionStorage?.setItem(REENTRIES_SHOW_ALL_COLUMNS_KEY, String(isShowAll));
  } catch {
    // sessionStorage unavailable; the choice still applies until reload.
  }
};

/**
 * Satellite detail API fields the TIP table needs (mass and the dimensions the
 * volume estimate uses), mapped to their Satellite property names. These are
 * not in the bulk catalog; the detail service only loads them when an object is
 * selected, which left the TIP Dry Mass and Volume columns blank until then.
 */
const TIP_DETAIL_FIELDS: [string, string][] = [
  ['DRY_MASS', 'dryMass'],
  ['LENGTH', 'length'],
  ['DIAMETER', 'diameter'],
  ['SPAN', 'span'],
];

export interface TipMsg {
  NORAD_CAT_ID: string;
  MSG_EPOCH: string;
  INSERT_EPOCH: string;
  DECAY_EPOCH: string;
  WINDOW: string;
  REV: string;
  DIRECTION: string;
  LAT: string;
  LON: string;
  INCL: string;
  NEXT_REPORT: string;
  ID: string;
  HIGH_INTEREST: string;
  OBJECT_NUMBER: string;
}

/** True for a real NORAD number; synthetic objects (JSC Vimpel) carry '' or '00000'. */
export const isRealNorad = (norad?: string | null): boolean => typeof norad === 'string' && norad.trim() !== '' && !/^0+$/u.test(norad.trim());

/**
 * Parses a Space-Track TIP timestamp ("YYYY-MM-DD HH:MM:SS", UTC with no zone
 * suffix) into a Date. `new Date()` alone would read that form as local time.
 * Returns null for a blank or unparseable value.
 */
export const parseTipUtc = (value?: string | null): Date | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  let iso = value.trim().replace(' ', 'T');

  if (!/(?:Z|[+-]\d{2}:?\d{2})$/iu.test(iso)) {
    iso += 'Z';
  }

  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? null : date;
};

/** Normalizes a TIP longitude (0 to 360 east) to signed degrees in [-180, 180]. */
export const normalizeTipLon = (lon: string): number => {
  const lonDeg = parseFloat(lon);

  return lonDeg > 180 ? lonDeg - 360 : lonDeg;
};

/** Flight path angle at the predicted decay epoch in degrees (absolute, 2 dp), or null when the elements no longer propagate. */
export const tipReentryAngleDeg = (sat: Satellite, decayEpoch: Date): number | null => {
  let nu: number | null | undefined = null;

  try {
    nu = sat.toClassicalElements(decayEpoch)?.trueAnomaly;
  } catch {
    // Expected to fail for some satellites since they are reentries
  }

  if (typeof nu !== 'number') {
    return null;
  }

  const gamma = Math.atan((sat.eccentricity * Math.sin(nu)) / (1 + sat.eccentricity * Math.cos(nu)));

  return Number(Math.abs(gamma * RAD2DEG).toFixed(2));
};

/** Catalog RCS, or the historical estimate (2 dp) when the catalog has none. */
export const objectRcs = (sat: Satellite): { value: number | null; isEstimate: boolean } => {
  if (sat.rcs) {
    return { value: sat.rcs, isEstimate: false };
  }

  const rcsEst = SatMath.estimateRcsUsingHistoricalData(sat);

  return rcsEst ? { value: Number(rcsEst.toFixed(2)), isEstimate: true } : { value: null, isEstimate: false };
};

/** Dry mass (kg) and the ellipsoid volume estimate (m^3, 2 dp) from detail-API fields, null where unknown. */
export const objectMassVolume = (sat: Satellite): { dryMassKg: number | null; volumeM3: number | null } => {
  const toNumber = (value?: string): number => (value ? parseFloat(`${value}`.replace(/[^0-9.]/gu, '')) : NaN);
  const span = toNumber(sat.span);
  const length = toNumber(sat.length);
  const diameter = toNumber(sat.diameter);
  const dryMass = toNumber(sat.dryMass);

  return {
    dryMassKg: Number.isFinite(dryMass) ? dryMass : null,
    volumeM3: Number.isFinite(span) && Number.isFinite(length) && Number.isFinite(diameter) ? Number(((Math.PI / 6) * span * length * diameter).toFixed(2)) : null,
  };
};

/** Reentry Analysis rule: perigee under 120 km, or elements that can no longer be propagated. */
export const hasObjectReentered = (sat: Satellite): boolean => {
  if (sat.perigee < 120) {
    return true;
  }

  try {
    sat.toClassicalElements(new Date());
  } catch {
    return true;
  }

  return false;
};

export class Reentries extends KeepTrackPlugin {
  readonly id = 'Reentries';
  dependencies_ = [];
  private readonly tipDataSrc_ = 'https://r2.keeptrack.space/spacetrack-tip.json';
  protected selectSatIdOnCruncher_: number | null = null;
  /** True when the deferred selection must not recentre the camera (fly-to-corridor mode). */
  private isDeferredSelectWithoutRecenter_ = false;
  protected tipList_: TipMsg[] = [];
  protected reentryList_: Satellite[] = [];
  private isLoggedIn_ = false;
  private isFetching_ = false;
  private isFlyToCorridor_ = false;
  /** NORAD IDs whose mass/size detail has already been requested for the TIP table. */
  private readonly detailRequested_ = new Set<string>();
  /** "Show all columns" choice; remembered for the browser session. */
  protected isShowAllColumns_ = readShowAllColumns();
  /** Width the user wants (the default, or what they last dragged to); the viewport may cap it. */
  private preferredWidth_ = REENTRIES_PREFERRED_WIDTH;
  /** Inline width this plugin last applied, so a different value means the user dragged. */
  private lastAppliedWidth_: number | null = null;
  /** Last measured (non-zero) menu width, used while the menu is hidden and measures 0. */
  private lastMenuWidth_ = 0;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'reentries-bottom-icon',
      label: t7e('plugins.Reentries.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: sputnickPng,
      menuMode: [MenuMode.EVENTS, MenuMode.ALL],
    };
  }

  /**
   * Called when the bottom icon is clicked.
   */
  onBottomIconClick(): void {
    if (!this.isMenuButtonActive) {
      return;
    }

    this.updateToolbarForLoginState_();
    updateSideMenuTabIndicator(TABS_ID);
    this.fitMenuToViewport_();

    if (this.isLoggedIn_ && this.tipList_.length === 0) {
      this.fetchTipData_();
    }
  }

  // Bridge for legacy event system (per CLAUDE.md)
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'reentries-menu',
      title: t7e('plugins.Reentries.title' as Parameters<typeof t7e>[0]),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  /**
   * Drag limits. The opening width is not the drag minimum: fitMenuToViewport_
   * sets min(preferred, available) so the menu fits a narrow viewport, and the
   * user can drag down to REENTRIES_MIN_DRAG_WIDTH (the tables scroll sideways).
   */
  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: REENTRIES_MIN_DRAG_WIDTH,
      maxWidth: REENTRIES_MAX_WIDTH,
    };
  }

  private buildSideMenuHtml_(): string {
    const tb = (key: string) => t7e(`plugins.Reentries.toolbar.${key}` as Parameters<typeof t7e>[0]);
    const lbl = (key: string) => t7e(`plugins.Reentries.labels.${key}` as Parameters<typeof t7e>[0]);
    const tipMessagesContent = html`
      <section class="kt-section">
        <div class="kt-section-label">${lbl('dataActions')}</div>
        <button id="reentries-fetch-btn" class="kt-action waves-effect" type="button">
          <span class="kt-action-label">${tb('fetchData')}</span>
        </button>
        <button id="reentries-refresh-btn" class="kt-action waves-effect" type="button" style="display:none;">
          <span class="kt-action-label">${tb('refresh')}</span>
        </button>
        <div class="kt-divider"></div>
        <div class="switch re-flyto-switch" kt-tooltip="${tb('flyToCorridorTooltip')}">
          <label for="reentries-flyto-corridor">
            <input id="reentries-flyto-corridor" type="checkbox" />
            <span class="lever"></span>
            <span class="re-flyto-label">${tb('flyToCorridor')}</span>
          </label>
        </div>
        <p id="reentries-corridor-note" class="re-corridor-note">${tb('corridorNote')}</p>
      </section>
      <section class="kt-section">
        <div class="kt-section-label">${lbl('results')}</div>
        ${Reentries.columnsSwitchHtml_('reentries-show-all-cols-tip')}
        <div class="re-table-scroll">
          <table id="reentries-tip-table" class="reentries-table center-align"></table>
        </div>
        <sub class="reentries-attribution">*${t7e('plugins.Reentries.dataSource' as Parameters<typeof t7e>[0])}</sub>
      </section>
    `;

    const reentryAnalysisContent = html`
      <section class="kt-section">
        <div class="kt-section-label">${lbl('results')}</div>
        ${Reentries.columnsSwitchHtml_('reentries-show-all-cols-analysis')}
        <div class="re-table-scroll">
          <table id="reentries-analysis-table" class="reentries-table center-align"></table>
        </div>
      </section>
    `;

    const tabsHtml = buildSideMenuTabsHtml(TABS_ID, [
      { id: 'reentries-tip-tab', label: t7e('plugins.Reentries.tabLabels.tipMessages' as Parameters<typeof t7e>[0]), content: tipMessagesContent },
      { id: 'reentries-analysis-tab', label: t7e('plugins.Reentries.tabLabels.reentryAnalysis' as Parameters<typeof t7e>[0]), content: reentryAnalysisContent },
    ]);

    return html`
      <div id="reentries-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="reentries-content" class="side-menu">
          ${tabsHtml}
        </div>
      </div>
    `;
  }

  /**
   * "Show all columns" switch for a results card. Both tabs carry one and they
   * stay in sync; CSS only shows them while the menu is narrow enough to fold.
   */
  private static columnsSwitchHtml_(id: string): string {
    const tb = (key: string) => t7e(`plugins.Reentries.toolbar.${key}` as Parameters<typeof t7e>[0]);

    return html`
      <div class="switch re-cols-switch" kt-tooltip="${tb('showAllColumnsTooltip')}">
        <label for="${id}">
          <input id="${id}" class="re-show-all-cols-input" type="checkbox" />
          <span class="lever"></span>
          <span class="re-cols-label">${tb('showAllColumns')}</span>
        </label>
      </div>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.Reentries.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.Reentries.help.overview'),
          image: {
            src: 'img/help/reentries/reentries-menu.png',
            alt: t7e('plugins.Reentries.help.imgAlt'),
            caption: t7e('plugins.Reentries.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.Reentries.help.tabsHeading'),
          content: t7e('plugins.Reentries.help.tabs'),
        },
        {
          // Why a corridor matters when it is not an impact point (Ted's ruling 2026-10-24).
          heading: t7e('plugins.Reentries.help.corridorHeading'),
          content: t7e('plugins.Reentries.help.corridor'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.Reentries.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.Reentries.help.tip1'), t7e('plugins.Reentries.help.tip2'), t7e('plugins.Reentries.help.tip3')],
      // Uppercase R only arrives with Shift held, so the chord is Shift+R (plain r is camera auto-rotate).
      shortcuts: [{ keys: ['Shift', 'R'], description: t7e('plugins.Reentries.help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'R',
        // evt.key is 'R' only while Shift is held; say so explicitly so the help reads Shift+R.
        shift: true,
        // ctrl:false so Ctrl+Shift+R belongs to Video Director, not this toggle.
        ctrl: false,
        description: t7e('plugins.Reentries.help.shortcutToggle'),
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
    EventBus.getInstance().on(EventBusEvent.userLogin, this.onUserLogin_.bind(this));
    EventBus.getInstance().on(EventBusEvent.userLogout, this.onUserLogout_.bind(this));

    EventBus.getInstance().on(EventBusEvent.onCruncherMessage, () => {
      if (this.selectSatIdOnCruncher_ !== null) {
        if (this.isDeferredSelectWithoutRecenter_) {
          Reentries.selectWithoutRecentering_(this.selectSatIdOnCruncher_);
        } else {
          PluginRegistry.getPlugin(SelectSatManager)?.selectSat(this.selectSatIdOnCruncher_);
        }

        this.selectSatIdOnCruncher_ = null;
        this.isDeferredSelectWithoutRecenter_ = false;
      }
    });
  }

  private uiManagerFinal_() {
    initSideMenuTabs(TABS_ID);

    getEl('reentries-fetch-btn', true)?.addEventListener('click', () => {
      hideEl('reentries-fetch-btn');
      showEl('reentries-refresh-btn', 'flex');
      this.fetchTipData_();
    });

    getEl('reentries-refresh-btn', true)?.addEventListener('click', () => {
      this.tipList_ = [];
      this.fetchTipData_();
    });

    getEl('reentries-flyto-corridor', true)?.addEventListener('change', (evt: Event) => {
      this.isFlyToCorridor_ = (<HTMLInputElement>evt.target).checked;
    });

    this.initResponsiveLayout_();

    // TIP Messages row click handler
    getEl(this.sideMenuElementName)!.addEventListener('click', (evt: Event) => {
      const el = (<HTMLElement>evt.target)?.parentElement;

      if (el?.classList.contains('tip-object')) {
        showLoading(() => {
          const hiddenRow = el.dataset?.row ?? null;

          if (hiddenRow !== null) {
            this.tipEventClicked_(parseInt(hiddenRow));
          }
        });

        return;
      }

      // Reentry Analysis row click handler
      if (el?.classList.contains('reentry-object')) {
        showLoading(() => {
          const objectId = el.dataset?.objectId;

          if (typeof objectId === 'string' && objectId !== '') {
            this.reentryEventClicked_(Number(objectId));
          }
        });
      }
    });

    // Populate reentry table on tab switch (lazy load)
    const reentryTab = getEl('reentries-analysis-tab');

    reentryTab?.addEventListener('click', () => {
      if (this.reentryList_.length === 0) {
        this.populateReentryTable_();
      }
    });

    // Listen for tab clicks on the tab header
    const tabsEl = getEl(TABS_ID);

    tabsEl?.addEventListener('click', (evt: Event) => {
      const anchor = (<HTMLElement>evt.target)?.closest('a');

      if (anchor?.getAttribute('href') === '#reentries-analysis-tab' && this.reentryList_.length === 0) {
        this.populateReentryTable_();
      }
    });
  }

  // =========================================================================
  // TIP Messages (Tab 1) - existing functionality
  // =========================================================================

  private fetchTipData_(): void {
    if (this.isFetching_) {
      return;
    }
    this.isFetching_ = true;

    fetch(this.tipDataSrc_)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch TIP data: ${response.status}`);
        }

        return response.json();
      })
      .then((tipList: TipMsg[]) => {
        this.setTipList_(tipList);
        this.createTipTable_();
        this.fetchMissingTipDetails_();

        if (this.tipList_.length === 0) {
          errorManagerInstance.warn(t7e('plugins.Reentries.errorMsgs.noTipData' as Parameters<typeof t7e>[0]));
        }

        hideEl('reentries-fetch-btn');
        showEl('reentries-refresh-btn', 'flex');
      })
      .catch(() => {
        errorManagerInstance.warn(t7e('plugins.Reentries.errorMsgs.errorFetching' as Parameters<typeof t7e>[0]));
      })
      .finally(() => {
        this.isFetching_ = false;
      });
  }

  private onUserLogin_(): void {
    this.isLoggedIn_ = true;

    if (this.isMenuButtonActive) {
      this.updateToolbarForLoginState_();
      if (this.tipList_.length === 0) {
        this.fetchTipData_();
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
    const fetchBtn = getEl('reentries-fetch-btn', true);
    const refreshBtn = getEl('reentries-refresh-btn', true);

    if (this.isLoggedIn_) {
      if (fetchBtn) {
        hideEl(fetchBtn);
      }
      if (refreshBtn) {
        showEl(refreshBtn, 'flex');
      }
    } else {
      if (fetchBtn) {
        if (this.tipList_.length === 0) {
          showEl(fetchBtn, 'flex');
        } else {
          hideEl(fetchBtn);
        }
      }
      if (refreshBtn) {
        if (this.tipList_.length > 0) {
          showEl(refreshBtn, 'flex');
        } else {
          hideEl(refreshBtn);
        }
      }
    }
  }

  private setTipList_(tipList: TipMsg[]) {
    this.tipList_ = tipList;
    this.tipList_.sort((a, b) => new Date(b.MSG_EPOCH).getTime() - new Date(a.MSG_EPOCH).getTime());
    // Keep the newest message per object. A row without a NORAD number has no
    // object identity to merge on, so it is keyed by its own message ID instead
    // of collapsing every blank-NORAD row into one.
    const seen = new Set<string>();

    this.tipList_ = this.tipList_.filter((tip) => {
      const key = isRealNorad(tip.NORAD_CAT_ID) ? `norad:${tip.NORAD_CAT_ID.trim()}` : `msg:${tip.ID}`;

      if (seen.has(key)) {
        return false;
      }
      seen.add(key);

      return true;
    });
    this.tipList_.sort((a, b) => new Date(b.DECAY_EPOCH).getTime() - new Date(a.DECAY_EPOCH).getTime());
  }

  protected tipEventClicked_(row: number) {
    const sat = Reentries.tipSat_(this.tipList_[row]);

    if (!sat) {
      ServiceLocator.getUiManager().toast(t7e('plugins.Reentries.errorMsgs.satelliteDecayed' as Parameters<typeof t7e>[0]), ToastMsgType.caution);

      return;
    }

    const decayEpoch = new Date(
      Date.UTC(
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(0, 4)),
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(5, 7)) - 1,
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(8, 10)),
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(11, 13)),
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(14, 16)),
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(17, 19))
      )
    );

    ServiceLocator.getTimeManager().changeSimulationTime(decayEpoch.getTime());
    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

    if (this.isFlyToCorridor_) {
      this.flyToCorridor_(this.tipList_[row], decayEpoch, sat.id);

      return;
    }

    ServiceLocator.getUiManager().doSearch(`${sat.sccNum5 ?? sat.sccNum}`);

    this.selectSatIdOnCruncher_ = sat.id;
    this.isDeferredSelectWithoutRecenter_ = false;
  }

  /**
   * Flies the camera to the predicted reentry corridor location for a TIP
   * message. The object is selected (so its info box, orbit and corridor show)
   * without the camera recentring on it, so the camera looks at the ground
   * point on the globe rather than chasing the decaying satellite.
   */
  private flyToCorridor_(tip: TipMsg, decayEpoch: Date, satId: number): void {
    const lat = <Degrees>Reentries.parseLat_(tip.LAT);
    const lon = <Degrees>Reentries.parseLon_(tip.LON);
    const camera = ServiceLocator.getMainCamera();

    /*
     * Select on the next cruncher update, like the follow path: right after the time jump the
     * object has no propagated position yet and selectSat would refuse it.
     */
    this.selectSatIdOnCruncher_ = satId;
    this.isDeferredSelectWithoutRecenter_ = true;

    /*
     * Defer one frame so the time jump propagates before lon2yaw resolves the
     * longitude. Flying on the same frame as changeStaticOffset would aim the
     * camera at a stale corridor position.
     */
    requestAnimationFrame(() => {
      camera.lookAtLatLon(lat, lon, 0, decayEpoch);
    });
  }

  /**
   * Select an object while keeping the camera where it is: selection normally
   * switches to a satellite-centred camera (isFocusOnSatelliteWhenSelected), which
   * would fight the corridor fly-to.
   */
  private static selectWithoutRecentering_(satId: number): void {
    const isFocus = settingsManager.isFocusOnSatelliteWhenSelected;

    settingsManager.isFocusOnSatelliteWhenSelected = false;
    try {
      PluginRegistry.getPlugin(SelectSatManager)?.selectSat(satId);
    } finally {
      settingsManager.isFocusOnSatelliteWhenSelected = isFocus;
    }
  }

  protected createTipTable_(): void {
    try {
      const tbl = <HTMLTableElement>getEl('reentries-tip-table');

      tbl.innerHTML = '';
      tbl.classList.add('centered');

      Reentries.createTipHeaders_(tbl);

      for (let i = 0; i < this.tipList_.length; i++) {
        this.createTipRow_(tbl, i);
      }
    } catch {
      errorManagerInstance.warn(t7e('plugins.Reentries.errorMsgs.errorProcessing' as Parameters<typeof t7e>[0]));
    }
  }

  private static createTipHeaders_(tbl: HTMLTableElement) {
    Reentries.createHeaderRow_(tbl, TIP_COLUMNS);
  }

  /** Header row for a results table, tagged with the column pin and fold classes. */
  private static createHeaderRow_(tbl: HTMLTableElement, columns: readonly ReentriesColumn[]): void {
    const tr = tbl.insertRow();

    for (const { key } of columns) {
      const column = tr.insertCell();

      column.appendChild(document.createTextNode(t7e(`plugins.Reentries.table.${key}` as Parameters<typeof t7e>[0])));
      column.classList.add('center');
    }

    applyReentriesColumnClasses(tr, columns);
  }

  private createTipRow_(tbl: HTMLTableElement, i: number): HTMLTableRowElement {
    const tr = tbl.insertRow();

    tr.setAttribute('class', 'tip-object link');
    tr.dataset.row = i.toString();

    const sat = Reentries.tipSat_(this.tipList_[i]);
    const reentered = t7e('plugins.Reentries.labels.reentered' as Parameters<typeof t7e>[0]);
    const unknown = t7e('Common.unknown');
    let rcs = reentered;
    let age = reentered;
    let gammaDegrees = reentered;

    if (sat) {
      const decayEpochDate = parseTipUtc(this.tipList_[i].DECAY_EPOCH);
      const gamma = decayEpochDate ? tipReentryAngleDeg(sat, decayEpochDate) : null;

      gammaDegrees = gamma !== null ? `${gamma.toFixed(2)}\u00B0` : unknown;

      const rcsValue = objectRcs(sat).value;

      if (sat.rcs) {
        rcs = `${sat.rcs}`;
      } else {
        rcs = rcsValue !== null ? rcsValue.toFixed(2) : unknown;
      }

      // Age of GP follows the simulation clock (Ted ruling 2026-10-16), so a jump to the decay epoch ages the elset.
      age = `${sat.ageOfElset(ServiceLocator.getTimeManager().simulationTimeObj, 'hours').toFixed(2)}`;
    }

    const massVolume = Reentries.tipMassVolume_(sat);

    Reentries.createCell_(tr, this.tipList_[i].NORAD_CAT_ID);
    Reentries.createCell_(tr, this.tipList_[i].DECAY_EPOCH);
    Reentries.createCell_(tr, this.lat2degrees_(this.tipList_[i].LAT));
    Reentries.createCell_(tr, this.lon2degrees_(this.tipList_[i].LON));
    Reentries.createCell_(tr, Reentries.formatTipWindow_(this.tipList_[i].WINDOW));
    Reentries.createCell_(tr, this.tipList_[i].NEXT_REPORT);
    Reentries.createCell_(tr, gammaDegrees);
    Reentries.createCell_(tr, rcs);
    Reentries.createCell_(tr, age);
    Reentries.createCell_(tr, massVolume.dryMass);
    Reentries.createCell_(tr, massVolume.volume);
    applyReentriesColumnClasses(tr, TIP_COLUMNS);

    return tr;
  }

  /**
   * Catalog object a TIP row refers to, or null when the row has no real NORAD
   * number (nothing to look up) or the object is no longer in the catalog.
   * sccNum2Sat takes the NORAD_CAT_ID string directly; parseInt would drop alpha-5 IDs.
   */
  protected static tipSat_(tip: TipMsg, catalogManager = ServiceLocator.getCatalogManager()): Satellite | null {
    return isRealNorad(tip.NORAD_CAT_ID) ? catalogManager.sccNum2Sat(tip.NORAD_CAT_ID.trim()) : null;
  }

  /**
   * TIP WINDOW is the plus/minus uncertainty around DECAY_EPOCH in minutes
   * (USSPACECOM TIP convention), so the full window is twice this value. Show
   * the sign so nobody reads 840 as the total width.
   */
  protected static formatTipWindow_(window: string): string {
    const minutes = parseInt(window, 10);

    return Number.isFinite(minutes) ? `\u00B1${minutes}` : window;
  }

  /** Dry mass and estimated volume cells for a TIP row ("Reentered" when the object is gone). */
  private static tipMassVolume_(sat: Satellite | null): { dryMass: string; volume: string } {
    if (!sat) {
      const reentered = t7e('plugins.Reentries.labels.reentered' as Parameters<typeof t7e>[0]);

      return { dryMass: reentered, volume: reentered };
    }

    const unknown = t7e('Common.unknown');
    const { volumeM3 } = objectMassVolume(sat);
    const volume = volumeM3 !== null ? volumeM3.toFixed(2) : unknown;
    const dryMass = sat.dryMass ? `${sat.dryMass}` : unknown;

    return { dryMass, volume };
  }

  /**
   * Mass and size come from the per-object detail API, which is normally only
   * called when an object is selected. Request it for every TIP object that
   * lacks it and patch the Dry Mass / Volume cells in place when it arrives
   * (rebuilding the table would re-index rows and drop Pro corridor layers).
   */
  private fetchMissingTipDetails_(): void {
    const catalogManager = ServiceLocator.getCatalogManager();
    const pending: Promise<boolean>[] = [];

    for (const tip of this.tipList_) {
      const sat = Reentries.tipSat_(tip, catalogManager);

      if (!sat || sat.dryMass || this.detailRequested_.has(sat.sccNum)) {
        continue;
      }

      this.detailRequested_.add(sat.sccNum);
      pending.push(Reentries.fetchTipDetail_(sat));
    }

    if (pending.length === 0) {
      return;
    }

    Promise.all(pending)
      .then((results) => {
        if (results.some(Boolean)) {
          this.refreshTipDetailCells_();
        }
      })
      .catch(() => {
        // fetchTipDetail_ never rejects; nothing to recover.
      });
  }

  /** Fetches mass/size for one object and merges any missing fields onto it. Resolves true when something changed. */
  protected static async fetchTipDetail_(sat: Satellite): Promise<boolean> {
    try {
      const response = await apiFetch(`${settingsManager.dataSources.satDetail}${sat.sccNum}`);

      if (!response.ok) {
        return false;
      }

      let data = await response.json();

      if (Array.isArray(data)) {
        data = data[0];
      } else if (data?.data && typeof data.data === 'object') {
        data = data.data;
      }

      if (!data || typeof data !== 'object') {
        return false;
      }

      const satRecord = sat as unknown as Record<string, unknown>;
      let isChanged = false;

      for (const [apiKey, satField] of TIP_DETAIL_FIELDS) {
        const value = data[apiKey];

        if (value !== undefined && value !== null && value !== '' && !satRecord[satField]) {
          satRecord[satField] = value;
          isChanged = true;
        }
      }

      return isChanged;
    } catch {
      return false;
    }
  }

  /** Rewrites the Dry Mass and Volume cells (the last two columns) of every TIP row from current object data. */
  protected refreshTipDetailCells_(): void {
    const tbl = getEl('reentries-tip-table', true) as HTMLTableElement | null;

    if (!tbl) {
      return;
    }

    const catalogManager = ServiceLocator.getCatalogManager();

    for (const tr of Array.from(tbl.rows)) {
      const rowIdx = tr.dataset.row;
      const tip = typeof rowIdx === 'string' ? this.tipList_[parseInt(rowIdx, 10)] : undefined;

      if (!tip || tr.cells.length < 2) {
        continue;
      }

      const { dryMass, volume } = Reentries.tipMassVolume_(Reentries.tipSat_(tip, catalogManager));

      tr.cells[tr.cells.length - 2].textContent = dryMass;
      tr.cells[tr.cells.length - 1].textContent = volume;
    }
  }

  // =========================================================================
  // Reentry Analysis (Tab 2)
  // =========================================================================

  private populateReentryTable_() {
    showLoadingSticky();

    setTimeout(() => {
      try {
        const objectCache = ServiceLocator.getCatalogManager().objectCache;
        this.reentryList_ = CatalogSearch.findReentryObjects(<Satellite[]>objectCache, 200);

        this.createReentryTable_();
      } catch {
        errorManagerInstance.warn(t7e('plugins.Reentries.errorMsgs.errorProcessing' as Parameters<typeof t7e>[0]));
      } finally {
        hideLoading();
      }
    }, 0);
  }

  protected createReentryTable_() {
    const tbl = <HTMLTableElement>getEl('reentries-analysis-table');

    tbl.innerHTML = '';
    tbl.classList.add('centered');

    Reentries.createReentryHeaders_(tbl);

    for (const sat of this.reentryList_) {
      Reentries.createReentryRow_(tbl, sat);
    }
  }

  private static createReentryHeaders_(tbl: HTMLTableElement) {
    Reentries.createHeaderRow_(tbl, ANALYSIS_COLUMNS);
  }

  private static createReentryRow_(tbl: HTMLTableElement, sat: Satellite) {
    const l = (key: string) => t7e(`plugins.Reentries.labels.${key}` as Parameters<typeof t7e>[0]);
    const unknown = t7e('Common.unknown');
    const tr = tbl.insertRow();

    tr.setAttribute('class', 'reentry-object link');
    tr.dataset.objectId = String(sat.id);

    const hasReentered = hasObjectReentered(sat);

    if (hasReentered) {
      tr.classList.add('reentry-critical');
    } else if (sat.perigee < 160) {
      tr.classList.add('reentry-warning');
    }

    let typeStr = unknown;

    if (sat.type === SpaceObjectType.PAYLOAD) {
      typeStr = l('payload');
    } else if (sat.type === SpaceObjectType.ROCKET_BODY) {
      typeStr = l('rocketBody');
    } else if (sat.type === SpaceObjectType.DEBRIS) {
      typeStr = l('debris');
    }

    let rcsStr = unknown;

    if (sat.rcs) {
      rcsStr = `${sat.rcs}`;
    } else {
      const rcsEst = objectRcs(sat).value;

      rcsStr = rcsEst !== null ? rcsEst.toFixed(2) : unknown;
    }

    const meanAltStr = hasReentered ? l('reentered') : ((sat.apogee + sat.perigee) / 2).toFixed(1);

    // Match the sat info box wording for catalog-less JSC Vimpel objects.
    const noradStr = isSyntheticVimpel(sat) ? t7e('satInfoBox.notAvailableJscVimpel') : sat.sccNum || unknown;

    Reentries.createCell_(tr, noradStr);
    Reentries.createCell_(tr, sat.name || unknown);
    Reentries.createCell_(tr, typeStr);
    Reentries.createCell_(tr, sat.perigee.toFixed(1));
    Reentries.createCell_(tr, sat.apogee.toFixed(1));
    Reentries.createCell_(tr, meanAltStr);
    Reentries.createCell_(tr, sat.inclination.toFixed(2));
    Reentries.createCell_(tr, rcsStr);
    applyReentriesColumnClasses(tr, ANALYSIS_COLUMNS);
  }

  protected reentryEventClicked_(objectId: number) {
    const sat = ServiceLocator.getCatalogManager().getSat(objectId);

    if (!sat) {
      ServiceLocator.getUiManager().toast(t7e('plugins.Reentries.errorMsgs.satelliteDecayed' as Parameters<typeof t7e>[0]), ToastMsgType.caution);

      return;
    }

    // Search labels are ambiguous for non-NORAD sources. Selection uses the
    // internal catalog identity retained by the row, including blank NORADs.
    if (sat.sccNum) {
      ServiceLocator.getUiManager().doSearch(`${sat.sccNum5 ?? sat.sccNum}`);
    }

    this.selectSatIdOnCruncher_ = sat.id;
  }

  // =========================================================================
  // Narrow-screen layout
  // =========================================================================

  /** Wires the Columns switches, viewport resize and menu-width tracking. */
  private initResponsiveLayout_(): void {
    const menuEl = getEl(this.sideMenuElementName, true);

    for (const input of Array.from(document.querySelectorAll<HTMLInputElement>('.re-show-all-cols-input'))) {
      input.checked = this.isShowAllColumns_;
      input.addEventListener('change', () => this.setShowAllColumns_(input.checked));
    }

    this.fitMenuToViewport_();
    window.addEventListener('resize', () => this.fitMenuToViewport_());

    // The menu is draggable, so fold on its measured width rather than a viewport media query.
    if (menuEl && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.updateColumnFold_()).observe(menuEl);
    }
  }

  /** Applies the "Show all columns" choice to both tables and remembers it for the session. */
  protected setShowAllColumns_(isShowAll: boolean): void {
    this.isShowAllColumns_ = isShowAll;
    writeShowAllColumns(isShowAll);

    for (const input of Array.from(document.querySelectorAll<HTMLInputElement>('.re-show-all-cols-input'))) {
      input.checked = isShowAll;
    }

    this.updateColumnFold_();
  }

  /**
   * Sizes the menu to min(preferred, space right of the drawer rail) so it and
   * its close button fit the viewport. A width the user dragged to becomes the
   * new preference. Mobile mode forces side menus full-screen, so it is left alone.
   */
  protected fitMenuToViewport_(): void {
    const menuEl = getEl(this.sideMenuElementName, true);

    if (!menuEl || settingsManager.isMobileModeEnabled) {
      return;
    }

    const current = parseFloat(menuEl.style.width);

    if (this.lastAppliedWidth_ !== null && Number.isFinite(current) && current !== this.lastAppliedWidth_) {
      this.preferredWidth_ = current;
    }

    const drawerOffset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--drawer-offset')) || 0;
    const width = clampReentriesMenuWidth(this.preferredWidth_, window.innerWidth, drawerOffset);

    menuEl.style.width = `${width}px`;
    this.lastAppliedWidth_ = width;
    this.updateColumnFold_(width);
  }

  /**
   * Toggles the fold classes on the menu root: `re-cols-narrow` while the menu
   * is under REENTRIES_COMPACT_WIDTH (shows the Columns switch) and
   * `re-cols-folded` while the low-priority columns are hidden. A hidden menu
   * measures 0, so the last known width is used instead.
   */
  protected updateColumnFold_(width?: number): void {
    const menuEl = getEl(this.sideMenuElementName, true);

    if (!menuEl) {
      return;
    }

    let menuWidth = typeof width === 'number' ? width : menuEl.getBoundingClientRect().width;

    if (menuWidth <= 0) {
      menuWidth = this.lastMenuWidth_;
    }
    if (menuWidth <= 0) {
      return;
    }
    this.lastMenuWidth_ = menuWidth;

    const isCompact = isReentriesMenuCompact(menuWidth);

    menuEl.classList.toggle('re-cols-narrow', isCompact);
    menuEl.classList.toggle('re-cols-folded', isCompact && !this.isShowAllColumns_);
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /** Parses a TIP latitude string into signed degrees (north positive). */
  private static parseLat_(lat: string): number {
    return parseFloat(lat);
  }

  /** Parses a TIP longitude string into signed degrees normalized to [-180, 180]. */
  private static parseLon_(lon: string): number {
    return normalizeTipLon(lon);
  }

  private lon2degrees_(lon: string): string {
    let lonDeg = Reentries.parseLon_(lon);
    let direction = 'E';

    if (lonDeg < 0) {
      direction = 'W';
      lonDeg = Math.abs(lonDeg);
    }

    return `${lonDeg.toFixed(2)}\u00B0 ${direction}`;
  }

  private lat2degrees_(lat: string): string {
    let latDeg = Reentries.parseLat_(lat);
    let direction = 'N';

    if (latDeg < 0) {
      direction = 'S';
      latDeg = Math.abs(latDeg);
    }

    return `${latDeg.toFixed(2)}\u00B0 ${direction}`;
  }

  private static createCell_(tr: HTMLTableRowElement, text: string): void {
    const cell = tr.insertCell();

    cell.appendChild(document.createTextNode(text));
  }
}
