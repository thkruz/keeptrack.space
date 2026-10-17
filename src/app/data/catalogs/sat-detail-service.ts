/**
 * Lazy-loading service for satellite detail data.
 *
 * On satellite selection, fetches full detail from the API and merges
 * it onto the existing Satellite object so UI plugins can display
 * mission, purpose, manufacturer, masses, dimensions, etc.
 */
import { Satellite } from '@ootk/src/main';
import { EventBus } from '../../../engine/events/event-bus';
import { EventBusEvent } from '../../../engine/events/event-bus-events';
import { errorManagerInstance } from '../../../engine/utils/errorManager';
import { apiFetch } from '../api-fetch';

/**
 * Maps API response keys (UPPER_SNAKE_CASE) to Satellite property names (camelCase).
 */
const API_TO_SAT_FIELD: Record<string, string> = {
  MISSION: 'mission',
  PURPOSE: 'purpose',
  MANUFACTURER: 'manufacturer',
  OWNER: 'owner',
  COUNTRY: 'country',
  LAUNCH_MASS: 'launchMass',
  DRY_MASS: 'dryMass',
  LIFETIME: 'lifetime',
  POWER: 'power',
  BUS: 'bus',
  PAYLOAD: 'payload',
  EQUIPMENT: 'equipment',
  MOTOR: 'motor',
  LENGTH: 'length',
  DIAMETER: 'diameter',
  SPAN: 'span',
  SHAPE: 'shape',
  LAUNCH_DATE: 'launchDate',
  LAUNCH_SITE: 'launchSite',
  LAUNCH_VEHICLE: 'launchVehicle',
  LAUNCH_PAD: 'launchPad',
  CONFIGURATION: 'configuration',
  ALT_NAME: 'altName',
};

class SatDetailDataService {
  private readonly fetchedSccs_ = new Set<string>();
  private readonly inflight_ = new Set<string>();

  /**
   * Returns true if this satellite already has detail data populated.
   */
  hasDetail(sat: Satellite): boolean {
    return (sat.mission !== undefined && sat.mission !== '') || this.fetchedSccs_.has(sat.sccNum);
  }

  /**
   * Fetch detail data for a satellite and merge onto the object.
   * Safe to call multiple times — skips if already fetched or in-flight.
   */
  async fetchSatDetail(sat: Satellite): Promise<void> {
    // Analyst objects (maneuver clones, created satellites) have no catalog record
    if (typeof sat.derivedFromSccNum === 'string' || this.hasDetail(sat) || this.inflight_.has(sat.sccNum)) {
      return;
    }

    this.inflight_.add(sat.sccNum);

    try {
      const settingsManager = window.settingsManager;
      const url = `${settingsManager.dataSources.satDetail}${sat.sccNum}`;
      const response = await apiFetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let data = await response.json();

      // Handle wrapped responses (array or { data: ... })
      if (Array.isArray(data)) {
        data = data[0];
      } else if (data?.data && typeof data.data === 'object') {
        data = data.data;
      }

      if (!data || typeof data !== 'object') {
        errorManagerInstance.debug(`Unexpected response format for SCC ${sat.sccNum}`);

        return;
      }

      // Merge detail fields onto the satellite object
      let merged = 0;
      const satRecord = sat as unknown as Record<string, unknown>;

      for (const [apiKey, satField] of Object.entries(API_TO_SAT_FIELD)) {
        const value = data[apiKey];

        if (value !== undefined && value !== null && value !== '') {
          satRecord[satField] = value;
          merged++;
        }
      }

      errorManagerInstance.debug(`Merged ${merged} detail fields for SCC ${sat.sccNum}`);

      this.fetchedSccs_.add(sat.sccNum);

      // Re-emit so UI plugins refresh with new data
      EventBus.getInstance().emit(EventBusEvent.selectSatData, sat, sat.id);
    } catch (e) {
      errorManagerInstance.debug(`Failed to fetch detail for SCC ${sat.sccNum}: ${e}`);
    } finally {
      this.inflight_.delete(sat.sccNum);
    }
  }
}

export const satDetailService = new SatDetailDataService();
