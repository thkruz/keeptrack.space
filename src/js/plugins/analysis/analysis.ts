/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * analysis.ts is a plugin for viewing trend data on TLEs and calculating best
 * pass times.
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
 * /////////////////////////////////////////////////////////////////////////////
 */

import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  const { satellite, sensorManager, objectManager, satSet, uiManager } = keepTrackApi.programs;
  let isAnalysisMenuOpen = false;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'analysis',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
        <div id="analysis-menu" class="side-menu-parent start-hidden text-select">
          <div id="analysis-inner-menu" class="side-menu">
            <ul>
              <h5 class="center-align">Analysis Menu</h5>
              <li class="divider"></li>
              <div class="row"></div>
              <form id="analysis-form">
                <div class="row">
                  <div class="input-field col s12">
                    <input value="25544" id="anal-sat" type="text" />
                    <label for="anal-sat" class="active">Satellite Number</label>
                  </div>
                </div>
                <div class="row">
                  <div class="input-field col s12">
                    <select value="0" id="anal-type" type="text">
                      <optgroup label="Orbital Parameters">
                        <option value="inc">Inclination</option>
                        <option value="ap">Apogee</option>
                        <option value="pe">Perigee</option>
                        <option value="per">Period</option>
                        <option value="e">Eccentricity</option>
                        <option value="ra">RAAN</option>
                        <option value="all">All</option>
                      </optgroup>
                      <optgroup id="anal-look-opt" label="Look Angles">
                        <option value="az">Azimuth</option>
                        <option value="el">Elevation</option>
                        <option value="rng">Range</option>
                        <option value="rae">All</option>
                      </optgroup>
                    </select>
                    <label for="disabled">Chart Type</label>
                  </div>
                </div>
                <div class="row">
                  <center>
                    <button id="analysis-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">View Trends &#9658;</button>
                  </center>
                </div>
              </form>
            </ul>
            <div class="row">
              <center>
                <button class="btn btn-ui waves-effect waves-light" onclick="satSet.exportTle2Txt();">Export TLEs &#9658;</button>
              </center>
            </div>
            <div class="row">
              <center>
                <button class="btn btn-ui waves-effect waves-light" onclick="satSet.exportTle2Csv();">Export Catalog CSV &#9658;</button>
              </center>
            </div>
            <div class="row">
              <center>
                <button id="findCsoBtn" class="btn btn-ui waves-effect waves-light">Find Close Objects &#9658;</button>
              </center>
            </div>
            <div class="row"></div>
            <h5 class="center-align">Best Pass Times</h5>
            <li class="divider"></li>
            <div class="row"></div>
            <div class="row">
              <form id="analysis-bpt">
                <div class="row">
                  <div class="input-field col s12">
                    <input value="25544,00005" id="analysis-bpt-sats" type="text" />
                    <label for="analysis-bpt-sats" class="active">Satellite Numbers</label>
                  </div>
                </div>
                <div class="row">
                  <center>
                    <button id="analysis-bpt-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Generate Best Pass Times &#9658;</button>
                  </center>
                </div>
              </form>
            </div>
          </div>
        </div>
      `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-analysis" class="bmenu-item">
          <img
            alt="analysis"
            src=""
            delayedsrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAAFDUlEQVR4nO2cUVMbVRTH/2dDbBBQHxVfWxhLkwBJWh/6MWy0dqyjY9Gh01E/QeknUKdTRqmjY51aTf0YPNiGEEOgHbCvUh9VQFIhe3xJnQzZm92b7O5BPL+33XPv2Qt/9vzvPckAKIqiKIqiKIqiKIqiKIqiKErkkO2E9BJzFAs5KtTzZPU7daJaiBIMFUAYFUAYFUAYFUCYgbAS2br/f52wdoP6BgijAgijAgijAgijAggT2i5Ie0S9oW+AMCqAMCqAMCqAMCqAMNoL6hHtBR0RVABhVABhVABhVABhQtsFSTC1zKP7Ln71CG3W8/Ry7AvqgUPxBmTKPDdZ5RO285qMnNd9Apa7zZus8olMmedsnxcF4gKkKzzDhKvNJpbTFZ6xmux6C+ASlozPW+JzzSbKTLhq/bwIEBUgU+ZTYHzSuhwG44v0Epcmq/xCkPlMyHsHOgUYX+SRTIVvASgBeL417rNsmad6WnxIiAkwvsgjTPgRwLMHQuf2m7ifvcdjAdJMe91MOqi2X2fv8VgyhQoz3jowNOUS7owv8kjwlYeLmADHBnEDwLgpvsP4rdv8qWUeBfCSR2izOk2b7Tf2h7FJwL4h1fgzKXzpt96oEBEgXeEZj7/GpzQSjNcfvUp/dsthMmBmVA7eW5ugbWIUAfxlSFeU8oPYBThQ9zsg4EqtQFVT/F8MBgynUwAAWCnQKggfGfMJ+UGsAkys8TATSuis+wAAJny/kqdA5cDGgJ9Sz9FNBm4ZwimXUDr+Ez8X5PlhEasAiQbmAbxiCG/s7cKmDHgacNPnDOAkMQvggSF8fHAANy3W0DexCeBX910HxfWztBUkVzcDfpinx93mrmRpx3EPjx/EIoBf3Qdhdm2aakHz2RiwF7XTtMaMK8YBMfpB5AL41X0Ad+o5+toqqaUBe7FaoK8AfGMIx+YHkQvg7OJzmOv+A0riknVS8hbA8an/HWmSuIzufjBvuzRbIhXgVJnfBXDBEG64Dt5cydKObV6GtwB7XXZAXrT5gWkNF9IVfsd2fTaIN+Ns6ceADyORCtCqs7cN4ZTj4rtMjYdscvbagvYiU+Mh10EJgGkNt639yZLI3wB3EB8AeGgIn+Q9y313Dy1oE7yHGwBOGsKPdvcxa5vTlsgFCNCHOW9TZ3s5AXvR8qe3DeGGwyj69aPCIBYPaPVhPjYOYMxPLHM2YLqeTsDtZO/zBBGuGwcQPgzUjwqB2Ey4nqMFInxrCKccFyW/vnwYBtxW903nklI9RwtBcoVBrLugZgqzMPvBWHIQXX/wfk/AAODuYR7d6779uaQPYhXAzw+I8UZmid8zJujzBJyu8CUCLhrCsdX9dmI/B/j5AQPXTX2Yfgy41Y/61DggxrrfjshBzM8PmoQfDH2Yngw4QD8q1rrfjthJ+MkuLgNYN8WHCC+2X3cx4Md+BjywjVE2fwlt/e8GzGUvYsQEWD9LW8R4DZ1+cPcYUKidoY32m10M2Lf81M7QBg9iGtxh8g2HcT7o5xBRINoLOuAHW8y4WM9TsZKnPzoG92nAaxO0XS/Q+wCKAH4HIFb32xFvxtVztECMa4kEcqsFMvlCaC3oep7uJhI4TYxrUnW/nUPx5dyVAs35jQmrBQ0AP0/RLwB8nxkHh0KAINTzNCq9higQL0H/d1QAYVQAYVQAYVQAYfT/BQmjb4AwKoAwKoAwKoAwKoCiKIqiKIqiKIqiKIqiKIqiHH3+ARw90MK30gxuAAAAAElFTkSuQmCC"
          />
          <span class="bmenu-title">Analysis</span>
          <div class="status-icon"></div>
        </div>
      `);

      $('#analysis-form').on('submit', function (e) {
        let chartType = $('#anal-type').val();
        let sat = $('#anal-sat').val();
        let sensor = sensorManager.currentSensor.shortName;
        if (typeof sensor == 'undefined') {
          $.colorbox({
            href: `analysis/index.htm?sat=${sat}&type=${chartType}`,
            iframe: true,
            width: '60%',
            height: '60%',
            fastIframe: false,
            closeButton: false,
          });
        } else {
          $.colorbox({
            href: `analysis/index.htm?sat=${sat}&type=${chartType}&sensor=${sensor}`,
            iframe: true,
            width: '60%',
            height: '60%',
            fastIframe: false,
            closeButton: false,
          });
        }
        e.preventDefault();
      });
      $('#analysis-bpt').on('submit', function (e) {
        let sats = $('#analysis-bpt-sats').val();
        if (!sensorManager.checkSensorSelected()) {
          uiManager.toast(`You must select a sensor first!`, 'critical');
        } else {
          satellite.findBestPasses(sats, sensorManager.selectedSensor);
        }
        e.preventDefault();
      });

      $('#findCsoBtn').on('click', function () {
        $('#loading-screen').fadeIn(1000, function () {
          let searchStr = satellite.findCloseObjects();
          uiManager.doSearch(searchStr);
          $('#loading-screen').fadeOut('slow');
        });
      });

      $('#analysis-menu').resizable({
        handles: 'e',
        stop: function () {
          $(this).css('height', '');
        },
        maxWidth: 450,
        minWidth: 280,
      });      
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'analysis',
    cb: (iconName: string): void => {
      if (iconName === 'menu-analysis') {
        if (isAnalysisMenuOpen) {
          isAnalysisMenuOpen = false;
          $('#menu-analysis').removeClass('bmenu-item-selected');
          uiManager.hideSideMenus();
          return;
        } else {
          uiManager.hideSideMenus();
          isAnalysisMenuOpen = true;
          if (objectManager.selectedSat != -1) {
            let sat = satSet.getSat(objectManager.selectedSat);
            $('#anal-sat').val(sat.SCC_NUM);
          }
          if (sensorManager.checkSensorSelected()) {
            $('#anal-type').html(
              `<optgroup label="Orbital Parameters">
                <option value='inc'>Inclination</option>
                <option value='ap'>Apogee</option>
                <option value='pe'>Perigee</option>
                <option value='per'>Period</option>
                <option value='e'>Eccentricity</option>
                <option value='ra'>RAAN</option>
                <option value='all'>All</option>
              </optgroup>
              <optgroup id="anal-look-opt" label="Look Angles">
                <option value='az'>Azimuth</option>
                <option value='el'>Elevation</option>
                <option value='rng'>Range</option>
                <option value='rae'>All</option>
              </optgroup>`
            );
          } else {
            $('#anal-type').html(
              `<optgroup label="Orbital Parameters">
                <option value='inc'>Inclination</option>
                <option value='ap'>Apogee</option>
                <option value='pe'>Perigee</option>
                <option value='per'>Period</option>
                <option value='e'>Eccentricity</option>
                <option value='ra'>RAAN</option>
                <option value='all'>All</option>
              </optgroup>`
            );
          }
          // Reinitialize the Material CSS Code
          let elems = document.querySelectorAll('select');
          M.FormSelect.init(elems);

          $('#analysis-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-analysis').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'analysis',
    cb: (sat: any): void => {
      if (uiManager.isAnalysisMenuOpen) {
        $('#anal-sat').val(sat.SCC_NUM);
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'analysis',
    cb: (): void => {
      $('#analysis-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-analysis').removeClass('bmenu-item-selected');
      isAnalysisMenuOpen = false;
    },
  });
};
