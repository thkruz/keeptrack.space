import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { isThisNode } from '@app/static/isThisNode';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { TopMenu } from '../top-menu/top-menu';
import { Calendar } from './calendar';

export class DateTimeManager extends KeepTrackPlugin {
  readonly id = 'DateTimeManager';
  dependencies_ = [TopMenu.name];
  isEditTimeOpen = false;
  private readonly dateTimeContainerId_ = 'datetime';
  private readonly dateTimeInputTbId_ = 'datetime-input-tb';
  calendar: Calendar;

  init(): void {
    super.init();

    keepTrackApi.on(KeepTrackApiEvents.uiManagerInit, this.uiManagerInit.bind(this));
    keepTrackApi.on(KeepTrackApiEvents.uiManagerFinal, this.uiManagerFinal.bind(this));
    keepTrackApi.on(KeepTrackApiEvents.updateDateTime, this.updateDateTime.bind(this));
    keepTrackApi.on(KeepTrackApiEvents.onKeepTrackReady, () => this.updateDateTime(keepTrackApi.getTimeManager().simulationTimeObj));
  }

  updateDateTime(date: Date) {
    const dateTimeInputTb = document.getElementById(this.dateTimeInputTbId_) as HTMLInputElement;

    if (dateTimeInputTb && !isThisNode()) {
      dateTimeInputTb.value = date.toISOString().split('T')[0]; // Format the date as yyyy-mm-dd
    }

    //  Jday isn't initalized right away, so we need to check if it exists
    if (!getEl('jday')) {
      return;
    }

    if (settingsManager.isUseJdayOnTopMenu) {
      const jday = keepTrackApi.getTimeManager().getUTCDayOfYear(keepTrackApi.getTimeManager().simulationTimeObj);

      getEl('jday')!.innerHTML = jday.toString();
    } else {
      getEl('jday')!.innerHTML = keepTrackApi.getTimeManager().simulationTimeObj.toLocaleDateString();
    }
  }

  datetimeTextClick(): void {
    const simulationDateObj = new Date(keepTrackApi.getTimeManager().simulationTimeObj);
    const timeManagerInstance = keepTrackApi.getTimeManager();

    timeManagerInstance.synchronize();

    this.updateDateTime(simulationDateObj);
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
    if (!settingsManager.plugins.TopMenu) {
      return;
    }

    const NavWrapper = getEl('nav-wrapper');
    // Remove the styling from nav-wrapper

    if (NavWrapper) {
      NavWrapper.style = '';
    }

    this.calendar = new Calendar('datetime-input-form');

    document.getElementById('datetime-text')?.addEventListener('click', this.datetimeTextClick.bind(this));

    const datetimeInputTb = document.getElementById(this.dateTimeInputTbId_);

    if (datetimeInputTb && !isThisNode()) {
      datetimeInputTb.addEventListener('change', () => {
        if (this.isEditTimeOpen) {
          // const datetimeInputElement = document.getElementById('datetime-input');

          /*
           * TODO: Why was this originally !datetimeInputElement???
           * if (datetimeInputElement) {
           * datetimeInputElement.style.display = 'none';
           * }
           */
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
