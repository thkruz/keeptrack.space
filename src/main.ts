/**
 *!
 * /////////////////////////////////////////////////////////////////////////////
 *
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

import { prepareEmbed } from './embed/embed-install';
import { KeepTrack } from './keeptrack';
import { localesReady } from './locales/locales';
import { registerServiceWorker } from './pwa/service-worker-registration';

/*
 * Materialize v2 themes its components via Material Design 3 tokens that default
 * to a light palette unless the root element carries theme="dark". The HTML
 * templates set this, but index.html is un-hashed and can be served stale from
 * cache, so assert it here too (bundled JS is content-hashed) to guarantee the
 * dark palette regardless of which entry point loads or what the browser cached.
 */
document.documentElement.setAttribute('theme', 'dark');

const keepTrackInstance = KeepTrack.getInstance();

// Embed API: when hosted in an iframe by the SDK, merge the host's boot config into the settings override
const embed = prepareEmbed(window.settingsOverride as Record<string, unknown> | undefined);

window.settingsOverride = embed.settingsOverride as typeof window.settingsOverride;

/**
 * Everything from init() on. Synchronous for the normal site; the embedded path awaits license
 * verification first (it must settle before plugins load) and then runs this same function.
 */
const boot = async (): Promise<void> => {
  // The detected language is lazy-loaded; it must be in place before any t7e() call renders UI
  await localesReady;

  // Load the main website class
  keepTrackInstance.init(window.settingsOverride);

  // After init(): the opt-out reads settingsManager.isDisableServiceWorker, which only reflects
  // settingsOverride (e.g. an embed's) once init() has applied it
  registerServiceWorker();

  // Expose to window for debugging
  window.keepTrack = keepTrackInstance;

  // window.keepTrackEmbed: the embed facade (every build, embedded or not)
  embed.install();

  // window.__ktQaState(): read-only state snapshot for automated playtesters (Pro builds only, never in an embed)
  if (__IS_PRO__ && !embed.isEmbedded) {
    import(/* @vite-ignore */ '@plugins-pro/qa-state/qa-state').then((m) => m.installQaState());
  }

  // Initialize the website
  KeepTrack.initCss().then(() => {
    keepTrackInstance.run();
  });
};

if (embed.isEmbedded) {
  embed.resolveLicense().then(boot);
} else {
  boot();
}
