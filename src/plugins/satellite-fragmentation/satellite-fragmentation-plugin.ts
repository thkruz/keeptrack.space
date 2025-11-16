import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { EventBus } from '@app/engine/events/event-bus';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { html } from '@app/engine/utils/development/formatter';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SoundNames } from '@app/engine/sounds/sound-names';
import satelliteFragmentationPng from '@public/img/icons/collisions.png';
import './satellite-fragmentation.css';

/**
 * Breakup Event Database Entry
 */
interface BreakupEvent {
  /** Parent object name */
  name: string;
  /** NORAD catalog ID of parent object */
  noradId: string;
  /** COSPAR ID of parent object */
  cosparId: string;
  /** Launch date */
  launchDate: string;
  /** Breakup date */
  breakupDate: string;
  /** Type of event (ASAT, Collision, Explosion, etc.) */
  eventType: string;
  /** Description of the event */
  description: string;
  /** Approximate number of tracked debris pieces */
  trackedDebrisCount: number;
  /** Estimated total debris count */
  estimatedDebrisCount: number;
}

/**
 * Fragment Statistics
 */
interface FragmentStats {
  /** Total number of debris fragments found in catalog */
  count: number;
  /** Average altitude (km) */
  avgAltitude: number;
  /** Minimum altitude (km) */
  minAltitude: number;
  /** Maximum altitude (km) */
  maxAltitude: number;
  /** Average eccentricity */
  avgEccentricity: number;
  /** Average inclination (degrees) */
  avgInclination: number;
  /** Dispersion range (km) */
  dispersionRange: number;
}

/**
 * SatelliteFragmentationPlugin
 *
 * This plugin allows users to:
 * - Track debris from known breakups
 * - Filter by parent object
 * - Analyze fragment dispersion
 * - View breakup event timeline
 */
export class SatelliteFragmentationPlugin extends KeepTrackPlugin {
  readonly id = 'SatelliteFragmentationPlugin';
  dependencies_ = [];

  bottomIconLabel = 'Satellite Fragmentation';
  bottomIconImg = satelliteFragmentationPng;
  bottomIconCallback: () => void = () => {
    if (this.isMenuButtonActive) {
      this.closeSideMenu();

      return;
    }
    this.openSideMenu();
    this.updateFragmentationData_();
  };

