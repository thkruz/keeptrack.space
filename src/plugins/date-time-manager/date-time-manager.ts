import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { getDayOfYear } from '@app/lib/transforms';
import { isThisNode } from '@app/static/isThisNode';
import { UrlManager } from '@app/static/url-manager';
import $ from 'jquery';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { TopMenu } from '../top-menu/top-menu';
import { WatchlistOverlay } from '../watchlist/watchlist-overlay';

export class DateTimeManager extends KeepTrackPlugin {
  dependencies_ = [TopMenu.name];
  isEditTimeOpen = false;
  divContainerId = 'datetime';
  dateTimeInputTbId = 'datetime-input-tb';

  init(): void {
    super.init();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: this.constructor.name,
      cb: this.uiManagerInit.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.constructor.name,
      cb: this.uiManagerFinal.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.updateDateTime,
      cbName: this.constructor.name,
      cb: this.updateDateTime.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.updateSelectBox,
      cbName: this.constructor.name,
      cb: () => {
        const jday = getDayOfYear(keepTrackApi.getTimeManager().simulationTimeObj);

        getEl('jday').innerHTML = jday.toString();
      },
    });
  }

  updateDateTime(date: Date) {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const dateTimeInputTbDOM = $(`#${this.dateTimeInputTbId}`);
    // TODO: remove this check when jest is fixed

    if (dateTimeInputTbDOM && !isThisNode()) {
      dateTimeInputTbDOM.datepicker('setDate', date);
    }
    timeManagerInstance.synchronize();
    UrlManager.updateURL();
  }

  datetimeTextClick(): void {
    keepTrackApi.runEvent(KeepTrackApiEvents.updateDateTime, new Date(keepTrackApi.getTimeManager().simulationTimeObj));

    if (!this.isEditTimeOpen) {
      const datetimeInput = getEl('datetime-input');
      const datetimeInputTb = getEl(this.dateTimeInputTbId);

      if (datetimeInput && datetimeInputTb) {
        datetimeInput.style.display = 'block';
        datetimeInputTb.focus();
        this.isEditTimeOpen = true;
      }
    }
  }

  uiManagerInit() {
    const NavWrapper = getEl('nav-wrapper');

    NavWrapper?.insertAdjacentHTML(
      'afterbegin',
      keepTrackApi.html`
          <div id="nav-mobile">
            <div id="jday"></div>
            <div id="${this.divContainerId}">
              <div id="datetime-text" class="waves-effect waves-light">Placeholder Text</div>
              <div id="datetime-input">
                <form id="datetime-input-form">
                  <input type="text" id="${this.dateTimeInputTbId}" readonly="true" />
                </form>
              </div>
            </div>
        </div>
          `,
    );
  }

  uiManagerFinal() {
    if (!settingsManager.plugins.topMenu) {
      return;
    }

    getEl('datetime-text').addEventListener('click', this.datetimeTextClick.bind(this));

    $('#datetime-input-form').on('change', (e: Event) => {
      this.datetimeInputFormChange();
      e.preventDefault();
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    // Initialize the date/time picker

    // TODO: remove this check when jest is fixed
    if (isThisNode()) {
      return;
    }

    (<any>$('#datetime-input-tb'))
      .datetimepicker({
        dateFormat: 'yy-mm-dd',
        timeFormat: 'HH:mm:ss',
        timezone: '+0000',
        gotoCurrent: true,
        addSliderAccess: true,
        /*
         * minDate: -14, // No more than 7 days in the past
         * maxDate: 14, // or 7 days in the future to make sure ELSETs are valid
         */
        sliderAccessArgs: { touchonly: false },
      })
      .on('change.dp', () => {
        // This code gets called when the done button is pressed or the time sliders are closed
        if (that.isEditTimeOpen) {
          getEl('datetime-input').style.display = 'none';
          setTimeout(() => {
            that.isEditTimeOpen = false;
          }, 500);

          // TODO: Migrate to watchlist.ts
          try {
            const uiManagerInstance = keepTrackApi.getUiManager();

            uiManagerInstance.updateNextPassOverlay(true);
          } catch {
            // Intentionally ignored
          }
        }
      });
  }

  datetimeInputFormChange(jestOverride?: Date) {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    let selectedDate: Date;

    if (!jestOverride) {
      selectedDate = $(`#${this.dateTimeInputTbId}`).datepicker('getDate');
    } else {
      selectedDate = jestOverride;
    }
    const today = new Date();
    const jday = getDayOfYear(timeManagerInstance.simulationTimeObj);

    getEl('jday').innerHTML = jday.toString();
    timeManagerInstance.changeStaticOffset(selectedDate.getTime() - today.getTime());
    colorSchemeManagerInstance.setColorScheme(settingsManager.currentColorScheme, true);
    timeManagerInstance.calculateSimulationTime();
    // Reset last update times when going backwards in time
    timeManagerInstance.lastBoxUpdateTime = timeManagerInstance.realTime;

    // TODO: Migrate to watchlist.ts
    try {
      (<WatchlistOverlay>keepTrackApi.getPlugin(WatchlistOverlay)).lastOverlayUpdateTime = timeManagerInstance.realTime * 1 - 7000;
      const uiManagerInstance = keepTrackApi.getUiManager();

      uiManagerInstance.updateNextPassOverlay(true);
    } catch {
      // Ignore
    }
  }
}
