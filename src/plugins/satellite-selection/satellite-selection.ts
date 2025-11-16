/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * satellite-selection.ts - Plugin for calculating Time of Closest Approach (TOCA)
 * and Point of Closest Approach (POCA) between two satellites
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

import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { dateFormat } from '@app/engine/utils/dateFormat';
import { DetailedSatellite, EciVec3, Kilometers, RIC } from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import SatelliteSelectionPng from '@public/img/icons/satellite-selection.png';
import './satellite-selection.css';

export interface TocaPocaEvent {
  time: Date;
  offset: number;
  distance: Kilometers;
  sat1Position: EciVec3;
  sat2Position: EciVec3;
  relativeVelocity: number;
}

export class SatelliteSelection extends KeepTrackPlugin {
  readonly id = 'SatelliteSelection';
  dependencies_ = [SelectSatManager.name];

  private selectSatManager_: SelectSatManager;
  private targetSatellite_: DetailedSatellite | null = null;
  private primarySatellite_: DetailedSatellite | null = null;
  private tocaPocaList_: TocaPocaEvent[] = [];
  private selectSatIdOnCruncher_: number | null = null;

  // Configuration
  private readonly propagationDays_ = 7; // Look ahead 7 days
  private readonly timeStep_ = 60; // 60 second intervals
  private readonly maxEvents_ = 10; // Show next 10 closest approaches

