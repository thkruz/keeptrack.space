/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * most-tracked.ts shows the objects KeepTrack users are looking at most, in a
 * Top list and a New & Trending list (popular objects that were not in the
 * previous window's top list).
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { getStationModule, STATION_HOST_LABELS } from '@app/app/data/station-modules';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, IHelpConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { buildSideMenuTabsHtml, initSideMenuTabs, updateSideMenuTabIndicator } from '@app/engine/ui/side-menu-tabs';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { TranslationKey, t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import firePng from '@public/img/icons/fire.png';
import i18next from 'i18next';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { TooltipsPlugin } from '../tooltips/tooltips';
import { MostTrackedData, MostTrackedEntry, parseMostTrackedResponse, relativePopularity } from './most-tracked-data';
import './most-tracked.css';

const TABS_ID = 'most-tracked-tabs';

/**
 * After the endpoint fails, the menu stays unavailable this long before the
 * icon is re-enabled. Matches the endpoint's 10-minute edge cache.
 */
export const MOST_TRACKED_RETRY_MS = 10 * 60 * 1000;

/** A request that has not answered by then counts as unavailable, so Refresh never stays busy forever. */
export const MOST_TRACKED_TIMEOUT_MS = 15_000;

/** Which list a container shows. */
export type MostTrackedListKind = 'top' | 'trending';

/** Fetch state of the menu. Failures make the plugin unavailable instead (see markUnavailable_). */
export type MostTrackedStatus = 'idle' | 'loading' | 'ready';

type MostTrackedKey = Parameters<typeof t7e>[0];
const tr = (key: string, params?: Record<string, string | number>): string => t7e(`plugins.MostTracked.${key}` as MostTrackedKey, params);

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/**
 * Localized "5 minutes ago" for when the lists were built. Relative, so it
 * never disagrees with the app clock's UTC/local choice.
 */
export const formatListAge = (generatedAt: Date, now = Date.now(), locale?: string): string => {
  const diff = Math.max(0, now - generatedAt.getTime());
  const [unit, ms] = RELATIVE_UNITS.find(([, size]) => diff >= size) ?? RELATIVE_UNITS[2];

  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.floor(diff / ms), unit);
  } catch {
    return `${Math.floor(diff / ms)} ${unit}`;
  }
};

export class MostTracked extends KeepTrackPlugin {
  readonly id = 'MostTracked';
  dependencies_ = [];
  /** Uses the base plugin's offline handling: the icon is disabled or hidden while offline. */
  requiresInternet = true;

