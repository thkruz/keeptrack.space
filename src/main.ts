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

// Check if the browser is safari
const isSafari = (/^(?:(?!chrome|android).)*safari/iu).test(navigator.userAgent);

if (isSafari) {
  // Safari is not supported
  // eslint-disable-next-line no-alert
  alert(
    'KeepTrack\'s 3D Application is not supported on Safari.\n\n' +
    'Please use a different browser. You will be redirected to the homepage.',
  );
  // Redirect to the homepage
  window.location.href = 'https://keeptrack.space';
}

// Load the main website class
const keepTrack = new KeepTrack(window.settingsOverride);

keepTrack.init();

// Expose to window for debugging
window.keepTrack = keepTrack;

// Initialize the website
KeepTrack.initCss().then(() => {
  keepTrack.run();
});
