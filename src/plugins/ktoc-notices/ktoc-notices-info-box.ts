import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import { BaseObject, CatalogSource, Satellite } from '@ootk/src/main';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { TooltipsPlugin } from '../tooltips/tooltips';
import {
  escapeKtocHtml,
  fetchKtocNotices,
  formatKtocUtc,
  isKtocCanceled,
  isKtocFetchError,
  isSafeNoticeUrl,
  KtocFetchResult,
  KtocNotice,
  KtocNoticeQuery,
  ktocEventLabel,
  ktocEventTypeLabel,
  ktocStatusLabel,
} from './ktoc-notices-api';

export const KTOC_INFO_BOX_IDS = {
  SECTION: 'ktoc-notices-sat-info',
  TITLE: 'ktoc-notices-sat-info-title',
  LIST: 'ktoc-notices-sat-info-list',
  SHOW_ALL: 'ktoc-notices-sat-info-show-all',
} as const;

/** Info-box rows shown per satellite; the full history is one click away in the menu. */
const MAX_INFO_BOX_ROWS = 5;
/** The card asks for this many; a full page means there may be more, so the count reads "25+". */
const INFO_BOX_FETCH_LIMIT = 25;

const l = (key: string): string => t7e(`plugins.KtocNoticesPlugin.${key}` as Parameters<typeof t7e>[0]);

type Fetcher = (query: KtocNoticeQuery) => Promise<KtocFetchResult>;

/**
 * The "KTOC Notices" card in the selected-object info box. Owned by
 * KtocNoticesPlugin so the feature stays one plugin; it registers with
 * SatInfoBox only when that plugin is loaded (satInfoBoxInit never fires
 * otherwise), so there is no hard dependency.
 *
 * One request per selected NORAD number, cached for the session. A reply that
 * arrives after the selection changed is dropped (revision guard). The card
 * stays hidden for objects without notices and after the API rejects the key.
 */
export class KtocNoticesInfoBoxSection {
  private selectionRevision_ = 0;
  private readonly cache_ = new Map<number, KtocNotice[]>();
  /** The API key value the server rejected; a new key (e.g. after login) retries. */
  private rejectedApiKey_: string | null = null;
  private currentNorad_: number | null = null;

  constructor(
    private readonly onShowAll_: (norad: number) => void,
    private readonly fetcher_: Fetcher = fetchKtocNotices
  ) {}

  register(): void {
    const eventBus = EventBus.getInstance();

    eventBus.on(EventBusEvent.satInfoBoxInit, () => {
      PluginRegistry.getPlugin(SatInfoBox)?.addElement({ html: KtocNoticesInfoBoxSection.createSectionHtml_(), order: 8 });
    });
    eventBus.on(EventBusEvent.satInfoBoxAddListeners, () => {
      PluginRegistry.getPlugin(SatInfoBox)?.addListenerToCollapseElement(getEl(KTOC_INFO_BOX_IDS.SECTION, true));
      getEl(KTOC_INFO_BOX_IDS.SHOW_ALL, true)?.addEventListener('click', () => {
        if (this.currentNorad_ !== null) {
          this.onShowAll_(this.currentNorad_);
        }
      });
    });
    eventBus.on(EventBusEvent.selectSatData, (obj?: BaseObject) => {
      if (SatInfoBox.isCurrentSelection(obj)) {
        this.update(obj);
      }
    });
  }

  /** Public NORAD number of a selectable catalog satellite, or null (missiles, VIMPEL, analyst objects). */
  static noradOf(obj?: BaseObject | null): number | null {
    if (!(obj instanceof Satellite) || obj.source === CatalogSource.VIMPEL || obj.country === 'ANALSAT') {
      return null;
    }
    const norad = Number(obj.sccNum);

    return Number.isInteger(norad) && norad > 0 ? norad : null;
  }

  update(obj?: BaseObject | null): void {
    const revision = ++this.selectionRevision_;
    const norad = KtocNoticesInfoBoxSection.noradOf(obj);

    this.currentNorad_ = norad;
    this.hide_();

    if (norad === null || this.isKeyRejected_()) {
      return;
    }

    const cached = this.cache_.get(norad);

    if (cached) {
      this.render_(cached);

      return;
    }

    const requestKey = settingsManager.apiKey;

    this.fetcher_({ norad, limit: INFO_BOX_FETCH_LIMIT }).then((result) => {
      if (isKtocFetchError(result)) {
        if (result.failure === 'auth') {
          this.rejectedApiKey_ = requestKey;
        }

        return;
      }

      // Cache even when stale: the data is still correct for that NORAD number.
      this.cache_.set(norad, result.notices);
      if (revision === this.selectionRevision_) {
        this.render_(result.notices);
      }
    });
  }

