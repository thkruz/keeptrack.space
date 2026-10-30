/**
 * `@keeptrack/plugin-api/testing`: the unit-test kit for KeepTrack plugins.
 *
 * Import it only from test files (`__tests__/*.test.ts`). It re-exports the
 * host's jsdom test environment and the standard plugin test suites, so a
 * plugin's tests never import `@test/*` or other internal paths. Run them with
 * `npm run plugin -- test <name>` (vitest, jsdom, the host's aliases).
 *
 * Versioned together with `@keeptrack/plugin-api` (`PLUGIN_API_VERSION`).
 *
 * Excluded from the production typecheck/build (tsconfig.build.json): it pulls
 * in the vitest-global test helpers under test/.
 *
 * @packageDocumentation
 */

/** Test-environment setup. */
export {
  /**
   * Clear the plugin registry and rebuild the app's default DOM skeleton (body,
   * drawer/bottom menu, search, info box) without rebuilding the rest of the environment.
   */
  setupDefaultHtml,
  /**
   * Build a fresh jsdom app environment: settings, event bus, plugin registry,
   * mocked managers (catalog with sample satellites, sensor, renderer, UI). Call in
   * `beforeEach`. Pass plugin classes your plugin depends on to register them too.
   */
  setupStandardEnvironment,
} from '@test/environment/standard-env';

/** Standard plugin test suites. */
export {
  /** Registers the drawer-icon open/close tests for a plugin with a bottom icon + side menu. */
  standardPluginMenuButtonTests,
  /** Registers the lightweight smoke tests (construct + init) for any plugin. */
  standardPluginSmokeSuite,
  /** Registers the standard init/addHtml/addJs lifecycle tests for any plugin. */
  standardPluginSuite,
  /** Boot a minimal engine (renderer, scene, camera, time), init `plugin`, and emit the UI lifecycle events (uiManagerInit, uiManagerFinal, uiManagerOnReady). */
  websiteInit,
} from '@test/generic-tests';
