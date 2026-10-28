import {
  createTooltip,
  EventBus,
  EventBusEvent,
  findObjectIdByNorad,
  getEl,
  getSatByNorad,
  getSelectedSat,
  html,
  type IBottomIconConfig,
  type ICommandPaletteCommand,
  type IDragOptions,
  type IHelpConfig,
  type IKeyboardShortcut,
  type ISideMenuConfig,
  jumpToTime,
  KeepTrackPlugin,
  MenuMode,
  pluginT7e,
  selectSat,
  ToastMsgType,
  t7e,
  toast,
} from '@keeptrack/plugin-api';
import {
  escapeKtocHtml,
  fetchKtocNotices,
  formatKtocUtc,
  isKtocCanceled,
  isKtocFetchError,
  isSafeNoticeUrl,
  KtocFetchError,
  KtocFetchResult,
  KtocNotice,
  KtocNoticeQuery,
  ktocEventLabel,
  ktocEventTypeLabel,
  ktocStatusLabel,
  normalizeKtocCode,
} from './ktoc-notices-api';
import securityPng from './ktoc-notices-icon.png';
import { KtocNoticesInfoBoxSection } from './ktoc-notices-info-box';
import './ktoc-notices.css';

/** DOM ids, exported for tests and the e2e specs. */
export const KTOC_MENU_IDS = {
  BOTTOM_ICON: 'ktoc-notices-icon',
  MENU: 'ktoc-notices-menu',
  CONTENT: 'ktoc-notices-content',
  FILTER_ALL: 'ktoc-notices-filter-all',
  FILTER_ACTIVE: 'ktoc-notices-filter-active',
  TYPE_FILTER: 'ktoc-notices-type-filter',
  NORAD_FILTER: 'ktoc-notices-norad-filter',
  NORAD_FILTER_TEXT: 'ktoc-notices-norad-filter-text',
  NORAD_FILTER_CLEAR: 'ktoc-notices-norad-filter-clear',
  STATUS_MSG: 'ktoc-notices-status',
  TABLE: 'ktoc-notices-table',
  PREV_PAGE: 'ktoc-notices-prev-page',
  NEXT_PAGE: 'ktoc-notices-next-page',
  PAGE_TEXT: 'ktoc-notices-current-page',
  REFRESH: 'ktoc-notices-refresh-btn',
} as const;

/** Value of the event-type select that disables the type filter. */
export const KTOC_ALL_TYPES = 'ALL';

type Fetcher = (query: KtocNoticeQuery) => Promise<KtocFetchResult>;

const l = pluginT7e('KtocNoticesPlugin');

/**
 * KTOC Notices: the public feed of KTOC (KeepTrack Operations Center) event
 * notices (relocations, departures, fragmentations, ...) from the KeepTrack
 * API, plus a per-satellite card in the selected-object info box.
 */
export class KtocNoticesPlugin extends KeepTrackPlugin {
  readonly id = 'KtocNoticesPlugin';
  dependencies_: string[] = [];
  requiresInternet = true;

  static readonly PAGE_SIZE = 20;

  /** Good results only, keyed by query ('all' or 'norad:<n>'); failures are never cached. */
  private readonly cache_ = new Map<string, KtocNotice[]>();
  private notices_: KtocNotice[] = [];
  private filtered_: KtocNotice[] = [];
  private currentPage_ = 1;
  private isActiveOnly_ = false;
  private typeFilter_: string = KTOC_ALL_TYPES;
  private noradFilter_: number | null = null;
  private requestRevision_ = 0;
  private isLoading_ = false;
  private selectedNoticeId_: string | null = null;
  private readonly fetcher_: Fetcher;
  readonly infoBoxSection: KtocNoticesInfoBoxSection;

  constructor(fetcher: Fetcher = fetchKtocNotices) {
    super();
    this.fetcher_ = fetcher;
    this.infoBoxSection = new KtocNoticesInfoBoxSection((norad) => this.showNoticesForNorad(norad), fetcher);
  }

