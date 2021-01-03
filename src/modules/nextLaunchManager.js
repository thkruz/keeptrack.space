/* */

import * as $ from 'jquery';
import { dateFormat } from '@app/js/lib/dateFormat.js';
import { settingsManager } from '@app/js/settings.js';

let nextLaunchManager = {};
(function () {
  if (settingsManager.offline) {
    $('#menu-nextLaunch').hide();
    return;
  }
  nextLaunchManager.launchList = [];
  nextLaunchManager.init = () => {
    $.get('https://launchlibrary.net/1.4/launch/next/20').done(function (resp) {
      for (let i = 0; i < resp.launches.length; i++) {
        let launchInfo = {};
        launchInfo.name = typeof resp.launches[i].name != 'undefined' ? resp.launches[i].name : 'Unknown';
        launchInfo.updated = new Date(resp.launches[i].changed);
        launchInfo.windowStart = new Date(resp.launches[i].wsstamp * 1000); // sec to ms
        launchInfo.windowEnd = new Date(resp.launches[i].westamp * 1000); //sec to ms
        launchInfo.location = resp.launches[i].location.name.split(',', 1);
        launchInfo.location = launchInfo.location[0];
        launchInfo.locationURL = resp.launches[i].location.pads[0].wikiURL;
        if (typeof resp.launches[i].lsp != 'undefined') {
          launchInfo.agency = typeof resp.launches[i].lsp.name != 'undefined' ? resp.launches[i].lsp.name : 'Unknown';
          launchInfo.country = typeof resp.launches[i].lsp.countryCode != 'undefined' ? resp.launches[i].lsp.countryCode : 'Unknown';
          launchInfo.agencyURL = typeof resp.launches[i].lsp.wikiURL != 'undefined' ? resp.launches[i].lsp.wikiURL : 'Unknown';
        } else {
          launchInfo.agency = 'Unknown';
          launchInfo.country = 'UNK';
          launchInfo.agencyURL = '';
        }
        if (typeof resp.launches[i].missions[0] != 'undefined') {
          launchInfo.mission = resp.launches[i].missions[0].description;
          launchInfo.missionName = resp.launches[i].missions[0].name;
          launchInfo.missionType = resp.launches[i].missions[0].typeName;
          launchInfo.missionURL = resp.launches[i].missions[0].wikiURL;
        }
        launchInfo.rocket = resp.launches[i].rocket.name;
        launchInfo.rocketConfig = resp.launches[i].rocket.configuration;
        launchInfo.rocketFamily = resp.launches[i].rocket.familyname;
        launchInfo.rocketURL = resp.launches[i].rocket.wikiURL;
        nextLaunchManager.launchList[i] = launchInfo;
      }
    });
  };
  nextLaunchManager.showTable = function () {
    let tbl = document.getElementById('nextLaunch-table'); // Identify the table to update

    // Only needs populated once
    if (tbl.innerHTML == '') _initTable();

    var _initTable = () => {
      let launchList = nextLaunchManager.launchList;

      let tr = tbl.insertRow();
      let tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode('Launch Window'));
      tdT.setAttribute('style', 'text-decoration: underline; width: 120px;');
      let tdN = tr.insertCell();
      tdN.appendChild(document.createTextNode('Mission'));
      tdN.setAttribute('style', 'text-decoration: underline; width: 140px;');
      let tdL = tr.insertCell();
      tdL.appendChild(document.createTextNode('Location'));
      tdL.setAttribute('style', 'text-decoration: underline');
      let tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode('Agency'));
      tdA.setAttribute('style', 'text-decoration: underline');
      let tdC = tr.insertCell();
      tdC.appendChild(document.createTextNode('Country'));
      tdC.setAttribute('style', 'text-decoration: underline');

      for (let i = 0; i < launchList.length; i++) {
        let tr = tbl.insertRow();

        // Time Cells
        let tdT = tr.insertCell();
        let timeText;
        if (launchList[i].windowStart <= Date.now() - 1000 * 60 * 60 * 24) {
          timeText = 'TBD';
        } else {
          timeText = dateFormat(launchList[i].windowStart, 'isoDateTime', true) + ' UTC';
        }
        tdT.appendChild(document.createTextNode(timeText));

        // Name Cells
        let tdN = tr.insertCell();

        // Mission Name Text
        let nameText = typeof launchList[i].missionName != 'undefined' ? launchList[i].missionName : 'Unknown';
        // Mission Name HTML Setup
        let nameHTML;
        if (typeof launchList[i].missionURL == 'undefined' || launchList[i].missionURL == '') {
          nameHTML = `${_truncateString(nameText, 15)}`;
        } else {
          nameHTML = `<a class='iframe' href="${launchList[i].missionURL}">${_truncateString(nameText, 15)}</a>`;
        }

        // Rocket Name HTML Setup
        let rocketHTML;
        if (typeof launchList[i].rocketURL == 'undefined') {
          rocketHTML = `${launchList[i].rocket}`;
        } else {
          rocketHTML = `<a class='iframe' href="${launchList[i].rocketURL}">${launchList[i].rocket}</a>`;
        }

        // Set Name and Rocket HTML
        tdN.innerHTML = `${nameHTML}<br />${rocketHTML}`;

        // Location Name HTML Setup
        let locationHTML;
        if (typeof launchList[i].locationURL == 'undefined' || launchList[i].locationURL == '') {
          locationHTML = `${_truncateString(launchList[i].location, 25)}`;
        } else {
          if (window.location.protocol === 'http:') {
            locationHTML = `<a class='iframe' href="http://${launchList[i].locationURL}">${_truncateString(launchList[i].location, 25)}</a>`;
          } else {
            locationHTML = `<a class='iframe' href="https://${launchList[i].locationURL}">${_truncateString(launchList[i].location, 25)}</a>`;
          }
        }

        let tdL = tr.insertCell();
        tdL.innerHTML = locationHTML;

        // Agency Name HTML Setup
        let agencyHTML;
        if (typeof launchList[i].agencyURL == 'undefined') {
          agencyHTML = `${_truncateString(launchList[i].agency, 30)}`;
        } else {
          if (window.location.protocol === 'http:') {
            agencyHTML = `<a class='iframe' href="http://${launchList[i].agencyURL}">${_truncateString(launchList[i].agency, 30)}</a>`;
          } else {
            agencyHTML = `<a class='iframe' href="https://${launchList[i].agencyURL}">${_truncateString(launchList[i].agency, 30)}</a>`;
          }
        }

        let tdA = tr.insertCell();
        tdA.innerHTML = agencyHTML;

        // Country Cell
        let tdC = tr.insertCell();
        tdC.innerHTML = `<span class="badge dark-blue-badge" data-badge-caption="${launchList[i].country}"></span>`;
      }
      $('a.iframe').colorbox({
        iframe: true,
        width: '80%',
        height: '80%',
        fastIframe: false,
        closeButton: false,
      });
    };
    var _truncateString = (str, num) => {
      if (typeof str == 'undefined') return 'Unknown';

      // If the length of str is less than or equal to num
      // just return str--don't truncate it.
      if (str.length <= num) {
        return str;
      }
      // Return str truncated with '...' concatenated to the end of str.
      return str.slice(0, num) + '...';
    };
  };
})();

export { nextLaunchManager };
