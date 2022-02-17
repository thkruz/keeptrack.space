import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';

export const updateDateTime = (date: Date) => {
  const { timeManager } = keepTrackApi.programs;
  $('#datetime-input-tb').datepicker('setDate', date);
  timeManager.synchronize();
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'datetime',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'updateDateTime',
    cbName: 'datetime',
    cb: updateDateTime,
  });
};

export const datetimeTextClick = (): void => {
  const { timeManager } = keepTrackApi.programs;
  timeManager.calculateSimulationTime();
  keepTrackApi.methods.updateDateTime(new Date(timeManager.calculateSimulationTime()));

  if (!settingsManager.isEditTime) {
    $('#datetime-input').fadeIn();
    $('#datetime-input-tb').trigger('focus');
    settingsManager.isEditTime = true;
  }
};

export const uiManagerInit = () => {
  const { uiManager } = keepTrackApi.programs;
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

  $('#datetime-text').on('click', datetimeTextClick);

  $('#datetime-input-form').on('change', function (e: Event) {
    datetimeInputFormChange();
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
};

export const datetimeInputFormChange = (jestOverride?: Date) => {
  const { timeManager, uiManager } = keepTrackApi.programs;
  const selectedDate = $('#datetime-input-tb').datepicker('getDate') || jestOverride;
  const today = new Date();
  const jday = timeManager.getDayOfYear(timeManager.calculateSimulationTime());
  $('#jday').html(jday);
  timeManager.changeStaticOffset(selectedDate.getTime() - today.getTime());
  timeManager.calculateSimulationTime();
  // Reset last update times when going backwards in time
  settingsManager.lastBoxUpdateTime = timeManager.realTime;

  // TODO: Migrate to watchlist.ts
  try {
    keepTrackApi.programs.watchlist.lastOverlayUpdateTime = timeManager.realTime * 1 - 7000;
    uiManager.updateNextPassOverlay(true);
  } catch {
    // Ignore
  }

  // TODO: Planned feature
  // radarDataManager.findFirstDataTime();
};