  sideMenuElementName: string = 'satellite-fragmentation-menu';
  sideMenuElementHtml: string = html`
    <div id="satellite-fragmentation-menu" class="side-menu-parent start-hidden text-select">
      <div id="satellite-fragmentation-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Satellite Fragmentation Database</h5>

          <!-- Parent Object Filter -->
          <div class="input-field col s12">
            <select id="fragmentation-parent-select">
              <option value="">-- Select Parent Object --</option>
            </select>
            <label>Parent Object</label>
          </div>

          <!-- Breakup Event Info -->
          <div id="fragmentation-event-info" class="start-hidden">
            <div class="divider"></div>
            <h6 class="center-align" style="margin-top: 15px;">Event Information</h6>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Parent Object:</div>
              <div class="fragmentation-info-value" id="frag-parent-name">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">NORAD ID:</div>
              <div class="fragmentation-info-value" id="frag-norad-id">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">COSPAR ID:</div>
              <div class="fragmentation-info-value" id="frag-cospar-id">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Event Type:</div>
              <div class="fragmentation-info-value" id="frag-event-type">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Launch Date:</div>
              <div class="fragmentation-info-value" id="frag-launch-date">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Breakup Date:</div>
              <div class="fragmentation-info-value" id="frag-breakup-date">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Time to Breakup:</div>
              <div class="fragmentation-info-value" id="frag-time-to-breakup">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Description:</div>
            </div>
            <div style="padding: 5px 10px; font-size: 0.9em; line-height: 1.4;">
              <span id="frag-description">-</span>
            </div>

            <div class="divider"></div>
            <h6 class="center-align" style="margin-top: 15px;">Debris Statistics</h6>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Tracked Debris:</div>
              <div class="fragmentation-info-value" id="frag-tracked-count">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Estimated Total:</div>
              <div class="fragmentation-info-value" id="frag-estimated-count">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Found in Catalog:</div>
              <div class="fragmentation-info-value" id="frag-catalog-count">-</div>
            </div>

            <div class="divider"></div>
            <h6 class="center-align" style="margin-top: 15px;">Fragment Dispersion Analysis</h6>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Altitude Range:</div>
              <div class="fragmentation-info-value" id="frag-altitude-range">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Average Altitude:</div>
              <div class="fragmentation-info-value" id="frag-avg-altitude">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Average Eccentricity:</div>
              <div class="fragmentation-info-value" id="frag-avg-eccentricity">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Average Inclination:</div>
              <div class="fragmentation-info-value" id="frag-avg-inclination">-</div>
            </div>

            <div class="fragmentation-info-row">
              <div class="fragmentation-info-key">Dispersion Range:</div>
              <div class="fragmentation-info-value" id="frag-dispersion-range">-</div>
            </div>

            <div class="center-align" style="margin-top: 20px;">
              <button id="frag-show-debris-btn" class="btn btn-ui waves-effect waves-light">
                Show Debris Field &#9658;
              </button>
            </div>

            <div class="center-align" style="margin-top: 10px;">
              <button id="frag-select-parent-btn" class="btn btn-ui waves-effect waves-light">
                Select Parent Object &#9658;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  helpTitle = 'Satellite Fragmentation Database Menu';
  helpBody = html`
    The Satellite Fragmentation Database allows you to explore known satellite breakup events and analyze the resulting debris fields.
    <br><br>
    <b>Features:</b>
    <ul>
      <li>Select from known breakup events</li>
      <li>View event timeline (launch to breakup)</li>
      <li>Analyze debris dispersion patterns</li>
      <li>Display debris field on the globe</li>
      <li>View orbital parameter statistics</li>
    </ul>
    <br>
    <b>Usage:</b>
    <ol>
      <li>Select a parent object from the dropdown</li>
      <li>Review the event information and timeline</li>
      <li>Examine the fragment dispersion analysis</li>
      <li>Click "Show Debris Field" to highlight all debris</li>
      <li>Click "Select Parent Object" to focus on the parent satellite</li>
    </ol>
  `;

  /**
   * Hardcoded database of known satellite breakup events
   */
  private breakupDatabase_: BreakupEvent[] = [
    {
      name: 'FENGYUN 1C DEB',
      noradId: '25730',
      cosparId: '1999-025A',
      launchDate: '1999-05-10',
      breakupDate: '2007-01-11',
      eventType: 'ASAT Test',
      description: 'Chinese anti-satellite missile test. The Fengyun-1C weather satellite was destroyed by a Chinese SC-19 ASAT missile, creating the largest orbital debris field in history at the time.',
      trackedDebrisCount: 3500,
      estimatedDebrisCount: 150000,
    },
    {
      name: 'COSMOS 2251 DEB',
      noradId: '22675',
      cosparId: '1993-036A',
      breakupDate: '2009-02-10',
      launchDate: '1993-06-16',
      eventType: 'Collision',
      description: 'Collision between inactive Russian Cosmos 2251 and active U.S. Iridium 33 communication satellites. First accidental hypervelocity collision between two intact satellites.',
      trackedDebrisCount: 1700,
      estimatedDebrisCount: 2000,
    },
    {
      name: 'IRIDIUM 33 DEB',
      noradId: '24946',
      cosparId: '1997-051C',
      launchDate: '1997-09-14',
      breakupDate: '2009-02-10',
      eventType: 'Collision',
      description: 'U.S. Iridium 33 communications satellite destroyed in collision with Cosmos 2251. The impact occurred at approximately 11.7 km/s relative velocity.',
      trackedDebrisCount: 600,
      estimatedDebrisCount: 1000,
    },
    {
      name: 'COSMOS 1408 DEB',
      noradId: '13552',
      cosparId: '1982-092A',
      launchDate: '1982-09-16',
      breakupDate: '2021-11-15',
      eventType: 'ASAT Test',
      description: 'Russian anti-satellite weapon test. Cosmos 1408 was destroyed by a Russian A-235 PL-19 Nudol missile, creating over 1,500 pieces of trackable debris.',
      trackedDebrisCount: 1500,
      estimatedDebrisCount: 10000,
    },
    {
      name: 'THOR BURNER 2 DEB',
      noradId: '11672',
      cosparId: '1980-005B',
      launchDate: '1980-01-30',
      breakupDate: '1980-01-30',
      eventType: 'Explosion',
      description: 'Upper stage explosion shortly after launch. One of many historical rocket body explosions contributing to the debris population.',
      trackedDebrisCount: 300,
      estimatedDebrisCount: 500,
    },
    {
      name: 'CZ-4B R/B DEB',
      noradId: '40294',
      cosparId: '2015-003B',
      launchDate: '2015-01-29',
      breakupDate: '2021-03-18',
      eventType: 'Explosion',
      description: 'Chinese Long March 4B rocket body explosion in LEO. The breakup created hundreds of debris pieces in sun-synchronous orbit.',
      trackedDebrisCount: 500,
      estimatedDebrisCount: 1000,
    },
  ];

  /** Currently selected breakup event */
  private selectedEvent_: BreakupEvent | null = null;

  dragOptions = {
    isDraggable: true,
  };

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  private uiManagerFinal_(): void {
    // Populate parent object dropdown
    const selectElement = getEl('fragmentation-parent-select') as HTMLSelectElement;

    if (!selectElement) {
      return;
    }

    this.breakupDatabase_.forEach((event) => {
      const option = document.createElement('option');

      option.value = event.noradId;
      option.textContent = `${event.name} (${event.breakupDate})`;
      selectElement.appendChild(option);
    });

    // Add event listener for parent object selection
    selectElement.addEventListener('change', () => {
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      this.onParentObjectSelected_(selectElement.value);
    });

    // Add event listener for "Show Debris Field" button
    getEl('frag-show-debris-btn')?.addEventListener('click', () => {
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      this.showDebrisField_();
    });

    // Add event listener for "Select Parent Object" button
    getEl('frag-select-parent-btn')?.addEventListener('click', () => {
      ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
      this.selectParentObject_();
    });
  }

  /**
   * Called when user selects a parent object from dropdown
   */
  private onParentObjectSelected_(noradId: string): void {
    if (!noradId) {
      getEl('fragmentation-event-info')?.classList.add('start-hidden');
      this.selectedEvent_ = null;

      return;
    }

    // Find the breakup event
    const event = this.breakupDatabase_.find((e) => e.noradId === noradId);

    if (!event) {
      return;
    }

    this.selectedEvent_ = event;

    // Update event information
    this.updateEventInfo_(event);

    // Calculate fragment statistics
    const stats = this.calculateFragmentStats_(event);

    this.updateFragmentStats_(event, stats);

    // Show the info panel
    getEl('fragmentation-event-info')?.classList.remove('start-hidden');
  }

  /**
   * Update the event information display
   */
  private updateEventInfo_(event: BreakupEvent): void {
    getEl('frag-parent-name')!.textContent = event.name;
    getEl('frag-norad-id')!.textContent = event.noradId;
    getEl('frag-cospar-id')!.textContent = event.cosparId;
    getEl('frag-event-type')!.textContent = event.eventType;
    getEl('frag-launch-date')!.textContent = event.launchDate;
    getEl('frag-breakup-date')!.textContent = event.breakupDate;
    getEl('frag-description')!.textContent = event.description;

    // Calculate time between launch and breakup
    const launchDate = new Date(event.launchDate);
    const breakupDate = new Date(event.breakupDate);
    const diffTime = Math.abs(breakupDate.getTime() - launchDate.getTime());
    const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);

    getEl('frag-time-to-breakup')!.textContent = `${diffYears} years`;
  }

  /**
   * Calculate statistics for debris fragments
   */
  private calculateFragmentStats_(event: BreakupEvent): FragmentStats {
    const catalogManager = ServiceLocator.getCatalogManager();
    const satellites = catalogManager.getSats();

    // Find all debris fragments related to this parent object
    // Debris typically have the same COSPAR ID with letters (e.g., 1999-025ABC)
    const debrisFragments = satellites.filter((sat) => {
      const satName = sat.name?.toUpperCase() || '';
      const objectName = sat.sccNum || '';

      // Match debris by name pattern or COSPAR ID
      return (
        satName.includes(event.name.toUpperCase()) ||
        satName.includes('DEB') && satName.includes(event.cosparId.split('-')[0]) ||
        objectName.startsWith(event.cosparId.slice(0, 8)) && objectName !== event.cosparId
      );
    });

    if (debrisFragments.length === 0) {
      return {
        count: 0,
        avgAltitude: 0,
        minAltitude: 0,
        maxAltitude: 0,
        avgEccentricity: 0,
        avgInclination: 0,
        dispersionRange: 0,
      };
    }

    // Calculate statistics
    let totalAltitude = 0;
    let totalEccentricity = 0;
    let totalInclination = 0;
    let minAlt = Number.POSITIVE_INFINITY;
    let maxAlt = Number.NEGATIVE_INFINITY;

    debrisFragments.forEach((debris) => {
      // Calculate altitude from semi-major axis (convert km to match)
      const altitude = (debris.apogee + debris.perigee) / 2;

      totalAltitude += altitude;
      totalEccentricity += debris.eccentricity;
      totalInclination += debris.inclination;

      if (altitude < minAlt) {
        minAlt = altitude;
      }
      if (altitude > maxAlt) {
        maxAlt = altitude;
      }
    });

    const count = debrisFragments.length;

    return {
      count,
      avgAltitude: totalAltitude / count,
      minAltitude: minAlt,
      maxAltitude: maxAlt,
      avgEccentricity: totalEccentricity / count,
      avgInclination: totalInclination / count,
      dispersionRange: maxAlt - minAlt,
    };
  }

  /**
   * Update the fragment statistics display
   */
  private updateFragmentStats_(event: BreakupEvent, stats: FragmentStats): void {
    getEl('frag-tracked-count')!.textContent = event.trackedDebrisCount.toLocaleString();
    getEl('frag-estimated-count')!.textContent = event.estimatedDebrisCount.toLocaleString();
    getEl('frag-catalog-count')!.textContent = stats.count.toLocaleString();

    if (stats.count > 0) {
      getEl('frag-altitude-range')!.textContent = `${stats.minAltitude.toFixed(0)} - ${stats.maxAltitude.toFixed(0)} km`;
      getEl('frag-avg-altitude')!.textContent = `${stats.avgAltitude.toFixed(1)} km`;
      getEl('frag-avg-eccentricity')!.textContent = stats.avgEccentricity.toFixed(4);
      getEl('frag-avg-inclination')!.textContent = `${stats.avgInclination.toFixed(2)}°`;
      getEl('frag-dispersion-range')!.textContent = `${stats.dispersionRange.toFixed(1)} km`;
    } else {
      getEl('frag-altitude-range')!.textContent = 'No data in catalog';
      getEl('frag-avg-altitude')!.textContent = 'No data in catalog';
      getEl('frag-avg-eccentricity')!.textContent = 'No data in catalog';
      getEl('frag-avg-inclination')!.textContent = 'No data in catalog';
      getEl('frag-dispersion-range')!.textContent = 'No data in catalog';
    }
  }

  /**
   * Show debris field on the globe
   */
  private showDebrisField_(): void {
    if (!this.selectedEvent_) {
      return;
    }

    const catalogManager = ServiceLocator.getCatalogManager();
    const satellites = catalogManager.getSats();

    // Find all debris fragments
    const debrisFragments = satellites.filter((sat) => {
      const satName = sat.name?.toUpperCase() || '';
      const objectName = sat.sccNum || '';

      return (
        satName.includes(this.selectedEvent_.name.toUpperCase()) ||
        satName.includes('DEB') && satName.includes(this.selectedEvent_.cosparId.split('-')[0]) ||
        objectName.startsWith(this.selectedEvent_.cosparId.slice(0, 8)) && objectName !== this.selectedEvent_.cosparId
      );
    });

    if (debrisFragments.length === 0) {
      ServiceLocator.getUiManager()?.toast('No debris found in catalog', 'caution');

      return;
    }

    // Create a search string to highlight debris
    const debrisIds = debrisFragments.map((sat) => sat.id);

    ServiceLocator.getDotsManager()?.clearSelectSat();
    debrisFragments.forEach((debris) => {
      ServiceLocator.getDotsManager()?.setSelectSat(debris.id);
    });

    ServiceLocator.getUiManager()?.toast(`Displaying ${debrisFragments.length} debris fragments`, 'standby');
  }

  /**
   * Select the parent object
   */
  private selectParentObject_(): void {
    if (!this.selectedEvent_) {
      return;
    }

    const catalogManager = ServiceLocator.getCatalogManager();
    const satellites = catalogManager.getSats();

    // Find parent object by NORAD ID
    const parentSat = satellites.find((sat) => sat.sccNum === this.selectedEvent_.noradId);

    if (!parentSat) {
      ServiceLocator.getUiManager()?.toast('Parent object not found in catalog', 'caution');

      return;
    }

    // Use SelectSatManager to select the parent
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

    if (selectSatManager) {
      selectSatManager.selectSat(parentSat.id);
      ServiceLocator.getUiManager()?.toast(`Selected ${this.selectedEvent_.name}`, 'standby');
    }
  }

  /**
   * Update fragmentation data when menu is opened
   */
  private updateFragmentationData_(): void {
    // Reset the dropdown to default
    const selectElement = getEl('fragmentation-parent-select') as HTMLSelectElement;

    if (selectElement) {
      selectElement.selectedIndex = 0;
    }

    // Hide the info panel
    getEl('fragmentation-event-info')?.classList.add('start-hidden');
    this.selectedEvent_ = null;
  }
}
