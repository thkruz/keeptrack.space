/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * watchlist.ts is a plugin for creating a list of satellites to actively monitor
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

import { saveAs, stringPad } from '@app/js/lib/helpers';
import $ from 'jquery';
import { dateFormat } from '@app/js/lib/external/dateFormat.js';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  const { satellite, satSet, objectManager, orbitManager, uiManager, ColorScheme, sensorManager, settingsManager, timeManager } = keepTrackApi.programs;
  keepTrackApi.programs.watchlist = {};
  keepTrackApi.programs.watchlist.lastOverlayUpdateTime = 0;
  let watchlistList: any[] = [];
  let watchlistInViewList: boolean[] = [];
  let isWatchlistChanged: boolean = null;
  let isWatchlistMenuOpen = false;
  let nextPassEarliestTime: number;
  let nextPassArray: any = [];
  let isInfoOverlayMenuOpen = false;
  isWatchlistMenuOpen = false;
  
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'watchlist',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
        <div id="watchlist-menu" class="side-menu-parent start-hidden text-select">
          <div id="watchlist-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Satellite Watchlist</h5>
              <div id="watchlist-list">
                <div class="row">
                  <div class="col s3 m3 l3">25544</div>
                  <div class="col s7 m7 l7">ISS (ZARYA)</div>
                  <div class="col s2 m2 l2 center-align remove-icon">
                    <img
                      alt="remove"
                      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAA3NCSVQICAjb4U/gAAAACXBIWXMAAAHJAAAByQFhD1RcAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAGlQTFRF/////1VV5k1m6lVV40xe3lJj4VFe4VFe4k5f4E5g4E9e305g31Bg4E9f4E9e4E9f4E9f4VBg4E5f4E9f4E5g4E9f4E9f4E9e4E9f4E5f4E9f4E9f4E9f4E9f4E9f4VJi64yW7Zeg////NeVZWAAAAB50Uk5TAAMKDBsfPExOYmRocHSKjqSwtr7Ay9XY5ery+Pn+bfME6gAAAUZJREFUWMOtl8eSwjAQRNs4YJxxjoPN/3/kHjaUWGyQ1LybDt1VGo0mAAe4YZIVVTeOXVVkSejCCC8uJ3lgKmNPV31Km0V2WJr0pCF3ol4O6SPnnf7cykva80u5X8tbav9YHwyiwRAc6S+zaDFf9qOXizb5TiydqxhwfXbIxYj86f5iyL84BLOpwfzwFv4gxgxqPtRiQa3kr1jxl9VOa2fQ/r5lJJZEP/+/tzXov+tDKtakAIDG3qABAG+xN1g8ALEQxABKxqAE3IkxmFyEQhEiUY+3dXvLelMVCTL1uN41WFVFhkI9bjoGm6ooUHEGFTrOoMPIGYy8AX0FOoj0M9KJRKcy/Zno70wXFL6k0UWVLut8Y6FbG91c+fZODxj8iMMPWfSYxw+a/KjLD9v0uM8vHB9Yefili1/7PrB48qvvB5Zvs/X/C6awfBwst5iRAAAAAElFTkSuQmCC"
                    />
                  </div>
                </div>
              </div>
              <br />
              <div class="row">
                <div class="input-field col s10 m10 l10">
                  <form id="watchlist-submit">
                    <input placeholder="xxxxx" id="watchlist-new" type="text" />
                    <label for="watchlist-new">New Satellite</label>
                  </form>
                </div>
                <div class="col s2 m2 l2 center-align add-icon">
                  <img
                    class="watchlist-add"
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAA3NCSVQICAjb4U/gAAAACXBIWXMAAAHJAAAByQFhD1RcAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAJZQTFRF////VaqqM7OzK7+qL72qMb2lM7+mMr+kMb6nMb6nM7+mMb2nMr2mM72nMr6mMr6lMr6mM76nMr+lMr+mMr6mMr6mMr6mMr6mMr6mMr6mMr6mMr6mMr6mMr6mMr6mM76mNb+nOMCoYc26bNC/bdHAdNPDd9TEeNTEedTFetXFf9bIhtnKjNvNn+DVp+PZrOXbs+fe////v8RfqwAAAB50Uk5TAAMKDBsfPExOYmRocHSKjqSwtr7Ay9XY5ery+Pn+bfME6gAAAYRJREFUWMOtl9l6gjAQhQdBRXZBFlmm2lrr0s33f7le1EqoQUOO5w4+zv+RzGQyQ9Qj0/aCKMnLMk+iwLNNGiTLjSvuqIpdS9U98tOGJWpSf6RgN5yCe1U4xj3/NOObyqY37eMF39Vi3O+fLFlBy0mff1azkuqZfPdCVlYo2UtjzgM0vyaEPEjh1fp5oP7tw6QeCqg7sRjL4rfaHs96fZJFU8wHaf5sThc9SzNKyF/pT+5awIv0g0tWG5keIPuLpcN6AHbO57/QBRS/9cFnXQD7RESU6gNSIiKr0Qc0FhG5rA9gl4hiBBATmRUCqEyyGQGwTV7n/Gx2rT5bwMdbq81KdHgUiI/bk4K2oiOgSHw8qgCOoiOiBAMklGOAnEoMUOIAeAnwJsJh7CTSXgWw7yZSJ5XXh/dW363nS3h9WHdTGT5M8HGGCwpe0uCiCpd1/GKBrzb4csWvd7jBwFscvMmC2zy80cRbXbzZhtt9fOB4wMiDD1342PeAwRMffR8wfA8b/38APxSpLYkXAfkAAAAASUVORK5CYII="
                  />
                </div>
              </div>
              <div class="center-align row">
                <button id="watchlist-save" class="btn btn-ui waves-effect waves-light" type="button" name="action">Save List &#9658;</button>
              </div>
              <div class="center-align row">
                <button id="watchlist-open" class="btn btn-ui waves-effect waves-light" type="button" name="action">Load List &#9658;</button>
                <input id="watchlist-file" type="file" name="files[]" style="display: none;" />
              </div>
            </div>
          </div>
        </div>
        <div id="info-overlay-menu" class="start-hidden text-select">
          <div id="info-overlay-content"></div>
        </div>
      `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-watchlist" class="bmenu-item">
          <img
            alt="watchlist"
            src="data:image/png;base64,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"
          />
          <span class="bmenu-title">Watchlist</span>
          <div class="status-icon"></div>
        </div>    
        <div id="menu-info-overlay" class="bmenu-item bmenu-item-disabled">
          <img
            alt="info"
            src="data:image/png;base64,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"
          />
          <span class="bmenu-title">Overlay</span>
          <div class="status-icon"></div>
        </div>
      `);

      $('#watchlist-menu').resizable({
        handles: 'e',
        stop: function () {
          $(this).css('height', '');
        },
        maxWidth: 450,
        minWidth: 280,
      });

      $('.menu-selectable').on('click', function () {
        if (watchlistList.length > 0) {
          $('#menu-info-overlay').removeClass('bmenu-item-disabled');
        }
      });

      $('#info-overlay-content').on('click', '.watchlist-object', function (evt) {
        var objNum = evt.currentTarget.textContent.split(':');
        objNum = objNum[0];
        var satId = satSet.getIdFromObjNum(objNum);
        if (satId !== null) {
          objectManager.setSelectedSat(satId);
        }
      });

      $('#watchlist-list').on('click', '.watchlist-remove', function () {
        var satId = $(this).data('sat-id');
        for (var i = 0; i < watchlistList.length; i++) {
          if (watchlistList[i] === satId) {
            orbitManager.removeInViewOrbit(watchlistList[i]);
            watchlistList.splice(i, 1);
            watchlistInViewList.splice(i, 1);
          }
        }
        updateWatchlist();
        if (watchlistList.length <= 0) {
          uiManager.doSearch('');
          satSet.setColorScheme(ColorScheme.default, true);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        }
        if (!sensorManager.checkSensorSelected() || watchlistList.length <= 0) {
          isWatchlistChanged = false;
          $('#menu-info-overlay').addClass('bmenu-item-disabled');
        }
      });
      // Add button selected on watchlist menu
      $('#watchlist-content').on('click', '.watchlist-add', function () {
        var satId = satSet.getIdFromObjNum(stringPad.pad0(<string>$('#watchlist-new').val(), 5));
        var duplicate = false;
        for (var i = 0; i < watchlistList.length; i++) {
          // No duplicates
          if (watchlistList[i] === satId) duplicate = true;
        }
        if (!duplicate) {
          watchlistList.push(satId);
          watchlistInViewList.push(false);
          updateWatchlist();
        }
        if (sensorManager.checkSensorSelected()) {
          $('#menu-info-overlay').removeClass('bmenu-item-disabled');
        }
        $('#watchlist-new').val(''); // Clear the search box after enter pressed/selected
      });
      // Enter pressed/selected on watchlist menu
      $('#watchlist-content').on('submit', function (e) {
        var satId = satSet.getIdFromObjNum(stringPad.pad0(<string>$('#watchlist-new').val(), 5));
        var duplicate = false;
        for (var i = 0; i < watchlistList.length; i++) {
          // No duplicates
          if (watchlistList[i] === satId) duplicate = true;
        }
        if (!duplicate) {
          watchlistList.push(satId);
          watchlistInViewList.push(false);
          updateWatchlist();
        }
        if (sensorManager.checkSensorSelected()) {
          $('#menu-info-overlay').removeClass('bmenu-item-disabled');
        }
        $('#watchlist-new').val(''); // Clear the search box after enter pressed/selected
        e.preventDefault();
      });
      $('#watchlist-save').on('click', function (e) {
        var saveWatchlist = [];
        for (var i = 0; i < watchlistList.length; i++) {
          var sat = satSet.getSatExtraOnly(watchlistList[i]);
          saveWatchlist[i] = sat.SCC_NUM;
        }
        var variable = JSON.stringify(saveWatchlist);
        var blob = new Blob([variable], {
          type: 'text/plain;charset=utf-8',
        });
        saveAs(blob, 'watchlist.json');
        e.preventDefault();
      });
      $('#watchlist-open').on('click', function () {
        $('#watchlist-file').trigger('click');
      });
      $('#watchlist-file').on('change', function (evt) {
        if (!window.FileReader) return; // Browser is not compatible

        var reader = new FileReader();

        reader.onload = function (evt) {
          if (evt.target.readyState !== 2) return;
          if (evt.target.error) {
            console.log('error');
            return;
          }

          var newWatchlist = JSON.parse(<string>evt.target.result);
          watchlistInViewList = [];
          for (var i = 0; i < newWatchlist.length; i++) {
            var sat = satSet.getSatExtraOnly(satSet.getIdFromObjNum(newWatchlist[i]));
            if (sat !== null) {
              newWatchlist[i] = sat.id;
              watchlistInViewList.push(false);
            } else {
              console.error('Watchlist File Format Incorret');
              return;
            }
          }
          watchlistList = newWatchlist;
          updateWatchlist();
          if (sensorManager.checkSensorSelected()) {
            $('#menu-info-overlay').removeClass('bmenu-item-disabled');
          }
        };
        reader.readAsText((<HTMLInputElement>evt.target).files[0]);
        evt.preventDefault();
      });      
    },
  });

  const updateWatchlist = (updateWatchlistList?: any[], updateWatchlistInViewList?: any) => {
    if (typeof updateWatchlistList !== 'undefined') {
      watchlistList = updateWatchlistList;
    }
    if (typeof updateWatchlistInViewList !== 'undefined') {
      watchlistInViewList = updateWatchlistInViewList;
    }

    if (!watchlistList) return;
    settingsManager.isThemesNeeded = true;
    if (isWatchlistChanged == null) {
      isWatchlistChanged = false;
    } else {
      isWatchlistChanged = true;
    }
    var watchlistString = '';
    var watchlistListHTML = '';
    var sat;
    for (let i = 0; i < watchlistList.length; i++) {
      sat = satSet.getSatExtraOnly(watchlistList[i]);
      if (sat == null) {
        watchlistList.splice(i, 1);
        continue;
      }
      watchlistListHTML +=
        '<div class="row">' +
        '<div class="col s3 m3 l3">' +
        sat.SCC_NUM +
        '</div>' +
        '<div class="col s7 m7 l7">' +
        sat.ON +
        '</div>' +
        '<div class="col s2 m2 l2 center-align remove-icon"><img class="watchlist-remove" data-sat-id="' +
        sat.id +
        '" src="img/remove.png"></img></div>' +
        '</div>';
    }
    $('#watchlist-list').html(watchlistListHTML);
    for (let i = 0; i < watchlistList.length; i++) {
      // No duplicates
      watchlistString += satSet.getSatExtraOnly(watchlistList[i]).SCC_NUM;
      if (i !== watchlistList.length - 1) watchlistString += ',';
    }
    uiManager.doSearch(watchlistString, true);
    satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc

    var saveWatchlist = [];
    for (let i = 0; i < watchlistList.length; i++) {
      sat = satSet.getSatExtraOnly(watchlistList[i]);
      saveWatchlist[i] = sat.SCC_NUM;
    }
    var variable = JSON.stringify(saveWatchlist);
    localStorage.setItem('watchlistList', variable);
  };  
  keepTrackApi.programs.watchlist.updateWatchlist = updateWatchlist;

  var infoOverlayDOM = [];
  uiManager.updateNextPassOverlay = (isForceUpdate: any) => {
    if (nextPassArray.length <= 0 && !isInfoOverlayMenuOpen) return;
    const cameraManager = keepTrackApi.programs.cameraManager;

    // FIXME This should auto update the overlay when the time changes outside the original search window
    // Update once every 10 seconds
    if ((timeManager.now > keepTrackApi.programs.watchlist.lastOverlayUpdateTime * 1 + 10000 && objectManager.selectedSat === -1 && !cameraManager.isDragging && cameraManager.zoomLevel === cameraManager.zoomTarget) || isForceUpdate) {
      var propTime = timeManager.propTime();
      infoOverlayDOM = [];
      infoOverlayDOM.push('<div>');
      for (var s = 0; s < nextPassArray.length; s++) {
        var satInView = satSet.getSatInViewOnly(satSet.getIdFromObjNum(nextPassArray[s].SCC_NUM)).inview;
        // If old time and not in view, skip it
        if (nextPassArray[s].time - propTime < -1000 * 60 * 5 && !satInView) continue;

        // Get the pass Time
        var time = dateFormat(nextPassArray[s].time, 'isoTime', true);

        // Yellow - In View and Time to Next Pass is +/- 30 minutes
        if (satInView && nextPassArray[s].time - propTime < 1000 * 60 * 30 && propTime - nextPassArray[s].time < 1000 * 60 * 30) {
          infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: yellow">' + nextPassArray[s].SCC_NUM + ': ' + time + '</h5></div>');
          continue;
        }
        // Blue - Time to Next Pass is between 10 minutes before and 20 minutes after the current time
        // This makes recent objects stay at the top of the list in blue
        if (nextPassArray[s].time - propTime < 1000 * 60 * 10 && propTime - nextPassArray[s].time < 1000 * 60 * 20) {
          infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: blue">' + nextPassArray[s].SCC_NUM + ': ' + time + '</h5></div>');
          continue;
        }
        // White - Any future pass not fitting the above requirements
        if (nextPassArray[s].time - propTime > 0) {
          infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: white">' + nextPassArray[s].SCC_NUM + ': ' + time + '</h5></div>');
        }
      }
      infoOverlayDOM.push('</div>');
      document.getElementById('info-overlay-content').innerHTML = infoOverlayDOM.join('');
      keepTrackApi.programs.watchlist.lastOverlayUpdateTime = timeManager.now;
    }
  };

  keepTrackApi.register({
    method: 'updateLoop',
    cbName: 'watchlist',
    cb: () => {
      uiManager.updateNextPassOverlay();

      if (watchlistList.length <= 0) return;
      for (let i = 0; i < watchlistList.length; i++) {
        var sat = satSet.getSat(watchlistList[i]);
        if (sat.inview === 1 && watchlistInViewList[i] === false) {
          // Is inview and wasn't previously
          watchlistInViewList[i] = true;
          uiManager.toast(`Satellite ${sat.SCC_NUM} is In Field of View!`, 'normal');
          keepTrackApi.programs.lineManager.create('sat3', [sat.id, satSet.getIdFromSensorName(sensorManager.currentSensor.name)], 'g');
          orbitManager.addInViewOrbit(watchlistList[i]);
        }
        if (sat.inview === 0 && watchlistInViewList[i] === true) {
          // Isn't inview and was previously
          watchlistInViewList[i] = false;
          uiManager.toast(`Satellite ${sat.SCC_NUM} left Field of View!`, 'standby');
          orbitManager.removeInViewOrbit(watchlistList[i]);
        }
      }
      for (let i = 0; i < watchlistInViewList.length; i++) {
        if (watchlistInViewList[i] === true) {
          return;
        }
      }
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'watchlist',
    cb: (iconName: string): void => {
      if (iconName === 'menu-info-overlay') {
        if (!sensorManager.checkSensorSelected()) {
          // No Sensor Selected
          uiManager.toast(`Select a Sensor First!`, 'caution', true);
          if (!$('#menu-info-overlay:animated').length) {
            $('#menu-info-overlay').effect('shake', {
              distance: 10,
            });
          }
          return;
        }
        if (isInfoOverlayMenuOpen) {
          isInfoOverlayMenuOpen = false;
          uiManager.hideSideMenus();
          return;
        } else {
          if (watchlistList.length === 0 && !isWatchlistChanged) {
            uiManager.toast(`Add Satellites to Watchlist!`, 'caution');
            if (!$('#menu-info-overlay:animated').length) {
              $('#menu-info-overlay').effect('shake', {
                distance: 10,
              });
            }
            nextPassArray = [];
            return;
          }
          uiManager.hideSideMenus();
          if (nextPassArray.length === 0 || nextPassEarliestTime > timeManager.now || new Date(nextPassEarliestTime * 1 + 1000 * 60 * 60 * 24) < timeManager.now || isWatchlistChanged) {
            $('#loading-screen').fadeIn(1000, function () {
              nextPassArray = [];
              for (var x = 0; x < watchlistList.length; x++) {
                nextPassArray.push(satSet.getSatExtraOnly(watchlistList[x]));
              }
              nextPassArray = satellite.nextpassList(nextPassArray);
              nextPassArray.sort(function (a: { time: string | number | Date }, b: { time: string | number | Date }) {
                return new Date(a.time).getTime() - new Date(b.time).getTime();
              });
              nextPassEarliestTime = timeManager.now;
              keepTrackApi.programs.watchlist.lastOverlayUpdateTime = 0;
              uiManager.updateNextPassOverlay(true);
              $('#loading-screen').fadeOut('slow');
              isWatchlistChanged = false;
            });
          } else {
            uiManager.updateNextPassOverlay(true);
          }

          $('#info-overlay-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-info-overlay').addClass('bmenu-item-selected');
          isInfoOverlayMenuOpen = true;
          return;
        }
      }
      if (iconName === 'menu-watchlist') {
        if (isWatchlistMenuOpen) {
          isWatchlistMenuOpen = false;
          $('#menu-watchlist').removeClass('bmenu-item-selected');
          // $('#search-holder').hide();
          uiManager.hideSideMenus();
          return;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#watchlist-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          // uiManager.searchToggle(true);
          updateWatchlist();
          isWatchlistMenuOpen = true;
          $('#menu-watchlist').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'onCruncherReady',
    cbName: 'watchlist',
    cb: () => {
      let watchlistJSON;
      try {
        watchlistJSON = localStorage.getItem('watchlistList');
      } catch (e) {
        watchlistJSON = null;
      }
      if (watchlistJSON !== null) {
        let newWatchlist = JSON.parse(watchlistJSON);
        let watchlistInViewList = [];
        for (let i = 0; i < newWatchlist.length; i++) {
          let sat = satSet.getSatExtraOnly(satSet.getIdFromObjNum(newWatchlist[i]));
          if (sat !== null) {
            newWatchlist[i] = sat.id;
            watchlistInViewList.push(false);
          } else {
            console.error('Watchlist File Format Incorret');
            return;
          }
        }
        if (sensorManager.checkSensorSelected() && newWatchlist.length > 0) {
          $('#menu-info-overlay').removeClass('bmenu-item-disabled');
        }
        updateWatchlist(newWatchlist, watchlistInViewList);
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'watchlist',
    cb: (): void => {
      $('#watchlist-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#info-overlay-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-info-overlay').removeClass('bmenu-item-selected');
      $('#menu-watchlist').removeClass('bmenu-item-selected');
      isInfoOverlayMenuOpen = false;
      isWatchlistMenuOpen = false;
    },
  });
};
