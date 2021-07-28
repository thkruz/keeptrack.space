/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * astronomy.ts is a plugin for showing the stars above from the perspective
 * of a view on the earth.
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
  const { settingsManager, drawManager, starManager, objectManager, uiManager, orbitManager, sensorManager } = keepTrackApi.programs;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'astronomy',
    cb: () => {
      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-astronomy" class="bmenu-item bmenu-item-disabled">
          <img
            alt="telescope"
            src=""
            delayedsrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAAKfklEQVR4nO2dfYxcVRXAf+ftdtitu0UQsTRpxLSVNrO7bXemy7ZVKCkitDUISRGR8lGCNY2iMYHWRMqXf7TEGAgSsFIQaxErgkbKh0pKBdqy+2br7nTsIk2KIIoiNNDabXd23/GPXbTtzn1z38fQye77JfvHvnvuvWfumXvuu+ed+wYSEhISEhISEsYicqIVqGYyro7rF76KsgyYDgwo7BFhQ0rZlMtKMWofiQEMpDt0ouPwFDDbIPJycZDFvWfLO1H6caJUHq1kXB3nOGzBPPgAZ9fW8BSqkcYwMUAJinA90FpOTqCtyeWaKH0lBiiBCl+xlRXh8ih9JQYohZIOIF12pviRGKA0QcblyIfV0dhB6A0g+2qUrhIDHEezq19EA7mVn0TpLzHAUaRdPQ94FKixqiBs9+p4JEqfyUZsmBZXWxW2AhNs6zgeTd1tUojSbzIDgCZXpyhsIcDgAwzW8OmofddGbcBExtXx/bAauAKYDLwBbGroZ+2OedJXqX6Dku7QiQK/AyYaRA6g7EI4Z0SJx1zgiSj9V8QFDQ/+c0D7iEJlR0ORhdVghIyrJxfheYVZBpF+cVikymSUh44vFHipJyufiaJDRVzQ8Dd/5OADCHP/M45Vleg3CGdu1bp++LXP4HsqXNXTKs+Jx45SAgqZdEFTUfSo1BpwhV9hkK1+JVi6WWsmNLAJWGAUEm7YnZFfAPRk+YvCv0tI1dUcrs6d8OSI5RWldwr3qnCpj8j38hm593//iShqmAXKvCi6VMoAb/gVKrxeoX7L0uzqbSgrjALK+nxWbh5xXUobAJgbRZ9KGWCTb6mUKa8QLa6uBNb4iDwxfR8rSxWIx3ZDneqbAQ39rDVNWYTtjUe4sxL9+tHs6lKFe4wCwrYDB7jil5fJYKnilEMnUOoR5KQZXfrJsHpVxAA75klfQ5GFotwG7AX6gb0q3NpwhPM/7FvQli5dCGzE/Hm7U8rFr50nh01t5LJyCKW7VNm4wfCzYNSHIppy2iLKNuCjBpF9AzB/T1b+Ua6tFlfvVrihRNE9+ayUul6WUR2KaHJ1iijPYh78t0W5yGbwAYxuNcI6MGoN0NKtpwNP4xdiEC7qmSOv2LY5KMaFeGa6oA1BdYRRaoCpO3WCFnlGYJpBpN8RluYzkgvSbiErrwN/K1FUSx9zAivKKDRAuqCp+loew5xS4qmwrDsjz4bsoqQbqgm5IRtVBli6WWtqDvFz4HNGoaEQw+bQnZh2xMI5YXKERpUBLEIMdxwTYgiBmNeBC5py9Lbk9MIg7Y0aA1iGGPx2wVYoTDGVCUxTZUuLq1fbtjcqDBAlxBCEWbt0GvDjMmKOwv3pnE61adPqiVi6oCnnMHcMZwkrsNGrZ00hLf029SuJVYjhfXOIIQiDA6xEGG8hWifKt6G80a0M4PRxO3DTUZdWOUPBhNU29StFS5cuVC9aiCEIKiy2DR0IfN5GztYFLbO89qHR4mqrejwOnGQQ2TcAF+Wy8l5cfQp8IoC4aQN4DBV7KB8n6YKmpI/lolyFMB2o1aE4lmn3+S9PuGBPxjLEYM/b2GdOWJ0bsJ0BG0tc+6ll3UjM7tJJzmFeFLgPYS5wCtCIefAPICwqZGRv3LoI7LGWFZ63kbOaAV49a4Z9/gduZ6NXzy22yoQlXdDUQB+Pg/U2/4g4XNLTGizEYEOTq4sVFlmKD6LcZSNY1eHo5pxej7LeUtxT4cuRdrkGmnI6Q4Z2wCdbVVBW5eeI1UOn6t4HeFxrLau8XInBb+7RU1B+g93gv6PKdbaDD9W+CAszAsgad6hhWbpZa3r7edQnqvqWChtE8VTYrXU8VUjLwSB9VLcBwAsge3pzTn/vCd8stMqf4+i891N8H7jAUFwU4bJ8Rl6I0kd1u6AgByUAlPMdj11NnXrn1J0aKNH2eJpzeg3Ct3x0W9ETcfChyg2gWvL2txwpEW6sr+WVpk5dHiZE3JLTdpT7zYpxVz4jI3JFw1DVBpBoB+AmirChOUfnTFetE2hnuHqGKo9h2mELf/jYQW6MoNdxzVUpzTnNoHQQ05dE4Mmiw9f3tMpfTTJnbtW6hka2CbQZRPaloC2XlVJ5oqGozhkw5Dbuw6zffoTtCCuAW4BDZZuEJbUehWZXvzt3u9aXkmls5AGfwX/fc1gS5+BDlc6A5k5dgRh8sLI+P0eOefDS1KGTxWEdcDl2n+k1FVbh0SgOy1GmA+OBOoO8p8LFuzPyZICPYUXVGSC9XU+VFK8InFai+N0UnGX6FqY7dI4j3D0cM4qT7+SzsjbmNoEqdEFOirWGwQdhtZ8LKLRJZz7LfFGuBt6KSaXH8hnWxdTWCELPgHRBU3KIZY5wrQ69S8dB6QUe9sbzkO3TsnRBU84hrgWuHg41n2LQtDPfSjsiVpuzqTt1wvhabh5OJQx7iqWnoZ/2SuayhjLA7C79+ICyBTVEKYVOp4ZLumfJm2XamVT0eMJn4fsAz/NoL7RJZ1BdZ+3Sad4gP1BYErQuwrZ8RhYErheAwC5o6WatGfB42jj4AMqcwQEe9zs/lS5oasDjVxaDD8oDYQYf4E+z5dWerHzBES4kQDx/uN+WMH0GIXAsqHcKy1Ey5eQE2qSPI82ulhYIMKlV2GUvXZrujDybcXVmP+wHPhK1vbgIvgh7fKkCevjiwJVxtJPLSlHB/mS70BNHv34EN4CQrYAevgwv8nER5HhUxY9ShQlHR3o/Tkhi268cPpkf1b/HcmCmr6DipizfhBIlbyrMPsA6nz4uFGKJ7wPsnSZHnFoWg3ldUejQQZbYvpbS6eN2lJuAM4BJDOVN3W5V10boGISfBa4TEQcejrO97lnypldPO8o3gJ3AQWC/wEsoXzvtAPN3t8s/AzQZOm8qsAtKKQ8V4SqF+WVEc14980zTcOqrelLde/zR4jZ052B9/Ckww3r9cPjvhBF4BuSyUlTl1jJiXZ7HEj8fuHeaHKmp5VKFDp92dg7ApdWQg1qG0HlT4WJB5juhNwRWpqC90CZlYzHds+RNreezCCsYyrvfz1GhZq+ec60P0J1AvHrWAOuAvw//rbPNmwp1d9Hk6jOG5NPV+axULHA1Ggk8AxZs1VoxHMsU7NLxEv5PYAO8O4EsQ7mZx3NwHHRFV2lsEfguSNXwjh3hhVwm+uvcxxrBF2HlXMP1bVGVGYsEMsCCrVqLlL7/F0kMEIZABvD1/0rsKeFjgUAGMPp/5cU4fs5jLBJsDTD5/8T9hMbaAGX8//OxaTTGsDZA4v8rg7UBEv9fGcpuxI76La3Sp76r1P9X8+n+o/E1wAxXz+iHLajPzzkpbuxaxUC1nu4/HqMLShc0VQu/xf+3tBDh1gVbtRqPOlXd6f5SGA0gfSyH8vk/CvPfbYz2W1pjGb9F2PoF26rV983iBJ7uD4LRdQgBfktLOCsWbWLkRJ3uD4rxiVizq+8Ap1q2sz+fFVvZhKPwc0FBUviSjVhIzAbQQGl5sb8iYKxgNEBKeNDmHl+hI9/KhnjVGjsYDZDLSlEHWQK+7uXlgUEW2Z5aSRhJ2bSUdEFTNX1cp8KVKDOBwygFER4cB48kcaCEhISEhISEhITg/BfVJHvnU5Vq4wAAAABJRU5ErkJggg=="
          />
          <span class="bmenu-title">Astronomy View</span>
          <div class="status-icon"></div>
        </div>
      `);
    },
  });

  keepTrackApi.programs.astronomy = {};
  keepTrackApi.programs.astronomy.isAstronomyView = false;

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'astronomy',
    cb: (iconName: string): void => {
      if (iconName === 'menu-astronomy') {
        const cameraManager = keepTrackApi.programs.cameraManager;
        if (keepTrackApi.programs.astronomy.isAstronomyView) {
          keepTrackApi.programs.astronomy.isAstronomyView = false;
          cameraManager.panReset = true;
          cameraManager.localRotateReset = true;
          settingsManager.fieldOfView = 0.6;
          drawManager.glInit();
          uiManager.hideSideMenus();
          cameraManager.cameraType.current = cameraManager.cameraType.default; // Back to normal Camera Mode
          uiManager.legendMenuChange('default');
          if (objectManager.isStarManagerLoaded) {
            starManager.clearConstellations();
          }
          $('#fov-text').html('');
          // $('#el-text').html('');
          $('#menu-astronomy').removeClass('bmenu-item-selected');
          return;
        } else {
          if (sensorManager.checkSensorSelected()) {
            if (objectManager.isStarManagerLoaded) {
              // TODO: This takes way too long trying to find the star's
              // satellite id from its name. The ids should be predetermined.
              starManager.drawAllConstellations();
            }
            orbitManager.clearInViewOrbit();
            cameraManager.cameraType.current = cameraManager.cameraType.astronomy; // Activate Astronomy Camera Mode
            $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
            uiManager.legendMenuChange('astronomy');
            keepTrackApi.programs.planetarium.isPlanetariumView = false;
            $('#menu-planetarium').removeClass('bmenu-item-selected');
            keepTrackApi.programs.astronomy.isAstronomyView = true;
            $('#menu-astronomy').addClass('bmenu-item-selected');
          } else {
            uiManager.toast(`Select a Sensor First!`, 'caution');
            if (!$('#menu-astronomy:animated').length) {
              $('#menu-astronomy').effect('shake', {
                distance: 10,
              });
            }
          }
          return;
        }
      }
    },
  });
};
