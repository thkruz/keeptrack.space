import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  const { orbitManager, settingsManager, groupsManager, satSet, ColorScheme, searchBox } = keepTrackApi.programs;
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'timeMachine',
    cb: () => {
      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-time-machine" class="bmenu-item">
          <img alt="time-machine" src="" delayedsrc="data:image/png;base64,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">
          <span class="bmenu-title">Time Machine</span>
          <div class="status-icon"></div>
        </div>
      `);

      $('#time-machine-icon').on('click', function () {
        if ($('#time-machine-menu').css('display') === 'block') {
          $('#time-machine-menu').hide();
        } else {
          $('#time-machine-menu').show();
          searchBox.hideResults();
          $('#search-results').hide();
        }
      });
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'timeMachine',
    cb: (iconName: string): void => {
      if (iconName === 'menu-time-machine') {
        if (orbitManager.isTimeMachineRunning) {
          // Merge to one variable?
          orbitManager.isTimeMachineRunning = false;
          orbitManager.isTimeMachineVisible = false;

          settingsManager.colors.transparent = orbitManager.tempTransColor;
          groupsManager.clearSelect();
          satSet.setColorScheme(ColorScheme.default, true); // force color recalc

          $('#menu-time-machine').removeClass('bmenu-item-selected');
          return;
        } else {
          // Merge to one variable?
          orbitManager.isTimeMachineRunning = true;
          orbitManager.isTimeMachineVisible = true;
          $('#menu-time-machine').addClass('bmenu-item-selected');
          orbitManager.historyOfSatellitesPlay();
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'orbitManagerInit',
    cbName: 'timeMachine',
    cb: (): void => {
      const groupsManager = keepTrackApi.programs.groupsManager;
      orbitManager.playNextSatellite = (runCount: number, year: number) => {
        if (!orbitManager.isTimeMachineVisible) return;
        // Kill all old async calls if run count updates
        if (runCount !== orbitManager.historyOfSatellitesRunCount) return;
        let yearGroup = groupsManager.createGroup('yearOrLess', year);
        // groupsManager.selectGroupNoOverlay(yearGroup);
        groupsManager.selectGroup(yearGroup, orbitManager);
        yearGroup.updateOrbits(orbitManager, orbitManager);
        satSet.setColorScheme(ColorScheme.group, true); // force color recalc
        if (year >= 59 && year < 100) {
          M.toast({ html: `Time Machine In Year 19${year}!` });
        } else {
          let yearStr = year < 10 ? `0${year}` : `${year}`;
          M.toast({ html: `Time Machine In Year 20${yearStr}!` });
        }

        if (year == parseInt(new Date().getUTCFullYear().toString().slice(2, 4))) {
          setTimeout(function () {
            if (runCount !== orbitManager.historyOfSatellitesRunCount) return;
            if (!orbitManager.isTimeMachineVisible) return;
            settingsManager.colors.transparent = orbitManager.tempTransColor;
            orbitManager.isTimeMachineRunning = false;
            groupsManager.clearSelect();
            satSet.setColorScheme(ColorScheme.default, true); // force color recalc
          }, 10000); // Linger for 10 seconds
        }
      };

      // Used to kill old async calls
      orbitManager.historyOfSatellitesRunCount = 0;
      orbitManager.historyOfSatellitesPlay = () => {
        orbitManager.historyOfSatellitesRunCount++;
        orbitManager.isTimeMachineRunning = true;
        orbitManager.tempTransColor = settingsManager.colors.transparent;
        settingsManager.colors.transparent = [0, 0, 0, 0];
        for (let yy = 0; yy <= 200; yy++) {
          let year = 59 + yy;
          if (year >= 100) year = year - 100;
          setTimeout(
            // eslint-disable-next-line no-loop-func
            function (runCount) {
              orbitManager.playNextSatellite(runCount, year);
            },
            settingsManager.timeMachineDelay * yy,
            orbitManager.historyOfSatellitesRunCount
          );
          if (year == 20) break;
        }
      };
    },
  });
};