  /**
   * Selections per object over the last 24 hours, plus distinct users (see #1463). Public, no
   * API key, CORS open and cached 10 minutes at the edge, so a plain fetch on
   * every open is fine. apiFetch is deliberately not used: it would attach the
   * key header and can toast on a 401.
   */
  protected readonly dataSrc_ = 'https://api.keeptrack.space/v4/stats/most-tracked';
  protected data_: MostTrackedData | null = null;
  protected status_: MostTrackedStatus = 'idle';
  /** True after the endpoint failed, until MOST_TRACKED_RETRY_MS has passed. */
  protected isUnavailable_ = false;
  private isFetching_ = false;
  private retryTimer_: ReturnType<typeof setTimeout> | null = null;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'most-tracked-bottom-icon',
      label: tr('bottomIconLabel'),
      image: firePng,
      menuMode: [MenuMode.CATALOG, MenuMode.ALL],
    };
  }

  onBottomIconClick(): void {
    if (!this.isMenuButtonActive) {
      return;
    }

    // The base plugin can re-enable the icon (e.g. when the connection comes back) inside the retry window.
    if (this.isUnavailable_) {
      this.setBottomIconToDisabled(true);

      return;
    }

    updateSideMenuTabIndicator(TABS_ID);

    if (this.data_) {
      // Show the last lists straight away (re-resolved: the catalog may have finished loading), then refresh.
      this.renderLists_();
      this.renderStatus_();
    }

    this.fetchData_();
  }

  /** Shown by the drawer and the disabled icon while the endpoint is unavailable. */
  getDisabledReason(): string | null {
    return this.isUnavailable_ ? tr('unavailable') : null;
  }

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'most-tracked-menu',
      title: tr('title'),
      html: this.buildSideMenuHtml_(),
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: tr('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: tr('help.overview'),
        },
        {
          heading: tr('help.tabsHeading'),
          content: tr('help.tabs'),
        },
        {
          heading: t7e('help.howToUse'),
          content: tr('help.howToUse'),
        },
      ],
      tips: [tr('help.tip1'), tr('help.tip2')],
    };
  }

  // =========================================================================
  // Side menu HTML
  // =========================================================================

  private buildSideMenuHtml_(): string {
    const listCard = (kind: MostTrackedListKind) => html`
      <section class="kt-section">
        <ol id="most-tracked-${kind}-list" class="most-tracked-list" aria-label="${tr(`tabs.${kind}`)}"></ol>
        <p id="most-tracked-${kind}-empty" class="most-tracked-empty"></p>
      </section>
    `;

    const tabsHtml = buildSideMenuTabsHtml(TABS_ID, [
      { id: 'most-tracked-top-tab', label: tr('tabs.top'), content: listCard('top') },
      { id: 'most-tracked-trending-tab', label: tr('tabs.trending'), content: listCard('trending') },
    ]);

    return html`
      <div id="most-tracked-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="most-tracked-content" class="side-menu">
          <p id="most-tracked-status" class="most-tracked-status" role="status"></p>
          <button id="most-tracked-refresh-btn" class="kt-action waves-effect" type="button">
            <span class="kt-action-label">${tr('refresh')}</span>
          </button>
          ${tabsHtml}
          <sub class="most-tracked-note">${tr('privacyNote')}</sub>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  private uiManagerFinal_(): void {
    initSideMenuTabs(TABS_ID);

    getEl('most-tracked-refresh-btn', true)?.addEventListener('click', () => {
      this.fetchData_();
    });

    for (const kind of ['top', 'trending'] as const) {
      getEl(`most-tracked-${kind}-list`, true)?.addEventListener('click', (evt: Event) => {
        const row = (evt.target as HTMLElement | null)?.closest<HTMLButtonElement>('button.most-tracked-row');

        if (row?.dataset.norad && !row.disabled) {
          this.selectByNorad_(row.dataset.norad);
        }
      });
    }

    this.renderStatus_();
  }

  // =========================================================================
  // Data
  // =========================================================================

  /**
   * Fetches both lists. Any failure (unreachable, non-2xx such as the
   * documented `503 Usage data unavailable`, or an unexpected payload) makes
   * the plugin unavailable without a toast, as agreed in #1463.
   */
  protected async fetchData_(): Promise<void> {
    // Embedded views and offline builds never fetch; the embed profile also disables the plugin.
    if (this.isFetching_ || this.isUnavailable_ || settingsManager.isEmbedMode || settingsManager.offlineMode) {
      return;
    }

    this.isFetching_ = true;
    this.setStatus_('loading');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MOST_TRACKED_TIMEOUT_MS);

    try {
      const response = await fetch(this.dataSrc_, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Most Tracked endpoint returned ${response.status}`);
      }

      const data = parseMostTrackedResponse(await response.json());

      if (!data) {
        throw new Error('Most Tracked endpoint returned an unexpected payload');
      }

      this.data_ = data;
      this.renderLists_();
      this.setStatus_('ready');
    } catch (err) {
      this.markUnavailable_((err as Error).message);
    } finally {
      clearTimeout(timeout);
      this.isFetching_ = false;
    }
  }

  /**
   * Closes the menu and disables the icon (the drawer row follows it and shows
   * getDisabledReason on tap), then re-enables it after MOST_TRACKED_RETRY_MS
   * so a short outage does not remove the menu for the whole session.
   */
  protected markUnavailable_(reason: string): void {
    errorManagerInstance.log(`MostTracked: ${reason}`);
    this.isUnavailable_ = true;
    // Re-render so Refresh is not left disabled from the 'loading' state when the menu comes back.
    this.setStatus_(this.data_ ? 'ready' : 'idle');
    this.setBottomIconToDisabled(true);

    if (this.retryTimer_) {
      clearTimeout(this.retryTimer_);
    }
    this.retryTimer_ = setTimeout(() => {
      this.retryTimer_ = null;
      this.isUnavailable_ = false;
      // Leave the icon alone while the base plugin has it disabled for being offline.
      if (navigator.onLine !== false) {
        this.setBottomIconToEnabled();
      }
    }, MOST_TRACKED_RETRY_MS);
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  private setStatus_(status: MostTrackedStatus): void {
    this.status_ = status;
    this.renderStatus_();
  }

  private renderStatus_(): void {
    const refreshBtn = getEl('most-tracked-refresh-btn', true) as HTMLButtonElement | null;

    if (refreshBtn) {
      refreshBtn.disabled = this.status_ === 'loading';
      refreshBtn.setAttribute('aria-busy', String(this.status_ === 'loading'));
    }

    const statusEl = getEl('most-tracked-status', true);

    if (statusEl) {
      statusEl.dataset.status = this.status_;
      statusEl.textContent = this.statusLineText_();
    }

    this.renderPlaceholders_();
  }

  /**
   * Text for the line above the tabs. With no lists yet the cards explain the
   * state themselves, so the line stays empty instead of repeating them.
   */
  private statusLineText_(): string {
    // While a refresh runs, the previous lists and their age stay on screen; Refresh shows it is busy.
    return this.data_ ? this.readyStatusText_() : '';
  }

  /** Message shown inside a list card when it has no rows: loading the first time, otherwise a real empty list. */
  private placeholderText_(kind: MostTrackedListKind): string {
    return this.data_ ? tr(`empty.${kind}`) : tr('status.loading');
  }

  private renderPlaceholders_(): void {
    for (const kind of ['top', 'trending'] as const) {
      const listEl = getEl(`most-tracked-${kind}-list`, true);
      const emptyEl = getEl(`most-tracked-${kind}-empty`, true);

      if (!emptyEl) {
        continue;
      }

      const hasRows = (listEl?.childElementCount ?? 0) > 0;

      emptyEl.hidden = hasRows;
      emptyEl.dataset.status = this.data_ ? 'empty' : this.status_;
      emptyEl.textContent = hasRows ? '' : this.placeholderText_(kind);
    }
  }

  private readyStatusText_(): string {
    const hours = this.data_?.windowHours ?? 24;
    const generatedAt = this.data_?.generatedAt;
    const windowText = tr('status.window', { hours });

    if (!generatedAt) {
      return windowText;
    }

    return `${windowText} · ${tr('status.updated', { time: formatListAge(generatedAt, Date.now(), i18next.language) })}`;
  }

  private renderLists_(): void {
    this.renderList_('top', this.data_?.top ?? []);
    this.renderList_('trending', this.data_?.trending ?? []);
  }

  /** Rebuilds one list. Built with DOM APIs (textContent), never innerHTML, since names come from catalog data. */
  protected renderList_(kind: MostTrackedListKind, entries: MostTrackedEntry[]): void {
    const listEl = getEl(`most-tracked-${kind}-list`, true);

    if (!listEl) {
      return;
    }

    listEl.replaceChildren();

    const maxCount = entries.reduce((max, entry) => Math.max(max, entry.count), 0);

    for (const entry of entries) {
      listEl.appendChild(this.buildRow_(entry, maxCount));
    }

    this.renderPlaceholders_();
  }

  /**
   * One list item holding a native button, so keyboard and screen-reader
   * behaviour come from the browser. Objects missing from the loaded catalog
   * get a disabled button; the tooltip sits on the list item because disabled
   * buttons receive no pointer events.
   */
  private buildRow_(entry: MostTrackedEntry, maxCount: number): HTMLLIElement {
    const id = MostTracked.findObjectId_(entry.norad);
    const name = id === null ? null : ServiceLocator.getCatalogManager().getObject(id)?.name;
    const item = document.createElement('li');
    const row = document.createElement('button');

    row.type = 'button';
    row.className = 'most-tracked-row';
    row.dataset.norad = entry.norad;

    const rank = document.createElement('span');

    rank.className = 'most-tracked-rank';
    rank.textContent = String(entry.rank);

    const label = document.createElement('span');

    label.className = 'most-tracked-label';

    const nameEl = document.createElement('span');
    // Attached station modules (#459) resolve to their host; name the module so the row is not a second "ISS (ZARYA)".
    const stationModule = getStationModule(entry.norad);

    nameEl.className = 'most-tracked-name';
    if (stationModule) {
      const hostLabel = STATION_HOST_LABELS[stationModule.host] ?? name ?? stationModule.host;
      const hint = t7e('searchManager.moduleOf' as TranslationKey)
        .replace('{module}', `${stationModule.name} ${entry.norad}`)
        .replace('{host}', hostLabel);

      nameEl.textContent = `${stationModule.name} (${hostLabel})`;
      label.setAttribute('aria-label', hint);
      if (id !== null) {
        label.setAttribute('kt-tooltip', hint);
        PluginRegistry.getPlugin(TooltipsPlugin)?.createTooltip(label);
      }
    } else {
      nameEl.textContent = name || tr('unknownObject');
    }

    const noradEl = document.createElement('span');

    noradEl.className = 'most-tracked-norad';
    noradEl.textContent = `NORAD ${entry.norad}`;
    label.append(nameEl, noradEl);

    const bar = document.createElement('span');

    bar.className = 'most-tracked-bar';
    bar.style.setProperty('--most-tracked-pct', `${relativePopularity(entry.count, maxCount)}%`);
    bar.setAttribute('aria-hidden', 'true');

    const count = document.createElement('span');

    count.className = 'most-tracked-count';
    count.textContent = entry.count.toLocaleString(i18next.language);
    // Also the accessible name of the cell, so screen readers hear "Selections: 9 · People: 3", not just "9".
    count.setAttribute('aria-label', MostTracked.countDetail_(entry));

    row.append(rank, label, bar, count);
    item.appendChild(row);

    if (id === null) {
      row.disabled = true;
      item.classList.add('most-tracked-item--missing');
      item.setAttribute('kt-tooltip', tr('notInCatalog'));
      PluginRegistry.getPlugin(TooltipsPlugin)?.createTooltip(item);
    } else {
      // Disabled rows get no pointer events, so only selectable rows carry the count tooltip.
      count.setAttribute('kt-tooltip', MostTracked.countDetail_(entry));
      PluginRegistry.getPlugin(TooltipsPlugin)?.createTooltip(count);
    }

    return item;
  }

  /** "Selections: 9 · People: 3" (people omitted when the server did not send users). Plural-free in every locale. */
  private static countDetail_(entry: MostTrackedEntry): string {
    const selections = tr('selections', { value: entry.count.toLocaleString(i18next.language) });

    return entry.users === null ? selections : `${selections} · ${tr('people', { value: entry.users.toLocaleString(i18next.language) })}`;
  }

  // =========================================================================
  // Selection
  // =========================================================================

  /** Catalog index of the loaded object with this NORAD, or null when it is not loaded. */
  private static findObjectId_(norad: string): number | null {
    const catalogManager = ServiceLocator.getCatalogManager();
    const id = catalogManager.sccNum2Id(norad, false);

    if (id === null || !catalogManager.getObject(id)) {
      return null;
    }

    return id;
  }

  protected selectByNorad_(norad: string): void {
    const id = MostTracked.findObjectId_(norad);

    if (id === null) {
      return;
    }

    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(id);
    EventBus.getInstance().emit(EventBusEvent.pluginActionUsed, this.id, { satId: id });
  }
}
