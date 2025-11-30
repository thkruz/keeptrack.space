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
import { getEl } from '@app/engine/utils/get-el';
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
  private readonly collisionDataSrc_ = 'https://api.keeptrack.space/v2/socrates/latest';
  private selectSatIdOnCruncher_: number | null = null;
  private collisionList_: CollisionEvent[] = [];

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'menu-satellite-collision',
      label: t7e('plugins.Collisions.bottomIconLabel'),
      image: CollisionsPng,
      menuMode: [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL],
    };
  }

  /**
   * Called when the bottom icon is clicked.
   */
  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      this.parseCollisionData_();
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

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 575,
      maxWidth: 700,
    };
  }

  private buildSideMenuHtml_(): string {
    return html`
      <div id="Collisions-menu" class="side-menu-parent start-hidden text-select">
        <div id="Collisions-content" class="side-menu">
          <div class="row">
            <h5 class="center-align">${t7e('plugins.Collisions.title')}</h5>
            <table id="Collisions-table" class="center-align"></table>
            <sub class="center-align">*Collision data provided by CelesTrak via <a href="https://celestrak.org/SOCRATES/" target="_blank" rel="noreferrer">SOCRATES</a>.</sub>
          </div>
        </div>
      </div>
    `;
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.Collisions.title'),
      body: t7e('plugins.Collisions.helpBody'),
    };
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));

    EventBus.getInstance().on(EventBusEvent.onCruncherMessage, () => {
      if (this.selectSatIdOnCruncher_ !== null) {
        // If selectedSatManager is loaded, set the selected sat to the one that was just added
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(this.selectSatIdOnCruncher_);

        this.selectSatIdOnCruncher_ = null;
      }
    });
  }

  private uiManagerFinal_() {
    getEl('Collisions-menu')!.addEventListener('click', (evt: MouseEvent) => {
      const el = (<HTMLElement>evt.target).parentElement;

      if (!el!.classList.contains('Collisions-object')) {
        return;
      }
      // Might be better code for this.
      const hiddenRow = el!.dataset?.row;

      if (hiddenRow !== null) {
        showLoading(() => {
          this.eventClicked_(parseInt(hiddenRow!));
        });
      }
    });
  }

  private parseCollisionData_() {
    if (this.collisionList_.length === 0) {
      // Only generate the table if receiving the -1 argument for the first time
      fetch(this.collisionDataSrc_).then((response) => {
        response.json().then((collisionList: CollisionEvent[]) => {
          this.collisionList_ = collisionList;
          this.createTable_();

          if (this.collisionList_.length === 0) {
            errorManagerInstance.warn(t7e('plugins.Collisions.errorMsgs.noCollisionsData'));
          }
        });
      });
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

  private createTable_(): void {
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

  private static createHeaders_(tbl: HTMLTableElement) {
    const tr = tbl.insertRow();
    const names = ['TOCA', '#1', '#2', 'Max Prob', 'Min Range (km)', 'Rel Speed (km/s)'];

    for (const name of names) {
      const column = tr.insertCell();

      column.appendChild(document.createTextNode(name));
      column.setAttribute('style', 'text-decoration: underline');
    }
  }

  private createRow_(tbl: HTMLTableElement, i: number): HTMLTableRowElement {
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

  private static createCell_(tr: HTMLTableRowElement, text: string): void {
    const cell = tr.insertCell();

    cell.appendChild(document.createTextNode(text));
  }
}
