import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { settingsManager } from '@app/settings/settings';
import { Milliseconds } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { TopMenu } from '../top-menu/top-menu';
import { Calendar } from './calendar';

export class DateTimeManager extends KeepTrackPlugin {
  readonly id = 'DateTimeManager';
  dependencies_ = [TopMenu.name];
  isEditTimeOpen = false;
  private readonly dateTimeContainerId_ = 'datetime';
  private readonly dateTimeInputTbId_ = 'datetime-input-tb';
  private iText: number | null = null;
  private simulationTimeSerialized_: string | null = null;
  /** Reusable empty text string to reduce garbage collection */
  private readonly timeTextStrEmpty_ = '' as const;
  timeTextStr: string = '';
  isCreateClockDOMOnce_ = false;
  dateDOM: HTMLElement | null = null;
  /** Time in Milliseconds the last time sim time was updated */
  private lastTime = 0 as Milliseconds;
  calendar: Calendar;

  init(): void {
    super.init();

    EventBus.getInstance().on(EventBusEvent.uiManagerInit, this.uiManagerInit.bind(this));
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal.bind(this));
    EventBus.getInstance().on(EventBusEvent.updateDateTime, this.updateDateTime.bind(this));
    EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => this.updateDateTime(ServiceLocator.getTimeManager().simulationTimeObj));
    EventBus.getInstance().on(EventBusEvent.selectedDateChange, (date: Date) => this.updateDateTime(date));
  }

  updateDateTime(date: Date) {
    const dateTimeInputTb = document.getElementById(this.dateTimeInputTbId_) as HTMLInputElement;

    if (dateTimeInputTb && !isThisNode()) {
      dateTimeInputTb.value = date.toISOString().split('T')[0]; // Format the date as yyyy-mm-dd
    }

    //  Jday isn't initalized right away, so we need to check if it exists
    if (!getEl('jday', true)) {
      return;
    }

    if (settingsManager.isUseJdayOnTopMenu) {
      const jday = ServiceLocator.getTimeManager().getUTCDayOfYear(ServiceLocator.getTimeManager().simulationTimeObj);

      getEl('jday')!.innerHTML = jday.toString();
    } else {
      getEl('jday')!.innerHTML = ServiceLocator.getTimeManager().simulationTimeObj.toLocaleDateString();
    }

    const timeManagerInstance = ServiceLocator.getTimeManager();

    if (!this.simulationTimeSerialized_ || Math.abs(this.lastTime - timeManagerInstance.simulationTimeObj.getTime()) > (1000 as Milliseconds)) {
      this.simulationTimeSerialized_ = timeManagerInstance.simulationTimeObj.toJSON();
      this.timeTextStr = this.timeTextStrEmpty_;
      for (this.iText = 11; this.iText < 20; this.iText++) {
        if (this.iText > 11) {
          this.timeTextStr += this.simulationTimeSerialized_[this.iText - 1];
        }
      }

      this.lastTime = timeManagerInstance.simulationTimeObj.getTime() as Milliseconds;
    }

    // Avoid race condition
    if (!this.dateDOM) {
      try {
        this.dateDOM = getEl('datetime-text');
        if (!this.dateDOM) {
          return;
        }
      } catch {
        errorManagerInstance.debug('Date DOM not found');

        return;
      }
    }

    if (!settingsManager.disableUI) {
      const datetimeTextElement = getEl('datetime-text', true);

      if (!datetimeTextElement) {
        errorManagerInstance.debug('Datetime text element not found');

        return;
      }

      if (!this.isCreateClockDOMOnce_ || datetimeTextElement.childNodes.length === 0) {
        datetimeTextElement.innerText = this.timeTextStr;
        this.isCreateClockDOMOnce_ = true;
      } else {
        datetimeTextElement.childNodes[0].nodeValue = this.timeTextStr;
      }
    }

    // textContent doesn't remove the Node! No unecessary DOM changes everytime time updates.
    this.dateDOM.textContent = this.timeTextStr;
  }

  datetimeTextClick(): void {
    const simulationDateObj = new Date(ServiceLocator.getTimeManager().simulationTimeObj);
    const timeManagerInstance = ServiceLocator.getTimeManager();

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
      html`
        <div id="nav-top-left">
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
            const uiManagerInstance = ServiceLocator.getUiManager();

            uiManagerInstance.updateNextPassOverlay(true);
          } catch {
            // Intentionally ignored
          }
        }
      });
    }
  }
}
