/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * @Copyright (C) 2026 Kruczek Labs LLC
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

/*
 * Standalone Solar System build.
 *
 * A different product for a different audience than the main app: no satellite catalog, no
 * sensors, no conjunctions. What ships is the solar system itself - the Sun, the planets and
 * their rings and atmospheres, every major moon, the dwarf planets, the big four asteroids,
 * the procedural belt, and the five interstellar probes - plus the time controls needed to
 * watch any of it move.
 *
 * The catalog is the single biggest cost in this app (~25k objects plus three crunchers), and
 * nothing here reads it, so `noCatalogOnLoad` is what makes this boot in a couple of seconds
 * instead of twelve. Stars still load: keeptrack.ts routes an empty boot through
 * CatalogLoader.parse({}), which still adds stars, sensors and planets.
 */
const settingsOverride = {
  /*
   * isStrictPluginList makes this map an exhaustive allowlist: every plugin not listed here,
   * including ones added to the manifest later, is force-disabled. That is the point - this
   * build should never grow a conjunction screener because someone added one upstream.
   * Always-enabled infra (SelectSatManager, Telemetry) is exempt and stays on.
   */
  plugins: {
    // The reason this build exists.
    PlanetsMenuPlugin: { enabled: true },
    // Voyager 1/2, Pioneer 10/11, New Horizons, plus the OEM missions (Lucy, Parker, JWST...).
    DeepSpaceMissionsPlugin: { enabled: true },

    /*
     * Sky context. Without a starfield the space past the Milky Way band is dead black and
     * a planet at 30 AU reads as a bug rather than a long way away.
     */
    StarsPlugin: { enabled: true },
    StarManagementPlugin: { enabled: true },
    Astronomy: { enabled: true },

    // Earth is still the body you start on, so it should look like itself.
    EarthAtmosphere: { enabled: true },
    CloudsToggle: { enabled: true },
    NightToggle: { enabled: true },
    PoliticalMapToggle: { enabled: true },
    GraticuleToggle: { enabled: true },
    EarthPresetsPlugin: { enabled: true },

    /*
     * Time controls are not optional here. Every body in this build is a function of time -
     * with the clock stopped it is a still life.
     *
     * TimeSlider is deliberately absent: it hard-depends on ScenarioManagementPlugin, and
     * under the strict allowlist that dependency is force-disabled, so it fails its own
     * init() with "adjust the load order". Scenarios mean nothing in a build with no
     * catalog, so the fix is to drop the slider rather than drag scenario management in -
     * the VCR transport and the date picker already cover scrubbing and jumping.
     */
    DateTimeManager: { enabled: true },
    VcrPlugin: { enabled: true },
    TimeMachine: { enabled: true },

    // Looking around.
    EarthCenteredView: { enabled: true },
    FpsView: { enabled: true },
    MultiView: { enabled: true },

    // Presentation and settings.
    GraphicsMenuPlugin: { enabled: true },
    GraphicsSettingsPlugin: { enabled: true },
    SettingsMenuPlugin: { enabled: true },
    ColorMenu: { enabled: true },
    Screenshot: { enabled: true },
    ScreenRecorder: { enabled: true },
    ShareMenuPlugin: { enabled: true },
    VideoDirectorPlugin: { enabled: true },

    // Shell.
    TopMenu: { enabled: true },
    GithubLinkPlugin: { enabled: true },
    KeyboardShortcutsPlugin: { enabled: true },
    CommandPalettePlugin: { enabled: true },
    TooltipsPlugin: { enabled: true },
    SoundToggle: { enabled: true },
    PluginManagerPlugin: { enabled: true },

    /*
     * OnboardingPlugin is deliberately absent. Its opening line is "Track thousands of
     * objects in orbit, live" and its tour walks through search, sensors and satellite
     * selection - none of which exist here. A tour whose steps point at disabled plugins is
     * worse than no tour. This build wants its own, and until it has one it opens straight
     * onto the solar system.
     */
  },
  isStrictPluginList: true,

  /*
   * No catalog. Nothing in this build reads objectCache, and skipping it is what turns a
   * ~12s boot into a ~2.5s one. Anything that would need a selected satellite is disabled
   * above, so nothing is left to toast "Select a satellite first!".
   */
  noCatalogOnLoad: true,

  /*
   * Sensors and launch sites are ground infrastructure for tracking Earth satellites. They
   * would render as markers on a globe nobody in this build is looking at.
   */
  isDisableSensors: true,
  isDisableLaunchSites: true,

  /*
   * The solar system, in full. These are the defaults, restated because they are the product:
   * a future change to the shared defaults must not quietly turn the belt or the planets off
   * in the one build whose entire purpose is showing them.
   */
  isDisablePlanets: false,
  isDisableSkybox: false,
  isDrawAsteroidBelt: true,
  isDrawMilkyWay: true,
  isDrawSun: true,

  /*
   * Skip the "Click to Begin" splash, as every other shipped profile does. Without it the
   * app sits on the loading screen until someone clicks - which is defensible for the main
   * tool, where the click buys a user gesture before a heavy catalog load, but this build
   * has no catalog to load and is meant to be embeddable and kiosk-friendly.
   */
  isAutoStart: true,
};

// Expose these to the console
window.settingsOverride = settingsOverride;