  private isKeyRejected_(): boolean {
    return this.rejectedApiKey_ !== null && this.rejectedApiKey_ === settingsManager.apiKey;
  }

  private hide_(): void {
    const section = getEl(KTOC_INFO_BOX_IDS.SECTION, true);

    if (section) {
      section.style.display = 'none';
    }
  }

  private render_(notices: KtocNotice[]): void {
    const section = getEl(KTOC_INFO_BOX_IDS.SECTION, true);
    const list = getEl(KTOC_INFO_BOX_IDS.LIST, true);

    if (!section || !list || notices.length === 0) {
      return;
    }

    const title = getEl(KTOC_INFO_BOX_IDS.TITLE, true);

    // A full page may be capped, so never state it as the exact total.
    const count = notices.length >= INFO_BOX_FETCH_LIMIT ? `${INFO_BOX_FETCH_LIMIT}+` : String(notices.length);

    if (title) {
      title.textContent = l('infoBox.titleWithCount').replace('{count}', count);
    }

    list.innerHTML = '';
    const tooltips = PluginRegistry.getPlugin(TooltipsPlugin);

    for (const notice of notices.slice(0, MAX_INFO_BOX_ROWS)) {
      const row = KtocNoticesInfoBoxSection.createRow_(notice);

      list.appendChild(row);
      if (row.hasAttribute('kt-tooltip')) {
        tooltips?.createTooltip(row);
      }
    }

    const showAll = getEl(KTOC_INFO_BOX_IDS.SHOW_ALL, true);

    if (showAll) {
      showAll.style.display = '';
      const label = showAll.querySelector('.ktoc-sat-info-show-all-label');

      if (label) {
        label.textContent = l('infoBox.showAll').replace('{count}', count);
      }
    }

    section.style.display = '';
  }

  private static createRow_(notice: KtocNotice): HTMLElement {
    const isLink = isSafeNoticeUrl(notice.url);
    const row = document.createElement(isLink ? 'a' : 'div');

    row.id = `ktoc-notices-sat-info-row-${notice.notice_id}`;
    row.className = 'ktoc-sat-info-row';
    if (isLink) {
      row.setAttribute('href', notice.url);
      row.setAttribute('target', '_blank');
      row.setAttribute('rel', 'noopener noreferrer');
    }

    const canceled = isKtocCanceled(notice);

    if (canceled) {
      row.classList.add('ktoc-notice-canceled');
      row.setAttribute('kt-tooltip', escapeKtocHtml(notice.reason ?? l('values.noReason')));
    }

    const top = document.createElement('div');

    top.className = 'ktoc-sat-info-row-top';
    top.textContent = `${ktocEventLabel(notice.event_num)}: ${ktocEventTypeLabel(notice.event_type)}`;

    const bottom = document.createElement('div');

    bottom.className = 'ktoc-sat-info-row-bottom';
    const status = document.createElement('span');

    status.className = `ktoc-status-badge ktoc-status-${notice.status.toLowerCase()}`;
    status.textContent = ktocStatusLabel(notice.status);
    bottom.append(document.createTextNode(`${formatKtocUtc(notice.event_date_ms)} `), status);

    row.append(top, bottom);

    return row;
  }

  private static createSectionHtml_(): string {
    return html`
      <div id="${KTOC_INFO_BOX_IDS.SECTION}" class="sat-info-section" style="display:none;">
        <div class="sat-info-section-header">
          <span id="${KTOC_INFO_BOX_IDS.TITLE}">${l('infoBox.title')}</span>
          <span id="${KTOC_INFO_BOX_IDS.SECTION}-collapse" class="section-collapse material-icons">expand_less</span>
        </div>
        <div id="${KTOC_INFO_BOX_IDS.LIST}" class="ktoc-sat-info-list"></div>
        <div id="${KTOC_INFO_BOX_IDS.SHOW_ALL}" class="ktoc-sat-info-show-all link menu-selectable pointable" style="display:none;">
          <span class="ktoc-sat-info-show-all-label">${l('infoBox.showAll')}</span>
        </div>
      </div>
    `;
  }
}
