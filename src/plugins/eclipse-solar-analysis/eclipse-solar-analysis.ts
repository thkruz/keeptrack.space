/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * eclipse-solar-analysis.ts - Eclipse & Solar Analysis Plugin
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

import { SunStatus } from '@app/app/analysis/sat-math';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { BaseObject, DetailedSatellite, Milliseconds } from '@ootk/src/main';
import dayNightPng from '@public/img/icons/day-night.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { EclipseCalculations } from './eclipse-calculations';
import { EclipseEvent, EclipseEventType, EclipsePeriod, EclipsePredictionConfig } from './eclipse-types';

export class EclipseSolarAnalysis extends KeepTrackPlugin {
  readonly id = 'EclipseSolarAnalysis';
  dependencies_: string[] = [SelectSatManager.name];

  isRequireSatelliteSelected = true;
  isIconDisabled = true;
  isIconDisabledOnLoad = true;

  menuMode: MenuMode[] = [MenuMode.ANALYSIS, MenuMode.ALL];

  bottomIconImg = dayNightPng;
  bottomIconLabel = 'Eclipse Analysis';

  sideMenuElementName = 'eclipse-solar-menu';
  sideMenuElementHtml: string = html`
    <div id="eclipse-solar-menu" class="side-menu-parent start-hidden text-select">
      <div id="eclipse-solar-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Eclipse & Solar Analysis</h5>
        </div>

        <!-- Current Status Section -->
        <div class="row">
          <h6>Current Status</h6>
          <div class="eclipse-status-container">
            <div class="input-field col s12">
              <label for="eclipse-status-current" class="active">Eclipse Status</label>
              <input disabled value="Unknown" id="eclipse-status-current" type="text" />
            </div>
            <div class="input-field col s12">
              <label for="eclipse-time-in-shadow" class="active">Time in Current State</label>
              <input disabled value="--:--:--" id="eclipse-time-in-shadow" type="text" />
            </div>
          </div>
        </div>

        <!-- Solar Beta Angle Section -->
        <div class="row">
          <h6>Solar Beta Angle</h6>
          <div class="input-field col s12">
            <label for="beta-angle-current" class="active">Current Beta Angle</label>
            <input disabled value="0.00°" id="beta-angle-current" type="text" />
          </div>
          <div class="input-field col s12">
            <label for="beta-angle-rate" class="active">Beta Angle Rate</label>
            <input disabled value="0.00 °/day" id="beta-angle-rate" type="text" />
          </div>
        </div>

        <!-- Eclipse Prediction Section -->
        <div class="row">
          <h6>Eclipse Predictions</h6>
          <form id="eclipse-prediction-form">
            <div class="input-field col s12">
              <input value="24" id="prediction-duration" type="number" min="1" max="168" />
              <label for="prediction-duration" class="active">Prediction Duration (hours)</label>
            </div>
            <div class="input-field col s12">
              <input value="60" id="time-step" type="number" min="10" max="300" />
              <label for="time-step" class="active">Time Step (seconds)</label>
            </div>
            <div class="center-align">
              <button id="predict-eclipses-btn" class="btn btn-ui waves-effect waves-light" type="button">
                Predict Eclipses &#9658;
              </button>
            </div>
          </form>
        </div>

        <!-- Eclipse Results Section -->
        <div class="row">
          <h6>Eclipse Events</h6>
          <div id="eclipse-events-container">
            <p class="center-align">Click "Predict Eclipses" to see upcoming events</p>
          </div>
        </div>

        <!-- Statistics Section -->
        <div class="row">
          <h6>Eclipse Statistics</h6>
          <div id="eclipse-statistics-container">
            <div class="input-field col s12">
              <label for="eclipse-stats-total" class="active">Total Eclipse Events</label>
              <input disabled value="--" id="eclipse-stats-total" type="text" />
            </div>
            <div class="input-field col s12">
              <label for="eclipse-stats-duration" class="active">Total Eclipse Time</label>
              <input disabled value="--" id="eclipse-stats-duration" type="text" />
            </div>
            <div class="input-field col s12">
              <label for="eclipse-stats-fraction" class="active">Eclipse Fraction</label>
              <input disabled value="--" id="eclipse-stats-fraction" type="text" />
            </div>
            <div class="input-field col s12">
              <label for="eclipse-stats-avg" class="active">Average Eclipse Duration</label>
              <input disabled value="--" id="eclipse-stats-avg" type="text" />
            </div>
          </div>
        </div>

        <!-- Export Section -->
        <div class="row">
          <div class="center-align">
            <button id="export-eclipse-data-btn" class="btn btn-ui waves-effect waves-light" type="button" disabled>
              Export Data (CSV) &#9658;
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  private currentSatellite_: DetailedSatellite | null = null;
  private currentEclipsePeriods_: EclipsePeriod[] = [];
  private updateInterval_: NodeJS.Timeout | null = null;
  private stateStartTime_: number | null = null;
  private currentStatus_: SunStatus = SunStatus.UNKNOWN;

  bottomIconCallback = () => {
    if (this.isMenuButtonActive) {
      // Menu opened - start updates
      this.startRealTimeUpdates_();
    } else {
      // Menu closed - stop updates
      this.stopRealTimeUpdates_();
    }
  };

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      this.registerEventHandlers_();
    });
  }

  addJs(): void {
    super.addJs();

    // Listen for satellite selection changes
    EventBus.getInstance().on(EventBusEvent.selectSatData, (obj: BaseObject) => {
      if (obj?.isSatellite()) {
        this.handleSatelliteSelected_(obj as DetailedSatellite);
      }
    });

    // Listen for time changes
    EventBus.getInstance().on(EventBusEvent.update, () => {
      if (this.isMenuButtonActive && this.currentSatellite_) {
        this.updateRealTimeStatus_();
      }
    });
  }

  /**
   * Register event handlers for UI elements
   */
  private registerEventHandlers_(): void {
    // Predict eclipses button
    getEl('predict-eclipses-btn')?.addEventListener('click', () => {
      this.predictEclipses_();
    });

    // Export data button
    getEl('export-eclipse-data-btn')?.addEventListener('click', () => {
      this.exportEclipseData_();
    });
  }

  /**
   * Handle satellite selection
   */
  private handleSatelliteSelected_(satellite: DetailedSatellite): void {
    this.currentSatellite_ = satellite;
    this.currentEclipsePeriods_ = [];
    this.stateStartTime_ = null;
    this.currentStatus_ = SunStatus.UNKNOWN;

    if (this.isMenuButtonActive) {
      this.updateRealTimeStatus_();
      this.updateBetaAngle_();
      this.clearPredictions_();
    }
  }

  /**
   * Update real-time eclipse status
   */
  private updateRealTimeStatus_(): void {
    if (!this.currentSatellite_) {
      return;
    }

    const currentTime = ServiceLocator.getTimeManager().simulationTimeObj;
    const status = EclipseCalculations.getCurrentEclipseStatus(this.currentSatellite_, currentTime);

    // Update status display
    const statusEl = getEl('eclipse-status-current');

    if (statusEl) {
      let statusText = 'Unknown';
      let statusColor = '#888';

      switch (status) {
        case SunStatus.SUN:
          statusText = 'Sunlit';
          statusColor = '#ffd700';
          break;
        case SunStatus.PENUMBRAL:
          statusText = 'Penumbral Shadow';
          break;
        case SunStatus.UMBRAL:
          statusText = 'Umbral Shadow (Full Eclipse)';
          statusColor = '#444';
          break;
        default:
      }

      (<HTMLInputElement>statusEl).value = statusText;
      statusEl.style.color = statusColor;
      statusEl.style.fontWeight = 'bold';
    }

    // Track state changes to calculate time in current state
    if (status !== this.currentStatus_) {
      this.stateStartTime_ = currentTime.getTime();
      this.currentStatus_ = status;
    }

    // Update time in current state
    if (this.stateStartTime_) {
      const timeInState = currentTime.getTime() - this.stateStartTime_;
      const hours = Math.floor(timeInState / 3600000);
      const minutes = Math.floor((timeInState % 3600000) / 60000);
      const seconds = Math.floor((timeInState % 60000) / 1000);

      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const timeEl = getEl('eclipse-time-in-shadow');

      if (timeEl) {
        (<HTMLInputElement>timeEl).value = timeString;
      }
    }
  }

  /**
   * Update beta angle display
   */
  private updateBetaAngle_(): void {
    if (!this.currentSatellite_) {
      return;
    }

    const currentTime = ServiceLocator.getTimeManager().simulationTimeObj;
    const betaAngle = EclipseCalculations.calculateSolarBetaAngle(this.currentSatellite_, currentTime);

    // Update beta angle display
    const betaEl = getEl('beta-angle-current');

    if (betaEl) {
      (<HTMLInputElement>betaEl).value = `${betaAngle.toFixed(2)}°`;
    }

    // Calculate beta angle rate (change over 1 day)
    const nextDayTime = new Date(currentTime.getTime() + 24 * 3600 * 1000);
    const nextDayBeta = EclipseCalculations.calculateSolarBetaAngle(this.currentSatellite_, nextDayTime);
    const betaRate = nextDayBeta - betaAngle;

    const rateEl = getEl('beta-angle-rate');

    if (rateEl) {
      (<HTMLInputElement>rateEl).value = `${betaRate.toFixed(2)} °/day`;
    }
  }

  /**
   * Predict eclipses based on user settings
   */
  private predictEclipses_(): void {
    if (!this.currentSatellite_) {
      return;
    }

    // Get prediction parameters from form
    const durationEl = <HTMLInputElement>getEl('prediction-duration');
    const timeStepEl = <HTMLInputElement>getEl('time-step');

    const config: EclipsePredictionConfig = {
      predictionDurationHours: parseInt(durationEl?.value || '24', 10),
      timeStepSeconds: parseInt(timeStepEl?.value || '60', 10),
      numberOfOrbits: 0,
      includePenumbral: true,
    };

    const startTime = ServiceLocator.getTimeManager().simulationTimeObj;

    // Calculate eclipses
    const { events, periods } = EclipseCalculations.predictEclipseTransitions(this.currentSatellite_, startTime, config);

    this.currentEclipsePeriods_ = periods;

    // Display results
    this.displayEclipseEvents_(events);
    this.displayEclipseStatistics_(periods, config.predictionDurationHours * 3600 * 1000 as Milliseconds);

    // Enable export button
    const exportBtn = getEl('export-eclipse-data-btn');

    if (exportBtn) {
      (<HTMLButtonElement>exportBtn).disabled = false;
    }
  }

  /**
   * Display eclipse events in the UI
   */
  private displayEclipseEvents_(events: EclipseEvent[]): void {
    const container = getEl('eclipse-events-container');

    if (!container) {
      return;
    }

    if (events.length === 0) {
      container.innerHTML = '<p class="center-align">No eclipse events found in the selected time range</p>';

      return;
    }

    // Create table of events (show first 20)
    let html = '<table class="centered striped"><thead><tr><th>Time</th><th>Event</th><th>Orbit</th></tr></thead><tbody>';

    const displayEvents = events.slice(0, 20);

    for (const event of displayEvents) {
      const timeStr = event.time.toISOString().replace('T', ' ').substring(0, 19);
      let eventStr = '';

      switch (event.type) {
        case EclipseEventType.ENTER_PENUMBRA:
          eventStr = '→ Enter Penumbra';
          break;
        case EclipseEventType.ENTER_UMBRA:
          eventStr = '→ Enter Umbra';
          break;
        case EclipseEventType.EXIT_UMBRA:
          eventStr = '← Exit Umbra';
          break;
        case EclipseEventType.EXIT_PENUMBRA:
          eventStr = '← Exit Penumbra';
          break;
        default:
          eventStr = 'Unknown Event';
      }

      html += `<tr><td>${timeStr}</td><td>${eventStr}</td><td>${event.orbitNumber}</td></tr>`;
    }

    html += '</tbody></table>';

    if (events.length > 20) {
      html += `<p class="center-align"><em>Showing first 20 of ${events.length} events</em></p>`;
    }

    container.innerHTML = html;
  }

  /**
   * Display eclipse statistics
   */
  private displayEclipseStatistics_(periods: EclipsePeriod[], totalDuration: Milliseconds): void {
    const stats = EclipseCalculations.calculateEclipseStatistics(periods, totalDuration);

    // Update statistics fields
    const totalEl = getEl('eclipse-stats-total');

    if (totalEl) {
      (<HTMLInputElement>totalEl).value = stats.totalEclipses.toString();
    }

    const durationEl = getEl('eclipse-stats-duration');

    if (durationEl) {
      const hours = Math.floor(stats.totalEclipseTime / 3600000);
      const minutes = Math.floor((stats.totalEclipseTime % 3600000) / 60000);

      (<HTMLInputElement>durationEl).value = `${hours}h ${minutes}m`;
    }

    const fractionEl = getEl('eclipse-stats-fraction');

    if (fractionEl) {
      (<HTMLInputElement>fractionEl).value = `${(stats.eclipseFraction * 100).toFixed(1)}%`;
    }

    const avgEl = getEl('eclipse-stats-avg');

    if (avgEl) {
      const avgMinutes = Math.floor(stats.averageEclipseDuration / 60000);
      const avgSeconds = Math.floor((stats.averageEclipseDuration % 60000) / 1000);

      (<HTMLInputElement>avgEl).value = `${avgMinutes}m ${avgSeconds}s`;
    }
  }

  /**
   * Clear prediction results
   */
  private clearPredictions_(): void {
    const container = getEl('eclipse-events-container');

    if (container) {
      container.innerHTML = '<p class="center-align">Click "Predict Eclipses" to see upcoming events</p>';
    }

    const exportBtn = getEl('export-eclipse-data-btn');

    if (exportBtn) {
      (<HTMLButtonElement>exportBtn).disabled = true;
    }

    // Clear statistics
    (<HTMLInputElement>getEl('eclipse-stats-total')).value = '--';
    (<HTMLInputElement>getEl('eclipse-stats-duration')).value = '--';
    (<HTMLInputElement>getEl('eclipse-stats-fraction')).value = '--';
    (<HTMLInputElement>getEl('eclipse-stats-avg')).value = '--';

    this.currentEclipsePeriods_ = [];
  }

  /**
   * Export eclipse data to CSV
   */
  private exportEclipseData_(): void {
    if (this.currentEclipsePeriods_.length === 0 || !this.currentSatellite_) {
      return;
    }

    // Create CSV content
    let csv = 'Eclipse Period,Start Time,End Time,Duration (minutes),Type,Orbit Number\n';

    this.currentEclipsePeriods_.forEach((period, index) => {
      const startStr = period.startTime.toISOString();
      const endStr = period.endTime.toISOString();
      const durationMin = (period.duration / 60000).toFixed(2);
      const type = period.isUmbral ? 'Umbral' : 'Penumbral';

      csv += `${index + 1},${startStr},${endStr},${durationMin},${type},${period.orbitNumber}\n`;
    });

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `eclipse_data_${this.currentSatellite_.sccNum}_${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Start real-time updates
   */
  private startRealTimeUpdates_(): void {
    this.stopRealTimeUpdates_(); // Clear any existing interval

    this.updateRealTimeStatus_();
    this.updateBetaAngle_();

    // Update every second
    this.updateInterval_ = setInterval(() => {
      this.updateRealTimeStatus_();
    }, 1000);

    // Update beta angle every 10 seconds
    setInterval(() => {
      this.updateBetaAngle_();
    }, 10000);
  }

  /**
   * Stop real-time updates
   */
  private stopRealTimeUpdates_(): void {
    if (this.updateInterval_) {
      clearInterval(this.updateInterval_);
      this.updateInterval_ = null;
    }
  }
}
