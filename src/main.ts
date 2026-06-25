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

import { KeepTrack } from './keeptrack';
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

// Load the main website class
keepTrackInstance.init(window.settingsOverride);

// Expose to window for debugging
window.keepTrack = keepTrackInstance;

// Initialize the website
KeepTrack.initCss().then(() => {
  keepTrackInstance.run();
});

registerServiceWorker();