  bottomIconElementName: string = 'menu-satellite-selection';
  bottomIconImg = SatelliteSelectionPng;
  bottomIconLabel = 'Satellite TOCA/POCA';
  sideMenuElementName: string = `${this.id}-menu`;
  sideMenuElementHtml = html`
  <div id="${this.id}-menu" class="side-menu-parent start-hidden text-select">
    <div id="${this.id}-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Satellite Closest Approaches</h5>
        <div id="${this.id}-satellite-info" class="center-align">
          <p id="${this.id}-primary-sat">Primary: None Selected</p>
          <p id="${this.id}-target-sat">Target: None Selected</p>
        </div>
        <table id="${this.id}-table" class="center-align striped-light"></table>
        <div class="center-align">
          <button id="${this.id}-set-target-btn" class="btn btn-ui waves-effect waves-light">Set as Target Satellite</button>
        </div>
      </div>
    </div>
  </div>`;

  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 600,
    maxWidth: 800,
  };

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager;
  }

  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      this.updateSatelliteInfo_();
      if (this.primarySatellite_ && this.targetSatellite_) {
        this.calculateTocaPoca_();
      }
    }
  };

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));

    EventBus.getInstance().on(EventBusEvent.selectSatData, (sat: DetailedSatellite) => {
      if (sat.isSatellite()) {
        this.primarySatellite_ = sat;
        if (this.isMenuButtonActive) {
          this.updateSatelliteInfo_();
          if (this.targetSatellite_) {
            this.calculateTocaPoca_();
          }
        }
      }
    });

    EventBus.getInstance().on(EventBusEvent.onCruncherMessage, () => {
      if (this.selectSatIdOnCruncher_ !== null) {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(this.selectSatIdOnCruncher_);
        this.selectSatIdOnCruncher_ = null;
      }
    });
  }

  private uiManagerFinal_() {
    // Handle clicking on TOCA/POCA entries
    getEl(this.sideMenuElementName)!.addEventListener('click', (evt: MouseEvent) => {
      const el = (<HTMLElement>evt.target).parentElement;

      if (!el!.classList.contains(`${this.id}-event`)) {
        return;
      }

      const eventRow = el!.dataset?.row;

      if (eventRow !== null) {
        showLoading(() => {
          this.eventClicked_(parseInt(eventRow!));
        });
      }
    });

    // Handle "Set as Target Satellite" button
    getEl(`${this.id}-set-target-btn`)!.addEventListener('click', () => {
      const selectedSat = this.selectSatManager_.getSelectedSat();

      if (!selectedSat || !selectedSat.isSatellite()) {
        errorManagerInstance.warn('Please select a satellite first!');
        return;
      }

      this.targetSatellite_ = selectedSat as DetailedSatellite;
      this.updateSatelliteInfo_();

      if (this.primarySatellite_ && this.targetSatellite_) {
        showLoading(() => {
          this.calculateTocaPoca_();
        });
      } else {
        errorManagerInstance.info('Target satellite set. Now select a primary satellite to calculate TOCA/POCA.');
      }
    });
  }

  private updateSatelliteInfo_() {
    const primaryEl = getEl(`${this.id}-primary-sat`);
    const targetEl = getEl(`${this.id}-target-sat`);

    if (this.primarySatellite_) {
      primaryEl!.textContent = `Primary: ${this.primarySatellite_.name} (${this.primarySatellite_.sccNum})`;
    } else {
      primaryEl!.textContent = 'Primary: None Selected';
    }

    if (this.targetSatellite_) {
      targetEl!.textContent = `Target: ${this.targetSatellite_.name} (${this.targetSatellite_.sccNum})`;
    } else {
      targetEl!.textContent = 'Target: None Selected';
    }
  }

  private eventClicked_(row: number) {
    const event = this.tocaPocaList_[row];
    const now = new Date();

    // Change time to 30 seconds before the TOCA
    ServiceLocator.getTimeManager().changeStaticOffset(event.time.getTime() - now.getTime() - 1000 * 30);
    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

    // Highlight both satellites in the search bar
    const sat1Scc = this.primarySatellite_!.sccNum.toString().padStart(5, '0');
    const sat2Scc = this.targetSatellite_!.sccNum.toString().padStart(5, '0');

    ServiceLocator.getUiManager().doSearch(`${sat1Scc},${sat2Scc}`);
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    this.selectSatIdOnCruncher_ = catalogManagerInstance.sccNum2Id(parseInt(sat1Scc));
  }

  private calculateTocaPoca_() {
    if (!this.primarySatellite_ || !this.targetSatellite_) {
      errorManagerInstance.warn('Please select both a primary and target satellite!');
      return;
    }

    try {
      const events: TocaPocaEvent[] = [];
      const timeManagerInstance = ServiceLocator.getTimeManager();
      const propagationSeconds = this.propagationDays_ * 24 * 60 * 60;

      let previousDistance = Infinity;
      let isDescending = false;
      const localMinima: TocaPocaEvent[] = [];

      // Propagate both satellites and find local minima in distance
      for (let t = 0; t < propagationSeconds; t += this.timeStep_) {
        const offset = t * 1000; // Convert to milliseconds
        const currentTime = timeManagerInstance.getOffsetTimeObj(offset);

        // Get positions for both satellites at this time
        const sat1J2000 = this.primarySatellite_.toJ2000(currentTime);
        const sat2J2000 = this.targetSatellite_.toJ2000(currentTime);

        // Calculate RIC (Radial, In-track, Cross-track) coordinates
        const ric = RIC.fromJ2000(sat1J2000, sat2J2000);
        const distance = ric.range;

        // Check for local minimum (distance was decreasing and now increasing)
        if (previousDistance < Infinity) {
          if (previousDistance < distance && isDescending) {
            // Found a local minimum - this is a TOCA/POCA
            const previousTime = timeManagerInstance.getOffsetTimeObj((t - this.timeStep_) * 1000);

            localMinima.push({
              time: previousTime,
              offset: (t - this.timeStep_) * 1000,
              distance: previousDistance as Kilometers,
              sat1Position: sat1J2000.position,
              sat2Position: sat2J2000.position,
              relativeVelocity: Math.sqrt(
                ric.velocity.x ** 2 + ric.velocity.y ** 2 + ric.velocity.z ** 2
              ),
            });
          }

          isDescending = distance < previousDistance;
        }

        previousDistance = distance;
      }

      // Sort by distance and take the closest 10
      this.tocaPocaList_ = localMinima
        .sort((a, b) => a.distance - b.distance)
        .slice(0, this.maxEvents_);

      // Sort by time for display
      this.tocaPocaList_.sort((a, b) => a.time.getTime() - b.time.getTime());

      if (this.tocaPocaList_.length === 0) {
        errorManagerInstance.warn(`No close approaches found in the next ${this.propagationDays_} days.`);
        this.clearTable_();
      } else {
        this.createTable_();
      }
    } catch (error) {
      errorManagerInstance.error(`Error calculating TOCA/POCA: ${error}`, 'satellite-selection.ts');
      this.clearTable_();
    }
  }

  private createTable_(): void {
    try {
      const tbl = <HTMLTableElement>getEl(`${this.id}-table`);
      tbl.innerHTML = '';

      this.createHeaders_(tbl);
      this.createBody_(tbl);
    } catch (error) {
      errorManagerInstance.warn('Error creating TOCA/POCA table');
    }
  }

  private clearTable_(): void {
    const tbl = <HTMLTableElement>getEl(`${this.id}-table`);
    tbl.innerHTML = '';
  }

  private createHeaders_(tbl: HTMLTableElement) {
    const tr = tbl.insertRow();
    const names = ['Time (TOCA)', 'Distance (km)', 'Rel. Velocity (km/s)', 'Time Until'];

    for (const name of names) {
      const column = tr.insertCell();
      column.appendChild(document.createTextNode(name));
      column.setAttribute('style', 'text-decoration: underline; font-weight: bold;');
    }
  }

  private createBody_(tbl: HTMLTableElement) {
    for (let i = 0; i < this.tocaPocaList_.length; i++) {
      this.createRow_(tbl, i);
    }
  }

  private createRow_(tbl: HTMLTableElement, i: number): HTMLTableRowElement {
    const tr = tbl.insertRow();
    const event = this.tocaPocaList_[i];

    tr.setAttribute('class', `${this.id}-event link`);
    tr.setAttribute('data-row', i.toString());

    // Format time
    const timeStr = dateFormat(event.time, 'isoDateTime', true);

    // Calculate time until event
    const now = ServiceLocator.getTimeManager().selectedDate;
    const timeUntil = event.time.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
    const timeUntilStr = `${hoursUntil}h ${minutesUntil}m`;

    // Create cells
    this.createCell_(tr, timeStr);
    this.createCell_(tr, event.distance.toFixed(3));
    this.createCell_(tr, event.relativeVelocity.toFixed(2));
    this.createCell_(tr, timeUntilStr);

    return tr;
  }

  private createCell_(tr: HTMLTableRowElement, text: string): void {
    const cell = tr.insertCell();
    cell.appendChild(document.createTextNode(text));
  }
}
