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

// Settings Manager Overrides
const settingsOverride = {
  /*
   * This is an example of available settings that can be overridden.
   * Uncomment any options you wish to change.
   *
   * =============================================================================
   * FLAT SYNTAX (Backward Compatible):
   * =============================================================================
   * You can override settings directly using their property names:
   *
   * classificationStr: '',
   * searchLimit: 150,
   * isDisableCss: false,
   * isShowSplashScreen: true,
   * isDrawSun: true,
   * fieldOfView: 0.8,
   *
   * =============================================================================
   * NESTED SYNTAX (Recommended for better organization):
   * =============================================================================
   * You can organize overrides by category for better readability:
   *
   * graphics: {
   *   isDrawSun: true,
   *   isDrawMilkyWay: false,
   *   isDrawAtmosphere: 1,
   *   godraysSamples: 36,
   * },
   *
   * ui: {
   *   isShowSplashScreen: false,
   *   isShowLoadingHints: false,
   *   desktopMaxLabels: 1000,
   * },
   *
   * camera: {
   *   fieldOfView: 0.8,
   *   zoomSpeed: 0.01,
   * },
   *
   * orbital: {
   *   isDrawOrbits: true,
   *   orbitSegments: 128,
   * },
   *
   * data: {
   *   dataSources: {
   *     tle: 'https://your-custom-tle-source.com/api/sats',
   *   },
   * },
   *
   * performance: {
   *   lowPerf: false,
   *   maxLabels: 5000,
   * },
   *
   * color: {
   *   defaultColorScheme: 'ObjectTypeColorScheme',
   * },
   *
   * core: {
   *   classificationStr: '',
   *   searchLimit: 150,
   *   plugins: {
   *     DebugMenuPlugin: { enabled: false },
   *     AboutMenuPlugin: { enabled: false },
   *     Collisions: { enabled: true },
   *     DopsPlugin: { enabled: false },
   *   },
   * },
   *
   * =============================================================================
   * AVAILABLE CATEGORIES:
   * =============================================================================
   * - graphics: Rendering, textures, visual effects
   * - ui: User interface, menus, display settings
   * - camera: Camera movement, FOV, zoom settings
   * - orbital: Orbit calculations, rendering, propagation
   * - data: Data sources, catalogs, servers
   * - performance: Performance limits, throttling
   * - color: Color schemes and object colors
   * - core: Core settings, plugins, filters, global flags
   *
   * You can mix flat and nested syntax - flat overrides take precedence.
   */
};

// Expose these to the console
window.settingsOverride = settingsOverride;
