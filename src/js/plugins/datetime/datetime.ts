import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';
export const init = (): void => {
  const { settingsManager, timeManager, satSet, uiManager } = keepTrackApi.programs;  
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'datetime',
    cb: () => {
      // Bottom Icon
      $('#nav-wrapper').append(keepTrackApi.html`
        <ul id="nav-mobile">
          <li id="jday"></li>
          <div id="datetime" class="tooltipped" data-position="top" data-delay="50" data-tooltip="Time Menu">
            <div id="datetime-text">Placeholder Text</div>
            <div id="datetime-input">
              <form id="datetime-input-form">
                <input type="text" id="datetime-input-tb" readonly="true" />
              </form>
            </div>
          </div>
        </ul>
      `);

      $('#datetime-text').on('click', () => {
        timeManager.propRealTime = Date.now();
        timeManager.propTime();
        keepTrackApi.methods.updateDateTime(new Date(timeManager.propRealTime + timeManager.propOffset));
      });

      $('#datetime-input-form').on('change', function (e) {
        let selectedDate = $('#datetime-input-tb').datepicker('getDate');
        let today = new Date();
        let jday = timeManager.getDayOfYear(timeManager.propTime());
        $('#jday').html(jday);
        timeManager.propOffset = selectedDate.getTime() - today.getTime();
        satSet.satCruncher.postMessage({
          typ: 'offset',
          dat: timeManager.propOffset.toString() + ' ' + (1.0).toString(),
        });
        timeManager.propRealTime = Date.now();
        timeManager.propTime();
        // Reset last update times when going backwards in time
        settingsManager.lastBoxUpdateTime = timeManager.now;

        // TODO: Migrate to watchlist.ts
        try {
          keepTrackApi.programs.watchlist.lastOverlayUpdateTime = timeManager.now * 1 - 7000;
          uiManager.updateNextPassOverlay(true);
        } catch {
          // Ignore
        }

        // satSet.findRadarDataFirstDataTime();

        e.preventDefault();
      });

      // Initialize the date/time picker
      (<any>$('#datetime-input-tb'))
        .datetimepicker({
          dateFormat: 'yy-mm-dd',
          timeFormat: 'HH:mm:ss',
          timezone: '+0000',
          gotoCurrent: true,
          addSliderAccess: true,
          // minDate: -14, // No more than 7 days in the past
          // maxDate: 14, // or 7 days in the future to make sure ELSETs are valid
          sliderAccessArgs: { touchonly: false },
        })
        .on('change.dp', function () {
          // This code gets called when the done button is pressed or the time sliders are closed
          $('#datetime-input').fadeOut();
          // TODO: Migrate to watchlist.ts
          try {
            uiManager.updateNextPassOverlay(true);
          } catch {
            // Intentionally ignored
          }
          settingsManager.isEditTime = false;
        });

      $('#datetime-text').on('click', function () {
        if (!settingsManager.isEditTime) {
          // $('#datetime-text').fadeOut();
          $('#datetime-input').fadeIn();
          $('#datetime-input-tb').trigger('focus');
          settingsManager.isEditTime = true;
        }
      });
    },
  });

  keepTrackApi.register({
    method: 'updateDateTime',
    cbName: 'datetime',
    cb: (date: Date) => {
      $('#datetime-input-tb').datepicker('setDate', date);
    },
  });
};
