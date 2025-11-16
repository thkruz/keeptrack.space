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
    tle: 'https://api.keeptrack.space/v3/sats',
    /** url for an external TLE source */
    externalTLEs: '',
    /**
     * A boolean flag indicating whether only external TLEs (Two-Line Elements) should be used.
     * When set to `true`, the system will exclusively utilize external TLE data.
     * When set to `false`, the system may use internal or other sources of TLE data.
     */
    externalTLEsOnly: false,
    tleDebris: 'https://app.keeptrack.space/tle/TLEdebris.json',
    vimpel: 'https://api.keeptrack.space/v3/r2/vimpel.json',
    /** This determines if tle source is loaded to supplement externalTLEs  */
    isSupplementExternal: false,
  };

  // Servers
  telemetryServer = 'https://telemetry.keeptrack.space';
  userServer = 'https://user.keeptrack.space';

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
