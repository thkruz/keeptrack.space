import { SatMath } from '@app/app/analysis/sat-math';
import { CatalogSearch } from '@app/app/data/catalog-search';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { buildSideMenuTabsHtml, initSideMenuTabs, updateSideMenuTabIndicator } from '@app/engine/ui/side-menu-tabs';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { hideLoading, showLoading, showLoadingSticky } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { Degrees, RAD2DEG, Satellite, SpaceObjectType } from '@ootk/src/main';
import sputnickPng from '@public/img/icons/sputnick.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './reentries.css';

const TABS_ID = 'reentries-tabs';

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

export class Reentries extends KeepTrackPlugin {
  readonly id = 'Reentries';
  dependencies_ = [];
  private readonly tipDataSrc_ = 'https://r2.keeptrack.space/spacetrack-tip.json';
  protected selectSatIdOnCruncher_: number | null = null;
  protected tipList_: TipMsg[] = [];
  protected reentryList_: Satellite[] = [];
  private isLoggedIn_ = false;
  private isFetching_ = false;
  private isFlyToCorridor_ = false;

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

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 1200,
      maxWidth: 1500,
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
      </section>
      <section class="kt-section">
        <div class="kt-section-label">${lbl('results')}</div>
        <table id="reentries-tip-table" class="reentries-table center-align"></table>
        <sub class="reentries-attribution">*${t7e('plugins.Reentries.dataSource' as Parameters<typeof t7e>[0])}</sub>
      </section>
    `;

    const reentryAnalysisContent = html`
      <section class="kt-section">
        <div class="kt-section-label">${lbl('results')}</div>
        <table id="reentries-analysis-table" class="reentries-table center-align"></table>
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
          heading: t7e('help.howToUse'),
          content: t7e('plugins.Reentries.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.Reentries.help.tip1'),
        t7e('plugins.Reentries.help.tip2'),
        t7e('plugins.Reentries.help.tip3'),
      ],
      shortcuts: [{ keys: ['R'], description: t7e('plugins.Reentries.help.shortcutToggle') }],
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'R',
        // ctrl:false so Ctrl+Shift+R belongs to Video Director, not this toggle.
        ctrl: false,
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

    EventBus.getInstance().on(
      EventBusEvent.onCruncherMessage,
      () => {
        if (this.selectSatIdOnCruncher_ !== null) {
          PluginRegistry.getPlugin(SelectSatManager)?.selectSat(this.selectSatIdOnCruncher_);

          this.selectSatIdOnCruncher_ = null;
        }
      },
    );
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
          const sccNum = el.dataset?.scc ?? null;

          if (sccNum !== null) {
            this.reentryEventClicked_(sccNum);
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
    this.tipList_ = this.tipList_.filter((v, i, a) => a.findIndex((t) => t.NORAD_CAT_ID === v.NORAD_CAT_ID) === i);
    this.tipList_.sort((a, b) => new Date(b.DECAY_EPOCH).getTime() - new Date(a.DECAY_EPOCH).getTime());
  }

  protected tipEventClicked_(row: number) {
    // sccNum2Sat accepts the NORAD_CAT_ID string directly; parseInt would drop
    // alpha-5 IDs.
    const sat = ServiceLocator.getCatalogManager().sccNum2Sat(this.tipList_[row].NORAD_CAT_ID);

    if (!sat) {
      ServiceLocator.getUiManager().toast(t7e('plugins.Reentries.errorMsgs.satelliteDecayed' as Parameters<typeof t7e>[0]), ToastMsgType.caution);

      return;
    }

    const now = new Date();
    const decayEpoch = new Date(
      Date.UTC(
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(0, 4)),
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(5, 7)) - 1,
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(8, 10)),
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(11, 13)),
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(14, 16)),
        parseInt(this.tipList_[row].DECAY_EPOCH.substring(17, 19)),
      ),
    );

    ServiceLocator.getTimeManager().changeStaticOffset(decayEpoch.getTime() - now.getTime());
    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

    if (this.isFlyToCorridor_) {
      this.flyToCorridor_(this.tipList_[row], decayEpoch);

      return;
    }

    ServiceLocator.getUiManager().doSearch(`${sat.sccNum5 ?? sat.sccNum}`);

    this.selectSatIdOnCruncher_ = sat.id;
  }

  /**
   * Flies the camera to the predicted reentry corridor location for a TIP
   * message. The object is deselected first so the camera looks at the ground
   * point on the globe rather than chasing the decaying satellite.
   */
  private flyToCorridor_(tip: TipMsg, decayEpoch: Date): void {
    const lat = <Degrees>Reentries.parseLat_(tip.LAT);
    const lon = <Degrees>Reentries.parseLon_(tip.LON);
    const camera = ServiceLocator.getMainCamera();

    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);

    /*
     * Defer one frame so the time jump propagates before lon2yaw resolves the
     * longitude. Flying on the same frame as changeStaticOffset would aim the
     * camera at a stale corridor position.
     */
    requestAnimationFrame(() => {
      camera.lookAtLatLon(lat, lon, 0, decayEpoch);
    });
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
    const th = (key: string) => t7e(`plugins.Reentries.table.${key}` as Parameters<typeof t7e>[0]);
    const tr = tbl.insertRow();
    const names = [
      th('norad'),
      th('decayDate'),
      th('latitude'),
      th('longitude'),
      th('window'),
      th('nextReport'),
      th('reentryAngle'),
      th('rcs'),
      th('gpAge'),
      th('dryMass'),
      th('volume'),
    ];

    for (const name of names) {
      const column = tr.insertCell();

      column.appendChild(document.createTextNode(name));
      column.setAttribute('class', 'center');
    }
  }

  private createTipRow_(tbl: HTMLTableElement, i: number): HTMLTableRowElement {
    const tr = tbl.insertRow();

    tr.setAttribute('class', 'tip-object link');
    tr.dataset.row = i.toString();

    const sat = ServiceLocator.getCatalogManager().sccNum2Sat(this.tipList_[i].NORAD_CAT_ID);
    const reentered = t7e('plugins.Reentries.labels.reentered' as Parameters<typeof t7e>[0]);
    const unknown = t7e('Common.unknown');
    let rcs = reentered;
    let age = reentered;
    let volume = reentered;
    let gammaDegrees = reentered;

    if (sat) {
      const decayEpochDate = new Date(this.tipList_[i].DECAY_EPOCH);
      let nu: number | null = null;

      try {
        nu = sat.toClassicalElements(decayEpochDate)?.trueAnomaly;
      } catch {
        // Expected to fail for some satellites since they are reentries
      }

      if (nu !== null) {
        const sinNu = Math.sin(nu);
        const gamma = Math.atan((sat.eccentricity * sinNu) / (1 + sat.eccentricity * Math.cos(nu)));

        gammaDegrees = `${Math.abs(gamma * RAD2DEG).toFixed(2)}\u00B0`;
      } else {
        gammaDegrees = unknown;
      }

      if (sat?.rcs) {
        rcs = `${sat.rcs}`;
      } else {
        const rcsEst = SatMath.estimateRcsUsingHistoricalData(sat);

        rcs = rcsEst ? `${rcsEst.toFixed(2)}` : unknown;
      }

      age = sat ? `${sat.ageOfElset(new Date(), 'hours').toFixed(2)}` : unknown;

      const span = sat?.span ? parseFloat(sat.span.replace(/[^0-9.]/gu, '')) : -1;
      const length = sat?.length ? parseFloat(sat.length.replace(/[^0-9.]/gu, '')) : -1;
      const diameter = sat?.diameter ? parseFloat(sat.diameter.replace(/[^0-9.]/gu, '')) : -1;

      volume = span !== -1 && length !== -1 && diameter !== -1 ? `${((Math.PI / 6) * span * length * diameter).toFixed(2)}` : unknown;
    }

    Reentries.createCell_(tr, this.tipList_[i].NORAD_CAT_ID);
    Reentries.createCell_(tr, this.tipList_[i].DECAY_EPOCH);
    Reentries.createCell_(tr, this.lat2degrees_(this.tipList_[i].LAT));
    Reentries.createCell_(tr, this.lon2degrees_(this.tipList_[i].LON));
    Reentries.createCell_(tr, this.tipList_[i].WINDOW);
    Reentries.createCell_(tr, this.tipList_[i].NEXT_REPORT);
    Reentries.createCell_(tr, gammaDegrees);
    Reentries.createCell_(tr, rcs);
    Reentries.createCell_(tr, age);
    Reentries.createCell_(tr, sat?.dryMass ?? reentered);
    Reentries.createCell_(tr, volume);

    return tr;
  }

  // =========================================================================
  // Reentry Analysis (Tab 2)
  // =========================================================================

  private populateReentryTable_() {
    showLoadingSticky();

    setTimeout(() => {
      try {
        const objectCache = ServiceLocator.getCatalogManager().objectCache;
        const sccNums = CatalogSearch.findReentry(<Satellite[]>objectCache, 200);

        this.reentryList_ = sccNums
          .map((scc) => ServiceLocator.getCatalogManager().sccNum2Sat(scc))
          .filter((sat): sat is Satellite => sat !== null);

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
    const th = (key: string) => t7e(`plugins.Reentries.table.${key}` as Parameters<typeof t7e>[0]);
    const tr = tbl.insertRow();
    const names = [
      th('norad'),
      th('name'),
      th('type'),
      th('perigee'),
      th('apogee'),
      th('meanAlt'),
      th('incl'),
      th('rcsSup'),
    ];

    for (const name of names) {
      const column = tr.insertCell();

      column.appendChild(document.createTextNode(name));
      column.setAttribute('class', 'center');
    }
  }

  private static createReentryRow_(tbl: HTMLTableElement, sat: Satellite) {
    const l = (key: string) => t7e(`plugins.Reentries.labels.${key}` as Parameters<typeof t7e>[0]);
    const unknown = t7e('Common.unknown');
    const tr = tbl.insertRow();

    tr.setAttribute('class', 'reentry-object link');
    tr.dataset.scc = sat.sccNum;

    let hasReentered = sat.perigee < 120;

    if (!hasReentered) {
      try {
        sat.toClassicalElements(new Date());
      } catch {
        hasReentered = true;
      }
    }

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
      const rcsEst = SatMath.estimateRcsUsingHistoricalData(sat);

      rcsStr = rcsEst ? `${rcsEst.toFixed(2)}` : unknown;
    }

    const meanAltStr = hasReentered
      ? l('reentered')
      : ((sat.apogee + sat.perigee) / 2).toFixed(1);

    Reentries.createCell_(tr, sat.sccNum);
    Reentries.createCell_(tr, sat.name || unknown);
    Reentries.createCell_(tr, typeStr);
    Reentries.createCell_(tr, sat.perigee.toFixed(1));
    Reentries.createCell_(tr, sat.apogee.toFixed(1));
    Reentries.createCell_(tr, meanAltStr);
    Reentries.createCell_(tr, sat.inclination.toFixed(2));
    Reentries.createCell_(tr, rcsStr);
  }

  protected reentryEventClicked_(sccNum: string) {
    const sat = ServiceLocator.getCatalogManager().sccNum2Sat(sccNum);

    if (!sat) {
      ServiceLocator.getUiManager().toast(t7e('plugins.Reentries.errorMsgs.satelliteDecayed' as Parameters<typeof t7e>[0]), ToastMsgType.caution);

      return;
    }

    ServiceLocator.getUiManager().doSearch(`${sat.sccNum5 ?? sat.sccNum}`);

    this.selectSatIdOnCruncher_ = sat.id;
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
    let lonDeg = parseFloat(lon);

    if (lonDeg > 180) {
      lonDeg -= 360;
    }

    return lonDeg;
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
