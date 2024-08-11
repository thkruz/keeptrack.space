/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2024 Theodore Kruczek
 * @Copyright (C) 2020-2024 Heather Kruczek
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

import { keepTrackApi } from '@app/keepTrackApi';
import sat2Png from '@public/img/icons/sat2.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/SoundNames';

declare module '@app/interfaces' {
  interface UserSettings {
    isSatOverflyModeOn: boolean;
    isShowSurvFence: boolean;
    isFOVBubbleModeOn: boolean;
  }
}

export class SatelliteFov extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Satellite Field of View';

  constructor() {
    super(SatelliteFov.PLUGIN_NAME);
  }

  bottomIconElementName = 'menu-sat-fov';
  bottomIconLabel = 'Satellite FOV';
  bottomIconImg = sat2Png;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  addJs(): void {
    super.addJs();

    const keyboardManager = keepTrackApi.getInputManager().keyboard;

    keyboardManager.registerKeyEvent({
      key: 'C',
      callback: () => {
        if (keyboardManager.isShiftPressed) {
          const currentSat = keepTrackApi.getPlugin(SelectSatManager).getSelectedSat();

          if (currentSat) {
            const coneFactory = keepTrackApi.getScene().coneFactory;

            // See if it is already in the scene
            const cone = coneFactory.checkCacheForMesh_(currentSat);

            if (cone) {
              keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_OFF);
              coneFactory.remove(cone.id);
            } else {
              keepTrackApi.getSoundManager().play(SoundNames.TOGGLE_ON);
              coneFactory.generateMesh(currentSat);
            }
          }
        }
      },
    });
  }
}