  // =========================================================================
  // Composition configuration
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: KTOC_MENU_IDS.BOTTOM_ICON,
      label: l('bottomIconLabel'),
      image: securityPng,
      menuMode: [MenuMode.EVENTS, MenuMode.ALL],
    };
  }

  onBottomIconClick(): void {
    // Loading happens in onSideMenuOpen so the palette and shortcut paths load too.
  }

  // Bridge for the legacy event system (per CLAUDE.md)
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: KTOC_MENU_IDS.MENU,
      title: l('title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  onSideMenuOpen(): void {
    this.loadNotices_(false);
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        // evt.key is 'K' only while Shift is held; ctrl:false leaves Ctrl+Shift+K to the command palette.
        key: 'K',
        shift: true,
        ctrl: false,
        description: l('shortcutToggle'),
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = l('title');

    return [
      {
        id: 'KtocNoticesPlugin.open',
        label: l('commands.open'),
        category,
        shortcutHint: 'Shift+K',
        keywords: ['ktoc', 'notices', 'events', 'relocation', 'fragmentation'],
        callback: () => {
          this.clearNoradFilter_(false);
          this.openMenu_();
        },
      },
      {
        id: 'KtocNoticesPlugin.forSelected',
        label: l('commands.forSelected'),
        category,
        keywords: ['ktoc', 'notices', 'selected satellite'],
        isAvailable: () => KtocNoticesInfoBoxSection.noradOf(getSelectedSat()) !== null,
        callback: () => {
          const norad = KtocNoticesInfoBoxSection.noradOf(getSelectedSat());

          if (norad !== null) {
            this.showNoticesForNorad(norad);
          }
        },
      },
    ];
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        { heading: t7e('help.overview'), content: l('help.overview') },
        { heading: l('help.statusesHeading'), content: l('help.statuses') },
        { heading: t7e('help.howToUse'), content: l('help.howToUse') },
      ],
      tips: [l('help.tip1'), l('help.tip2'), l('help.tip3')],
      shortcuts: [{ keys: ['Shift', 'K'], description: l('shortcutToggle') }],
    };
  }

  private getDragOptions_(): IDragOptions {
    return { isDraggable: true, minWidth: 560, maxWidth: 1000 };
  }

  private buildSideMenuHtml_(): string {
    return html`
      <div id="${KTOC_MENU_IDS.MENU}" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="${KTOC_MENU_IDS.CONTENT}" class="side-menu">
          <section class="kt-section">
            <div class="kt-section-label">${l('sections.filters')}</div>
            <div class="ktoc-segmented" role="group" aria-label="${l('labels.statusFilter')}">
              <button id="${KTOC_MENU_IDS.FILTER_ALL}" type="button" class="ktoc-segment active" aria-pressed="true">${l('labels.all')}</button>
              <button id="${KTOC_MENU_IDS.FILTER_ACTIVE}" type="button" class="ktoc-segment" aria-pressed="false">${l('labels.activeOnly')}</button>
            </div>
            <label class="ktoc-field-label" for="${KTOC_MENU_IDS.TYPE_FILTER}">${l('labels.eventType')}</label>
            <select id="${KTOC_MENU_IDS.TYPE_FILTER}" class="browser-default ktoc-type-filter">
              <option value="${KTOC_ALL_TYPES}">${l('labels.allTypes')}</option>
            </select>
            <div id="${KTOC_MENU_IDS.NORAD_FILTER}" class="ktoc-norad-filter" style="display:none;">
              <span id="${KTOC_MENU_IDS.NORAD_FILTER_TEXT}"></span>
              <button id="${KTOC_MENU_IDS.NORAD_FILTER_CLEAR}" type="button" class="ktoc-norad-filter-clear">${l('labels.showAllSatellites')}</button>
            </div>
          </section>
          <section class="kt-section">
            <div class="kt-section-label">${l('sections.notices')}</div>
            <div id="${KTOC_MENU_IDS.STATUS_MSG}" class="ktoc-status-msg" role="status" style="display:none;"></div>
            <table id="${KTOC_MENU_IDS.TABLE}" class="ktoc-notices-table"></table>
            <div class="ktoc-pagination">
              <button id="${KTOC_MENU_IDS.PREV_PAGE}" class="ktoc-pagination-btn" type="button" disabled>${l('labels.previous')}</button>
              <span id="${KTOC_MENU_IDS.PAGE_TEXT}" class="ktoc-pagination-text">${KtocNoticesPlugin.pageText_(1, 1)}</span>
              <button id="${KTOC_MENU_IDS.NEXT_PAGE}" class="ktoc-pagination-btn" type="button" disabled>${l('labels.next')}</button>
            </div>
            <button id="${KTOC_MENU_IDS.REFRESH}" class="kt-action waves-effect" type="button">
              <span class="kt-action-label">${l('labels.refresh')}</span>
            </button>
            <sub class="ktoc-attribution">${l('labels.issuer')}</sub>
          </section>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addHtml(): void {
    super.addHtml();
    this.infoBoxSection.register();
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  private uiManagerFinal_(): void {
    getEl(KTOC_MENU_IDS.FILTER_ALL, true)?.addEventListener('click', () => this.setActiveOnly_(false));
    getEl(KTOC_MENU_IDS.FILTER_ACTIVE, true)?.addEventListener('click', () => this.setActiveOnly_(true));
    getEl(KTOC_MENU_IDS.TYPE_FILTER, true)?.addEventListener('change', (evt: Event) => {
      this.typeFilter_ = (evt.target as HTMLSelectElement).value || KTOC_ALL_TYPES;
      this.applyFilters_();
    });
    getEl(KTOC_MENU_IDS.NORAD_FILTER_CLEAR, true)?.addEventListener('click', () => this.clearNoradFilter_(true));
    getEl(KTOC_MENU_IDS.PREV_PAGE, true)?.addEventListener('click', () => this.goToPage_(this.currentPage_ - 1));
    getEl(KTOC_MENU_IDS.NEXT_PAGE, true)?.addEventListener('click', () => this.goToPage_(this.currentPage_ + 1));
    getEl(KTOC_MENU_IDS.REFRESH, true)?.addEventListener('click', () => this.loadNotices_(true));
    getEl(KTOC_MENU_IDS.TABLE, true)?.addEventListener('click', (evt: MouseEvent) => this.onTableClick_(evt));
  }

  // =========================================================================
  // Public entry points
  // =========================================================================

  /** Opens the menu filtered to one satellite (command palette and the info-box link). */
  showNoticesForNorad(norad: number): void {
    this.noradFilter_ = norad;
    this.updateNoradFilterUi_();
    if (this.isMenuButtonActive) {
      this.loadNotices_(false);
    } else {
      this.openMenu_();
    }
  }

  private openMenu_(): void {
    if (this.isMenuButtonActive) {
      this.loadNotices_(false);

      return;
    }
    this.bottomMenuClicked();
  }

  // =========================================================================
  // Data loading
  // =========================================================================

  private cacheKey_(): string {
    return this.noradFilter_ === null ? 'all' : `norad:${this.noradFilter_}`;
  }

  private loadNotices_(isForceRefresh: boolean): void {
    const key = this.cacheKey_();

    const cached = isForceRefresh ? undefined : this.cache_.get(key);

    if (cached) {
      this.setNotices_(cached);

      return;
    }

    const revision = ++this.requestRevision_;
    const query: KtocNoticeQuery = this.noradFilter_ === null ? {} : { norad: this.noradFilter_ };

    this.isLoading_ = true;
    this.setRefreshDisabled_(true);
    this.showStatus_(l('labels.loading'));

    this.fetcher_(query).then((result) => {
      if (revision !== this.requestRevision_) {
        return;
      }
      this.isLoading_ = false;
      this.setRefreshDisabled_(false);

      if (isKtocFetchError(result)) {
        // A failed Refresh keeps the good list that was on screen; it is not re-cached, so the next open retries.
        this.cache_.delete(key);
        this.showFailure_(result, isForceRefresh && this.notices_.length > 0);

        return;
      }

      this.cache_.set(key, result.notices);
      this.setNotices_(result.notices);
    });
  }

  private showFailure_(result: KtocFetchError, isKeepingList: boolean): void {
    const detail = typeof result.status === 'number' ? `HTTP ${result.status}` : l('errorMsgs.networkDetail');
    let message = result.failure === 'auth' ? t7e('errorMsgs.apiKeyRequired') : l('errorMsgs.fetchFailed').replace('{detail}', detail);

    if (isKeepingList && result.failure !== 'auth') {
      message = l('errorMsgs.refreshFailedKeep').replace('{detail}', detail);
    } else {
      this.notices_ = [];
      this.filtered_ = [];
      this.currentPage_ = 1;
      this.renderTable_();
    }
    this.showStatus_(message, true);
    toast(message, ToastMsgType.caution);
  }

  private setNotices_(notices: KtocNotice[]): void {
    this.notices_ = notices;
    this.rebuildTypeOptions_();
    this.applyFilters_();
  }

  // =========================================================================
  // Filters
  // =========================================================================

  private setActiveOnly_(isActiveOnly: boolean): void {
    this.isActiveOnly_ = isActiveOnly;
    const allBtn = getEl(KTOC_MENU_IDS.FILTER_ALL, true);
    const activeBtn = getEl(KTOC_MENU_IDS.FILTER_ACTIVE, true);

    allBtn?.classList.toggle('active', !isActiveOnly);
    allBtn?.setAttribute('aria-pressed', String(!isActiveOnly));
    activeBtn?.classList.toggle('active', isActiveOnly);
    activeBtn?.setAttribute('aria-pressed', String(isActiveOnly));
    this.applyFilters_();
  }

  private clearNoradFilter_(isReload: boolean): void {
    if (this.noradFilter_ === null) {
      return;
    }
    this.noradFilter_ = null;
    this.updateNoradFilterUi_();
    if (isReload) {
      this.loadNotices_(false);
    }
  }

  private updateNoradFilterUi_(): void {
    const wrapper = getEl(KTOC_MENU_IDS.NORAD_FILTER, true);
    const text = getEl(KTOC_MENU_IDS.NORAD_FILTER_TEXT, true);

    if (!wrapper || !text) {
      return;
    }
    if (this.noradFilter_ === null) {
      wrapper.style.display = 'none';
      text.textContent = '';

      return;
    }
    text.textContent = l('labels.noradFilter').replace('{norad}', String(this.noradFilter_));
    wrapper.style.display = '';
  }

  /** Options come from the loaded data; option values are normalized codes, never translated names. */
  private rebuildTypeOptions_(): void {
    const select = getEl(KTOC_MENU_IDS.TYPE_FILTER, true) as HTMLSelectElement | null;
    const codes = new Map<string, string>();

    for (const notice of this.notices_) {
      const code = normalizeKtocCode(notice.event_type);

      if (!codes.has(code)) {
        codes.set(code, ktocEventTypeLabel(notice.event_type));
      }
    }

    if (!codes.has(this.typeFilter_)) {
      this.typeFilter_ = KTOC_ALL_TYPES;
    }

    if (!select) {
      return;
    }

    select.innerHTML = '';
    select.appendChild(new Option(l('labels.allTypes'), KTOC_ALL_TYPES));
    [...codes.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([code, label]) => {
        const option = new Option(label, code);

        option.id = `ktoc-notices-type-option-${code}`;
        select.appendChild(option);
      });
    select.value = this.typeFilter_;
  }

  private applyFilters_(): void {
    this.filtered_ = this.notices_.filter(
      (notice) => (!this.isActiveOnly_ || !isKtocCanceled(notice)) && (this.typeFilter_ === KTOC_ALL_TYPES || normalizeKtocCode(notice.event_type) === this.typeFilter_)
    );
    this.currentPage_ = 1;
    this.renderTable_();

    if (this.isLoading_) {
      return;
    }
    if (this.notices_.length === 0) {
      this.showStatus_(this.noradFilter_ === null ? l('labels.empty') : l('labels.emptyForNorad').replace('{norad}', String(this.noradFilter_)));
    } else if (this.filtered_.length === 0) {
      this.showStatus_(l('labels.noMatches'));
    } else {
      this.showStatus_(null);
    }
  }

  // =========================================================================
  // Table + paging
  // =========================================================================

  private totalPages_(): number {
    return Math.max(1, Math.ceil(this.filtered_.length / KtocNoticesPlugin.PAGE_SIZE));
  }

  private goToPage_(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPages_());

    if (clamped === this.currentPage_) {
      return;
    }
    this.currentPage_ = clamped;
    this.renderTable_();
  }

  private static pageText_(current: number, total: number): string {
    return l('labels.pageOf').replace('{current}', String(current)).replace('{total}', String(total));
  }

  private updatePagination_(): void {
    const total = this.totalPages_();
    const pageText = getEl(KTOC_MENU_IDS.PAGE_TEXT, true);
    const prev = getEl(KTOC_MENU_IDS.PREV_PAGE, true) as HTMLButtonElement | null;
    const next = getEl(KTOC_MENU_IDS.NEXT_PAGE, true) as HTMLButtonElement | null;

    if (pageText) {
      pageText.textContent = KtocNoticesPlugin.pageText_(this.currentPage_, total);
    }
    if (prev) {
      prev.disabled = this.currentPage_ <= 1;
    }
    if (next) {
      next.disabled = this.currentPage_ >= total;
    }
  }

  private renderTable_(): void {
    const table = getEl(KTOC_MENU_IDS.TABLE, true) as HTMLTableElement | null;

    this.updatePagination_();
    if (!table) {
      return;
    }

    table.innerHTML = '';
    if (this.filtered_.length === 0) {
      return;
    }

    const head = table.createTHead().insertRow();

    head.className = 'ktoc-notices-header';
    const headers = [l('table.event'), l('table.date'), l('table.satellite'), l('table.type'), l('table.status'), l('table.notice')];

    for (const text of headers) {
      const th = document.createElement('th');

      th.textContent = text;
      head.appendChild(th);
    }

    const body = table.createTBody();
    const start = (this.currentPage_ - 1) * KtocNoticesPlugin.PAGE_SIZE;

    this.filtered_.slice(start, start + KtocNoticesPlugin.PAGE_SIZE).forEach((notice, i) => {
      this.createRow_(body, notice, start + i);
    });
  }

  private createRow_(body: HTMLTableSectionElement, notice: KtocNotice, index: number): void {
    const tr = body.insertRow();

    tr.id = `ktoc-notice-row-${notice.notice_id}`;
    tr.className = 'ktoc-notice-row link';
    tr.dataset.index = String(index);
    tr.dataset.noticeId = notice.notice_id;
    if (notice.notice_id === this.selectedNoticeId_) {
      tr.classList.add('ktoc-notice-row-selected');
    }

    const canceled = isKtocCanceled(notice);

    KtocNoticesPlugin.addCell_(tr, ktocEventLabel(notice.event_num));
    KtocNoticesPlugin.addCell_(tr, formatKtocUtc(notice.event_date_ms, false));
    KtocNoticesPlugin.addCell_(tr, KtocNoticesPlugin.satelliteLabel_(notice.norad_id));
    KtocNoticesPlugin.addCell_(tr, ktocEventTypeLabel(notice.event_type));

    const statusCell = KtocNoticesPlugin.addCell_(tr, '');
    const badge = document.createElement('span');

    badge.className = `ktoc-status-badge ktoc-status-${normalizeKtocCode(notice.status).toLowerCase()}`;
    badge.textContent = ktocStatusLabel(notice.status);
    statusCell.appendChild(badge);

    if (canceled) {
      tr.classList.add('ktoc-notice-canceled');
      badge.setAttribute('kt-tooltip', escapeKtocHtml(notice.reason ?? l('values.noReason')));
      createTooltip(badge);
    }

    const linkCell = KtocNoticesPlugin.addCell_(tr, '');

    if (isSafeNoticeUrl(notice.url)) {
      const link = document.createElement('a');

      link.className = 'ktoc-notice-link material-icons';
      link.href = notice.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'open_in_new';
      link.setAttribute('aria-label', l('labels.openNotice'));
      link.setAttribute('kt-tooltip', l('labels.openNotice'));
      linkCell.appendChild(link);
      createTooltip(link);
    }
  }

  private static addCell_(tr: HTMLTableRowElement, text: string): HTMLTableCellElement {
    const cell = tr.insertCell();

    cell.textContent = text;

    return cell;
  }

  /** "25544 ISS (ZARYA)" when the object is in the loaded catalog, otherwise just the NORAD number. */
  private static satelliteLabel_(norad: number): string {
    const sat = getSatByNorad(norad);

    return sat?.name ? `${norad} ${sat.name}` : String(norad);
  }

  // =========================================================================
  // Row click
  // =========================================================================

  private onTableClick_(evt: MouseEvent): void {
    const target = evt.target as HTMLElement | null;

    // The link icon opens the notice page; it must not also select and time-jump.
    if (!target || target.closest('a')) {
      return;
    }
    const row = target.closest('tr.ktoc-notice-row') as HTMLTableRowElement | null;
    const index = row ? Number(row.dataset.index) : NaN;
    const notice = Number.isInteger(index) ? this.filtered_[index] : undefined;

    if (notice) {
      this.selectNotice_(notice);
    }
  }

  /**
   * Selects the satellite and jumps the clock to the event. Play/pause is
   * untouched (changeSimulationTime only moves the offset) and the menu stays
   * open, per the secondary-menu rule.
   */
  private selectNotice_(notice: KtocNotice): void {
    const satId = findObjectIdByNorad(notice.norad_id);

    if (satId === null) {
      toast(l('errorMsgs.notInCatalog').replace('{norad}', String(notice.norad_id)), ToastMsgType.caution);

      return;
    }

    jumpToTime(notice.event_date_ms);
    selectSat(satId);

    this.selectedNoticeId_ = notice.notice_id;
    const table = getEl(KTOC_MENU_IDS.TABLE, true);

    for (const el of table?.querySelectorAll('tr.ktoc-notice-row-selected') ?? []) {
      el.classList.remove('ktoc-notice-row-selected');
    }
    for (const row of table?.querySelectorAll<HTMLTableRowElement>('tr.ktoc-notice-row') ?? []) {
      if (row.dataset.noticeId === notice.notice_id) {
        row.classList.add('ktoc-notice-row-selected');
      }
    }
  }

  // =========================================================================
  // Small UI helpers
  // =========================================================================

  private showStatus_(message: string | null, isError = false): void {
    const el = getEl(KTOC_MENU_IDS.STATUS_MSG, true);

    if (!el) {
      return;
    }
    if (message === null) {
      el.style.display = 'none';
      el.textContent = '';

      return;
    }
    el.textContent = message;
    el.classList.toggle('ktoc-status-msg-error', isError);
    el.style.display = '';
  }

  private setRefreshDisabled_(isDisabled: boolean): void {
    const btn = getEl(KTOC_MENU_IDS.REFRESH, true) as HTMLButtonElement | null;

    if (btn) {
      btn.disabled = isDisabled;
    }
  }
}
