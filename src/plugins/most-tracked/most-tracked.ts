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

import { apiFetch } from '@app/app/data/api-fetch';
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
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import firePng from '@public/img/icons/fire.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { MostTrackedData, MostTrackedEntry, parseMostTrackedResponse, relativePopularity } from './most-tracked-data';
import './most-tracked.css';

const TABS_ID = 'most-tracked-tabs';

/** How long a fetched list is reused before reopening the menu fetches it again. */
export const MOST_TRACKED_CACHE_MS = 5 * 60 * 1000;

/** Which list a container shows. */
export type MostTrackedListKind = 'top' | 'trending';

/** Menu state shown in the status line above the lists. */
export type MostTrackedStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

type MostTrackedKey = Parameters<typeof t7e>[0];
const tr = (key: string, params?: Record<string, string | number>): string => t7e(`plugins.MostTracked.${key}` as MostTrackedKey, params);

export class MostTracked extends KeepTrackPlugin {
  readonly id = 'MostTracked';
  dependencies_ = [];
  /** Uses the base plugin's offline handling: the icon is disabled or hidden while offline. */
  requiresInternet = true;

  /** Aggregated, anonymous counts served by KeepTrack (endpoint shape: see issue #1463). */
  protected readonly dataSrc_ = 'https://api.keeptrack.space/v4/most-tracked';
  protected data_: MostTrackedData | null = null;
  protected status_: MostTrackedStatus = 'idle';
  private lastFetchMs_ = 0;
  private isFetching_ = false;

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

    updateSideMenuTabIndicator(TABS_ID);

    if (this.shouldFetch_()) {
      this.fetchData_();
    } else if (this.data_) {
      // Re-resolve cached rows: the catalog may have finished loading since the last render.
      this.renderLists_();
    }
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
        <p id="most-tracked-${kind}-empty" class="most-tracked-empty" hidden>${tr(`empty.${kind}`)}</p>
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
          ${tabsHtml}
          <button id="most-tracked-refresh-btn" class="kt-action waves-effect" type="button">
            <span class="kt-action-label">${tr('refresh')}</span>
          </button>
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
        const row = (evt.target as HTMLElement | null)?.closest<HTMLElement>('.most-tracked-row');

        if (row?.dataset.norad && !row.classList.contains('most-tracked-row--missing')) {
          this.selectByNorad_(row.dataset.norad);
        }
      });
    }

    this.renderStatus_();
  }

  // =========================================================================
  // Data
  // =========================================================================

  /** True when there is no list yet or the cached one is older than MOST_TRACKED_CACHE_MS. */
  protected shouldFetch_(now = Date.now()): boolean {
    if (this.isFetching_) {
      return false;
    }

    return this.data_ === null || now - this.lastFetchMs_ > MOST_TRACKED_CACHE_MS;
  }

  /**
   * Fetches both lists. Failures stay inside the menu (status line + retry via
   * Refresh); this never toasts, because the menu is optional and the endpoint
   * being down must not interrupt the user.
   */
  protected async fetchData_(): Promise<void> {
    if (this.isFetching_) {
      return;
    }

    // Embedded views and offline builds have no use for a live popularity feed.
    if (settingsManager.isEmbedMode || settingsManager.offlineMode) {
      this.setStatus_('unavailable');

      return;
    }

    this.isFetching_ = true;
    this.setStatus_('loading');

    try {
      const response = await apiFetch(this.dataSrc_);

      if (!response.ok) {
        throw new Error(`Most Tracked endpoint returned ${response.status}`);
      }

      const data = parseMostTrackedResponse(await response.json());

      if (!data) {
        throw new Error('Most Tracked endpoint returned an unexpected payload');
      }

      this.data_ = data;
      this.lastFetchMs_ = Date.now();
      this.renderLists_();
      this.setStatus_('ready');
    } catch (err) {
      errorManagerInstance.log(`MostTracked: ${(err as Error).message}`);
      this.setStatus_('error');
    } finally {
      this.isFetching_ = false;
    }
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  private setStatus_(status: MostTrackedStatus): void {
    this.status_ = status;
    this.renderStatus_();
  }

  private renderStatus_(): void {
    const statusEl = getEl('most-tracked-status', true);

    if (!statusEl) {
      return;
    }

    statusEl.dataset.status = this.status_;

    switch (this.status_) {
      case 'loading':
        statusEl.textContent = tr('status.loading');
        break;
      case 'error':
        statusEl.textContent = tr('status.error');
        break;
      case 'unavailable':
        statusEl.textContent = tr('status.unavailable');
        break;
      case 'ready':
        statusEl.textContent = this.readyStatusText_();
        break;
      default:
        statusEl.textContent = '';
    }
  }

  private readyStatusText_(): string {
    const hours = this.data_?.windowHours ?? 24;
    const generatedAt = this.data_?.generatedAt;
    const windowText = tr('status.window', { hours });

    if (!generatedAt) {
      return windowText;
    }

    const time = generatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    return `${windowText} · ${tr('status.updated', { time })}`;
  }

  private renderLists_(): void {
    this.renderList_('top', this.data_?.top ?? []);
    this.renderList_('trending', this.data_?.trending ?? []);
  }

  /** Rebuilds one list. Built with DOM APIs (textContent), never innerHTML, since names come from catalog data. */
  protected renderList_(kind: MostTrackedListKind, entries: MostTrackedEntry[]): void {
    const listEl = getEl(`most-tracked-${kind}-list`, true);
    const emptyEl = getEl(`most-tracked-${kind}-empty`, true);

    if (!listEl) {
      return;
    }

    listEl.replaceChildren();
    if (emptyEl) {
      emptyEl.hidden = entries.length > 0;
    }

    const maxCount = entries.reduce((max, entry) => Math.max(max, entry.count), 0);

    for (const entry of entries) {
      listEl.appendChild(this.buildRow_(entry, maxCount));
    }
  }

  private buildRow_(entry: MostTrackedEntry, maxCount: number): HTMLLIElement {
    const id = MostTracked.findObjectId_(entry.norad);
    const name = id === null ? null : ServiceLocator.getCatalogManager().getObject(id)?.name;
    const row = document.createElement('li');

    row.className = 'most-tracked-row';
    row.dataset.norad = entry.norad;

    const rank = document.createElement('span');

    rank.className = 'most-tracked-rank';
    rank.textContent = String(entry.rank);

    const label = document.createElement('span');

    label.className = 'most-tracked-label';

    const nameEl = document.createElement('span');

    nameEl.className = 'most-tracked-name';
    nameEl.textContent = name ?? tr('unknownObject');

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
    count.textContent = entry.count.toLocaleString();

    row.append(rank, label, bar, count);

    if (id === null) {
      row.classList.add('most-tracked-row--missing');
      row.setAttribute('kt-tooltip', tr('notInCatalog'));
      row.setAttribute('aria-disabled', 'true');
    } else {
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.addEventListener('keydown', (evt: KeyboardEvent) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          this.selectByNorad_(entry.norad);
        }
      });
    }

    return row;
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
