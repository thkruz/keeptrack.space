import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { getDayOfYear } from '@app/lib/transforms';
import { isThisNode } from '@app/static/isThisNode';
import { UrlManager } from '@app/static/url-manager';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { TopMenu } from '../top-menu/top-menu';
import { Calendar } from './calendar';

export class DateTimeManager extends KeepTrackPlugin {
  readonly id = 'DateTimeManager';
  dependencies_ = [TopMenu.name];
  isEditTimeOpen = false;
  private dateTimeContainerId_ = 'datetime';
  private dateTimeInputTbId_ = 'datetime-input-tb';
  calendar: Calendar;

  init(): void {
    super.init();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerInit,
      cbName: this.id,
      cb: this.uiManagerInit.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: this.uiManagerFinal.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.updateDateTime,
      cbName: this.id,
      cb: this.updateDateTime.bind(this),
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.updateSelectBox,
      cbName: this.id,
      cb: () => {
        const jday = getDayOfYear(keepTrackApi.getTimeManager().simulationTimeObj);

        getEl('jday').innerHTML = jday.toString();
      },
    });
  }

  updateDateTime(date: Date) {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const dateTimeInputTb = document.getElementById(this.dateTimeInputTbId_) as HTMLInputElement;

    if (dateTimeInputTb && !isThisNode()) {
      dateTimeInputTb.value = date.toISOString().split('T')[0]; // Format the date as yyyy-mm-dd
    }

    timeManagerInstance.synchronize();
    UrlManager.updateURL();
  }

  datetimeTextClick(): void {
    const simulationDateObj = new Date(keepTrackApi.getTimeManager().simulationTimeObj);

    keepTrackApi.runEvent(KeepTrackApiEvents.updateDateTime, simulationDateObj);
    this.calendar.setDate(simulationDateObj);
    this.calendar.toggleDatePicker();

    if (!this.isEditTimeOpen) {
      const datetimeInput = getEl('datetime-input');
      const datetimeInputTb = getEl(this.dateTimeInputTbId_);

      if (datetimeInput && datetimeInputTb) {
        datetimeInput.style.display = 'block';
        (datetimeInputTb as HTMLInputElement).focus();
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
          <!-- SATELIOT -->
	        <img id="sateliot-logo" src="/img/textLogoSateliot.png" alt="Sateliot" class="start-hidden">
          <img id="toggle-search-icon" src="/img/stack-grey.png" alt="Toggle Search" class="icon start-hidden">
	        <!-- END SATELIOT -->
          <div id="jday"></div>
          <div id="${this.dateTimeContainerId_}">
            <div id="datetime-text" class="waves-effect waves-light">Placeholder Text</div>
            <div id="datetime-input">
              <form id="datetime-input-form">
                <input type="text" id="${this.dateTimeInputTbId_}" readonly="true" />
              </form>
            </div>
          </div>
        </div>`,
    );
  }

  uiManagerFinal() {
    if (!settingsManager.plugins.topMenu) {
      return;
    }

    this.calendar = new Calendar('datetime-input-form');

    // SATELIOT - Commented out to avoid the click event on the datetime-text
    // document.getElementById('datetime-text')?.addEventListener('click', this.datetimeTextClick.bind(this));

    const datetimeInputTb = document.getElementById(this.dateTimeInputTbId_);

    if (datetimeInputTb && !isThisNode()) {
      datetimeInputTb.addEventListener('change', () => {
        if (this.isEditTimeOpen) {
          document.getElementById('datetime-input')!.style.display = 'none';
          setTimeout(() => {
            this.isEditTimeOpen = false;
          }, 500);

          try {
            const uiManagerInstance = keepTrackApi.getUiManager();

            uiManagerInstance.updateNextPassOverlay(true);
          } catch {
            // Intentionally ignored
          }
        }
      });
    }
  }
}
