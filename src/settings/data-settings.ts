/**
 * /////////////////////////////////////////////////////////////////////////////
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

/**
 * Data sources, catalogs, and external server settings
 */
export class DataSettings {
  // Data Sources
  dataSources = {
    /**
     * This is where the TLEs are loaded from
     *
     * It was previously: ${settingsManager.installDirectory}tle/TLE2.json`
     *
     * It can be loaded from a local file or a remote source
     */
    tle: 'https://api.keeptrack.space/v4/sats/brief',
    /** url for an external TLE source */
    externalTLEs: '',
    /**
     * A boolean flag indicating whether only external TLEs (Two-Line Elements) should be used.
     * When set to `true`, the system will exclusively utilize external TLE data.
     * When set to `false`, the system may use internal or other sources of TLE data.
     */
    externalTLEsOnly: false,
    tleDebris: 'https://app.keeptrack.space/tle/TLEdebris.json',
    vimpel: 'https://api.keeptrack.space/v4/r2/vimpel.json',
    stars: 'https://r2.keeptrack.space/data/star-catalog.json',
    constellations: 'https://r2.keeptrack.space/data/constellations.json',
    covariance: 'https://r2.keeptrack.space/data/covariance.json',
    orgs: 'https://r2.keeptrack.space/data/orgs.json',
    /**
     * URL of the McCants-format visual magnitude database (used by the VmagDatabasePlugin
     * to back-fill `sat.vmag` for satellites missing it from the primary TLE source).
     *
     * Empty by default — set this to enable the database. The file may be hosted on R2,
     * served from `public/data/`, or anywhere reachable via fetch.
     */
    vmagDatabase: '',
    satDetail: 'https://api.keeptrack.space/v4/sat/',
    /** This determines if tle source is loaded to supplement externalTLEs  */
    isSupplementExternal: false,
  };

  // Servers
  apiServer = 'https://api.keeptrack.space';
  telemetryServer = 'https://telemetry.keeptrack.space/api/telemetry';
  userServer = 'https://user.keeptrack.space';

  /**
   * API key for authenticating requests to api.keeptrack.space.
   *
   * Can be set via the `apiKey` query parameter or programmatically.
   */
  apiKey = process.env.KEEPTRACK_API_KEY ?? '';

  // Database
  db: unknown = null;

  // Catalog Settings
  /**
   * Disables the JSON Catalog (only applies to offline mode)
   *
   * /tle/extra.json
   */
  isDisableExtraCatalog = true;
  /**
   * Flag for using the debris catalog instead of the full catalog
   *
   * /tle/TLEdebris.json
   */
  isUseDebrisCatalog = false;
  /**
   * Enables the old extended catalog including JSC Vimpel data
   * @deprecated Use isEnableJscCatalog instead
   */
  isEnableExtendedCatalog = false;
  /*
   * Enables the new JSC Vimpel catalog
   */
  isEnableJscCatalog = true;

  // Site Data
  /**
   * Disables the loading of control site data
   */
  isDisableControlSites = true;
  /**
   * Disables the loading of launch site data
   */
  isDisableLaunchSites = false;
  /**
   * Disables the loading of sensor data
   */
  isDisableSensors = false;
}

export const defaultDataSettings = new DataSettings();
