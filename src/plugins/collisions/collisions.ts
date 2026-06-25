import { apiFetch } from '@app/app/data/api-fetch';
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IDragOptions,
  IHelpConfig,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import CollisionsPng from '@public/img/icons/collisions.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './collisions.css';

//  Updated to match KeepTrack API v2
export interface CollisionEvent {
  ID: number;
  SAT1: number;
  SAT1_NAME: string;
  SAT1_STATUS: string;
  SAT2: number;
  SAT2_NAME: string;
  SAT2_STATUS: string;
  SAT1_AGE_OF_TLE: number;
  SAT2_AGE_OF_TLE: number;
  TOCA: string;
  MIN_RNG: number;
  DILUTION_THRESHOLD: number;
  REL_SPEED: number;
  MAX_PROB: number;
}

export class Collisions extends KeepTrackPlugin {
  readonly id = 'Collisions';
  dependencies_ = [];
  requiresInternet = true;
  private readonly collisionDataSrc_ = 'https://api.keeptrack.space/v4/socrates/latest';
  private selectSatIdOnCruncher_: number | null = null;
  protected collisionList_: CollisionEvent[] = [];
  private isLoggedIn_ = false;
  private isFetching_ = false;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'conjunction-feed-icon',
      label: t7e('plugins.Collisions.bottomIconLabel'),
      image: CollisionsPng,
      menuMode: [MenuMode.CONJUNCTIONS, MenuMode.ALL],
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

