/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * main.ts is a TypeScript implementation of the KeepTrack class. This is responsible for
 * initializing the website.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2023 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
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

declare global {
  interface Window {
    keepTrack: KeepTrack;
  }
}

// Load the main website class
const keepTrack = new KeepTrack(window.settingsOverride);
// Expose to window for debugging
window.keepTrack = keepTrack;
// Initialize the website
KeepTrack.initCss().then(() => {
  keepTrack.init();
});
