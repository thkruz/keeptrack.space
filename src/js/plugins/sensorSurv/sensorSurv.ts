/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * externalSources.ts is a plugin to allow downloading and parsing of external
 * data sources from the internet.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2021 Theodore Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * TESTING: This plugin requires php to be installed on the server. It won't work
 * with the default http npm module.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  const { settingsManager, sensorManager, satSet, uiManager } = keepTrackApi.programs;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'sensorFov',
    cb: () => {
      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-surveillance" class="bmenu-item bmenu-item-disabled">
          <img
            alt="fence"
            src=""
            delayedsrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAADGElEQVR4nO2dz25SQRTGv0MCKSk+h4sb6MKuKgsTN62xz1N31p0+j422iYldoJuyaetd+BraBoSUcQHXNMil989czpne77dkCDN8P5jhwpwBIIQQQgghhBCyUUR7AEXoDp1bdfv1rgT3fBraA6g7FKAMBShDAcpQgDIUoAwFKEMBylCAMhSgDAUoY0pAFLvWY+gjD2YE9C7ccWOMr08H7kllfVy67cYIZ92he19VH3kxIaB34Y6d4C0c9lptnFYhoXfptt0UJwBeADiyIkFdwL/wEyqQsBR+ggkJqgL+Cz/Bo4SU8BPUJagJiGLXmglept7BYa+5hU9R7Dol+ujMpjjF6vAX3eC55sKsJiCOZNJoYh/Aedp9BOg3xjgr8k5YLLgfBeivefxv0zFexZFM8j6+L1SnoKsduZUmXmONhCLT0QPTDoB5+H/GOPjZl985huwd9UXYt4SQwl+MxQZZgoPg+2SE/dYWfq1sbqITUviAIQHAfNGUET6vm7cdMEhrX9eWtLs2DuJIbnyM1wemBAAZ3wkFsPbKTzAnAPAvwWr4gFEBgD8JlsMHDAsAykuwHj5gXABQXEII4QMBCADySwglfCAQAUB2CSGFDwCSttOYbAb1ryLqDgUoQwHKUIAyFEAIIYQQQhTgd0HK8DpAGQpQhgKUoQBlKECZR/eTZLJ9MZifJLUHkIXcOyMCkmBeQOG9QYFIMC2g9O64ACSYFeBtf6hxCSYFeN8hbViCOQFVbU+3KsHUdUDGqsZBkTYfVZdVYEZAnqrGtPYqqy6rwoQAX4V1VVVdVom6AN9VjaFJ0D2qoKKS0pAk6B5VkGHBvWsX++RytSO3szYOMy7M9TyqQICTtPZ7xwgULimNI7l5aGGG4Ettjyq43pUPAN4s3+6zyGLddOQExz+eybuyfZRBfRFellBFhcsqCRbCBwxdCXeH7kiAwyzhF/3/gGTRd4JzC+EDhgQA84U5y3xc5g8csvaxKdSnoPtsIhhL4QPGBNQRClCGApShAGUoQBkKUIYClKEAZShAGQpQhgIIIYQQQgghhNSLv0Nm3xno+AzXAAAAAElFTkSuQmCC"
          />
          <span class="bmenu-title">Sesnor Fence</span>
          <div class="status-icon"></div>
        </div>
      `);
    },
  });

  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'sensorFov',
    cb: (iconName: string): void => {
      if (iconName === 'menu-surveillance') {
        if (!sensorManager.checkSensorSelected()) {
          // No Sensor Selected
          if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.survFenceDisabled();
          uiManager.toast(`Select a Sensor First!`, 'caution');
          if (!$('#menu-surveillance:animated').length) {
            $('#menu-surveillance').effect('shake', {
              distance: 10,
            });
          }
          return;
        }
        if (settingsManager.isShowSurvFence) {
          settingsManager.isShowSurvFence = false;
          $('#menu-surveillance').removeClass('bmenu-item-selected');
          satSet.satCruncher.postMessage({
            isShowSurvFence: 'disable',
            isShowFOVBubble: 'reset',
          });
          return;
        } else {
          // Disable Satellite Overfly
          settingsManager.isSatOverflyModeOn = false;
          $('#menu-sat-fov').removeClass('bmenu-item-selected');

          settingsManager.isShowSurvFence = true;
          $('#menu-surveillance').addClass('bmenu-item-selected');
          $('#menu-fov-bubble').removeClass('bmenu-item-selected');
          satSet.satCruncher.postMessage({
            isShowSatOverfly: 'reset',
            isShowFOVBubble: 'enable',
            isShowSurvFence: 'enable',
          });
          return;
        }
      }
    },
  });
};
