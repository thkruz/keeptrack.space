import { keepTrackContainer } from '@app/js/container';
import { Singletons, UiManager } from '@app/js/interfaces';
import { isThisNode, keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { getDayOfYear } from '@app/js/lib/transforms';
import { StandardColorSchemeManager } from '@app/js/singletons/color-scheme-manager';
import { TimeManager } from '@app/js/singletons/time-manager';
import { UrlManager } from '@app/js/static/url-manager';
import $ from 'jquery';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { TopMenu } from '../top-menu/top-menu';
import { WatchlistOverlay } from '../watchlist/watchlist-overlay';

export class DateTimeManager extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Top Menu';
  dependencies = [TopMenu.PLUGIN_NAME];
  isEditTimeOpen = false;
  divContainerId = 'datetime';
  dateTimeInputTbId = 'datetime-input-tb';
  constructor() {
    super(DateTimeManager.PLUGIN_NAME);
  }

  init(): void {
    super.init();

    keepTrackApi.register({
      method: 'uiManagerInit',
      cbName: 'datetime',
      cb: this.uiManagerInit.bind(this),
    });

    keepTrackApi.register({
      method: 'uiManagerFinal',
      cbName: 'datetime',
      cb: this.uiManagerFinal.bind(this),
    });

    keepTrackApi.register({
      method: 'updateDateTime',
      cbName: 'datetime',
      cb: this.updateDateTime.bind(this),
    });
  }

  updateDateTime(date: Date) {
    const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);
    const dateTimeInputTbDOM = $(`#${this.dateTimeInputTbId}`);
    // TODO: remove this check when jest is fixed
    if (dateTimeInputTbDOM && !isThisNode()) {
      dateTimeInputTbDOM.datepicker('setDate', date);
    }
    timeManagerInstance.synchronize();
    UrlManager.updateURL();
  }

  datetimeTextClick(): void {
    keepTrackApi.methods.updateDateTime(new Date(keepTrackApi.getTimeManager().simulationTimeObj));

    if (!this.isEditTimeOpen) {
      const datetimeInput = document.getElementById('datetime-input');
      const datetimeInputTb = document.getElementById(this.dateTimeInputTbId);
      if (datetimeInput && datetimeInputTb) {
        datetimeInput.style.display = 'block';
        datetimeInputTb.focus();
        this.isEditTimeOpen = true;
      }
    }
  }

  uiManagerInit() {
    const NavWrapper = getEl('nav-wrapper');
    NavWrapper &&
      NavWrapper.insertAdjacentHTML(
        'beforeend',
        keepTrackApi.html`
          <ul id="nav-mobile">
            <li id="jday"></li>
            <div id="${this.divContainerId}" class="tooltipped" data-position="bottom" data-delay="50" data-tooltip="Time Menu">
              <div id="datetime-text">Placeholder Text</div>
              <div id="datetime-input">
                <form id="datetime-input-form">
                  <input type="text" id="${this.dateTimeInputTbId}" readonly="true" />
                </form>
              </div>
            </div>
          </ul>
          `
      );
  }

  uiManagerFinal() {
    getEl('datetime-text').addEventListener('click', this.datetimeTextClick.bind(this));

    $('#datetime-input-form').on('change', (e: Event) => {
      this.datetimeInputFormChange();
      e.preventDefault();
    });

    const that = this;
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
        if (that.isEditTimeOpen) {
          getEl('datetime-input').style.display = 'none';
          that.isEditTimeOpen = false;

          // TODO: Migrate to watchlist.ts
          try {
            const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
            uiManagerInstance.updateNextPassOverlay(true);
          } catch {
            // Intentionally ignored
          }
        }
      });
  }

  datetimeInputFormChange(jestOverride?: Date) {
    const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);
    const colorSchemeManagerInstance = keepTrackContainer.get<StandardColorSchemeManager>(Singletons.ColorSchemeManager);

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
      const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
      uiManagerInstance.updateNextPassOverlay(true);
    } catch {
      // Ignore
    }

    // TODO: Planned feature
    // radarDataManager.findFirstDataTime();
  }
}

export const dateTimeManagerPlugin = new DateTimeManager();