    if (this.isLoggedIn_ && this.collisionList_.length === 0) {
      this.fetchCollisionData_();
    }
  }

  // Bridge for legacy event system (per CLAUDE.md)
  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'Collisions-menu',
      title: t7e('plugins.Collisions.title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  protected getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 650,
      maxWidth: 900,
    };
  }

  protected buildSideMenuHtml_(): string {
    const tb = (key: string) => t7e(`plugins.Collisions.toolbar.${key}` as Parameters<typeof t7e>[0]);
    const lbl = (key: string) => t7e(`plugins.Collisions.labels.${key}` as Parameters<typeof t7e>[0]);
    const attribution = t7e('plugins.Collisions.dataSource' as Parameters<typeof t7e>[0])
      .replace('{link}', '<a href="https://celestrak.org/SOCRATES/" target="_blank" rel="noreferrer">SOCRATES</a>');

    return html`
      <div id="Collisions-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div id="Collisions-content" class="side-menu">
          ${this.buildToolbarSection_(tb, lbl)}
          <section class="kt-section">
            <div class="kt-section-label">${lbl('results')}</div>
            <table id="Collisions-table" class="collision-table"></table>
            <sub class="collision-attribution">*${attribution}</sub>
          </section>
        </div>
      </div>
    `;
  }

  /**
   * The Fetch / Refresh toolbar as v13 action rows. Only one is visible at a
   * time (fetch before data is loaded, refresh afterwards); the visibility
   * toggling lives in {@link updateToolbarForLoginState_}. Pro reuses these same
   * button IDs, so the wiring in {@link uiManagerFinal_} is shared.
   */
  protected buildToolbarSection_(tb: (key: string) => string, lbl: (key: string) => string): string {
    return html`
      <section class="kt-section">
        <div class="kt-section-label">${lbl('dataActions')}</div>
        <button id="Collisions-fetch-btn" class="kt-action waves-effect" type="button">
          <span class="kt-action-label">${tb('fetchData')}</span>
        </button>
        <button id="Collisions-refresh-btn" class="kt-action waves-effect" type="button" style="display:none;">
          <span class="kt-action-label">${tb('refresh')}</span>
        </button>
      </section>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.Collisions.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.Collisions.help.overview'),
          image: {
            src: 'img/help/collisions/collisions-menu.png',
            alt: t7e('plugins.Collisions.help.imgAlt'),
            caption: t7e('plugins.Collisions.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.Collisions.help.columnsHeading'),
          content: t7e('plugins.Collisions.help.columns'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.Collisions.help.howToUse'),
        },
      ],
      tips: [
        t7e('plugins.Collisions.help.tip1'),
        t7e('plugins.Collisions.help.tip2'),
        t7e('plugins.Collisions.help.tip3'),
      ],
    };
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
        // If selectedSatManager is loaded, set the selected sat to the one that was just added
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(this.selectSatIdOnCruncher_);

        this.selectSatIdOnCruncher_ = null;
      }
    });
  }

  protected uiManagerFinal_() {
    getEl('Collisions-fetch-btn', true)?.addEventListener('click', () => {
      hideEl('Collisions-fetch-btn');
      showEl('Collisions-refresh-btn', 'flex');
      this.fetchCollisionData_();
    });

    getEl('Collisions-refresh-btn', true)?.addEventListener('click', () => {
      this.collisionList_ = [];
      this.fetchCollisionData_();
    });

    getEl('Collisions-menu', true)?.addEventListener('click', (evt: MouseEvent) => {
      // Walk up from the click target so nested markup (table cells or card
      // internals) still resolves to its `.Collisions-object` row/card.
      const el = (<HTMLElement>evt.target).closest('.Collisions-object') as HTMLElement | null;

      if (!el) {
        return;
      }

      const hiddenRow = el.dataset?.row;

      if (hiddenRow !== undefined) {
        showLoading(() => {
          this.eventClicked_(parseInt(hiddenRow));
        });
      }
    });
  }

  private fetchCollisionData_(): void {
    if (this.isFetching_) {
      return;
    }
    this.isFetching_ = true;

    apiFetch(this.collisionDataSrc_)
      .then((response) => response.json())
      .then((collisionList: CollisionEvent[]) => {
        this.collisionList_ = collisionList;
        this.createTable_();

        if (this.collisionList_.length === 0) {
          errorManagerInstance.warn(t7e('plugins.Collisions.errorMsgs.noCollisionsData'));
        }

        hideEl('Collisions-fetch-btn');
        showEl('Collisions-refresh-btn', 'flex');
      })
      .catch(() => {
        errorManagerInstance.warn(t7e('plugins.Collisions.errorMsgs.noCollisionsData'));
      })
      .finally(() => {
        this.isFetching_ = false;
      });
  }

  private onUserLogin_(): void {
    this.isLoggedIn_ = true;

    if (this.isMenuButtonActive) {
      this.updateToolbarForLoginState_();
      if (this.collisionList_.length === 0) {
        this.fetchCollisionData_();
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
    const fetchBtn = getEl('Collisions-fetch-btn', true);
    const refreshBtn = getEl('Collisions-refresh-btn', true);

    if (this.isLoggedIn_) {
      if (fetchBtn) {
        hideEl(fetchBtn);
      }
      if (refreshBtn) {
        showEl(refreshBtn, 'flex');
      }
    } else {
      if (fetchBtn) {
        if (this.collisionList_.length === 0) {
          showEl(fetchBtn, 'flex');
        } else {
          hideEl(fetchBtn);
        }
      }
      if (refreshBtn) {
        if (this.collisionList_.length > 0) {
          showEl(refreshBtn, 'flex');
        } else {
          hideEl(refreshBtn);
        }
      }
    }
  }

  private eventClicked_(row: number) {
    const now = new Date();

    ServiceLocator.getTimeManager().changeStaticOffset(new Date(this.collisionList_[row].TOCA).getTime() - now.getTime() - 1000 * 30);
    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

    const sat1 = this.collisionList_[row].SAT1.toString().padStart(5, '0');
    const sat2 = this.collisionList_[row].SAT2.toString().padStart(5, '0');

    ServiceLocator.getUiManager().doSearch(`${sat1},${sat2}`);
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    this.selectSatIdOnCruncher_ = catalogManagerInstance.sccNum2Id(parseInt(sat1));
  }

  protected createTable_(): void {
    try {
      const tbl = <HTMLTableElement>getEl('Collisions-table');

      tbl.innerHTML = ''; // Clear the table from old object data

      Collisions.createHeaders_(tbl);

      this.createBody_(tbl);
    } catch {
      errorManagerInstance.warn(t7e('plugins.Collisions.errorMsgs.errorProcessingCollisions'));
    }
  }

  private createBody_(tbl: HTMLTableElement) {
    for (let i = 0; i < this.collisionList_.length; i++) {
      this.createRow_(tbl, i);
    }
  }

  protected static createHeaders_(tbl: HTMLTableElement) {
    const th = (key: string) => t7e(`plugins.Collisions.table.${key}` as Parameters<typeof t7e>[0]);
    const tr = tbl.insertRow();
    const names = [th('toca'), th('sat1'), th('sat2'), th('maxProb'), th('minRange'), th('relSpeed')];

    for (const name of names) {
      const column = tr.insertCell();

      column.appendChild(document.createTextNode(name));
    }
  }

  protected createRow_(tbl: HTMLTableElement, i: number): HTMLTableRowElement {
    // Create a new row
    const tr = tbl.insertRow();

    tr.setAttribute('class', `${this.id}-object link`);
    tr.setAttribute('data-row', i.toString());

    // Populate the table with the data
    Collisions.createCell_(tr, this.collisionList_[i].TOCA.slice(0, 19).replace('T', ' '));
    Collisions.createCell_(tr, this.collisionList_[i].SAT1.toString());
    Collisions.createCell_(tr, this.collisionList_[i].SAT2.toString());
    Collisions.createCell_(tr, this.collisionList_[i].MAX_PROB.toFixed(3));
    Collisions.createCell_(tr, this.collisionList_[i].MIN_RNG.toString());
    Collisions.createCell_(tr, this.collisionList_[i].REL_SPEED.toFixed(2));

    return tr;
  }

  protected static createCell_(tr: HTMLTableRowElement, text: string): void {
    const cell = tr.insertCell();

    cell.appendChild(document.createTextNode(text));
  }
}
