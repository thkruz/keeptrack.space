import { ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { setInnerHtml } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { WatchlistOverlay } from '../watchlist/watchlist-overlay';
import './date-time-manager.css';
import { formatUtcDateTime, parseUtcDateTime } from './parse-utc-date-time';

const dt = (key: string) => t7e(`plugins.DateTimeManager.${key}` as Parameters<typeof t7e>[0]);

export class Calendar {
  private readonly containerId: string;
  private calendarDate: Date;
  private simulationDate: Date;
  private propagationRate: number = 1;
  private isVisible: boolean = false;
  private isEscapeCancel_ = false;
  /** attachEvents() runs after every render; the container persists, so only bind its click once */
  private isContainerClickBound_ = false;

  // PropRate Slider limits
  private readonly propRateLimitMin = -20;
  private readonly propRateLimitMax = 20;

  /** Year dropdown range (Sputnik onward); the typed-entry field reaches any other year. */
  private static readonly YEAR_SELECT_MIN_ = 1957;
  private static readonly YEAR_SELECT_FUTURE_SPAN_ = 30;
  static readonly GOTO_INPUT_ID = 'calendar-datetime-input';

  constructor(containerId: string) {
    this.containerId = containerId;
    this.calendarDate = new Date();
    this.simulationDate = new Date(ServiceLocator.getTimeManager().simulationTimeObj);
  }

  private render(date?: Date): void {
    this.calendarDate = date ?? this.calendarDate;
    const container = document.getElementById(this.containerId);

    if (!container) {
      errorManagerInstance.warn(`Container with ID ${this.containerId} not found`);

      return;
    }

    const datepickerDiv = document.getElementById('ui-datepicker-div');

    if (datepickerDiv) {
      datepickerDiv.remove();
    }

    const newDatepickerDiv = document.createElement('div');

    newDatepickerDiv.id = 'ui-datepicker-div';
    newDatepickerDiv.className = 'ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all';
    newDatepickerDiv.style.display = this.isVisible ? 'block' : 'none';
    newDatepickerDiv.style.position = 'absolute';
    newDatepickerDiv.style.zIndex = '1000';

    newDatepickerDiv.innerHTML = `
      <div class="ui-datepicker-header ui-widget-header ui-helper-clearfix ui-corner-all">
        <a class="ui-datepicker-prev ui-corner-all" data-handler="prev" data-event="click" title="${dt('prev')}">
          <span class="ui-icon ui-icon-circle-triangle-w">${dt('prev')}</span>
        </a>
        <a class="ui-datepicker-next ui-corner-all" data-handler="next" data-event="click" title="${dt('next')}">
          <span class="ui-icon ui-icon-circle-triangle-e">${dt('next')}</span>
        </a>
        <div class="ui-datepicker-title">
          <select class="ui-datepicker-month browser-default" data-handler="selectMonth" data-event="change" aria-label="${dt('calendar.month')}">
            ${this.renderMonthOptions_()}
          </select>
          <select class="ui-datepicker-year browser-default" data-handler="selectYear" data-event="change" aria-label="${dt('calendar.year')}">
            ${this.renderYearOptions_()}
          </select>
        </div>
      </div>
      <div class="ui-datepicker-goto">
        <label for="${Calendar.GOTO_INPUT_ID}" class="ui-datepicker-goto-label">${dt('calendar.goTo')}</label>
        <input id="${Calendar.GOTO_INPUT_ID}" type="text" class="ui-datepicker-goto-input browser-default keyboard-priority" spellcheck="false" autocomplete="off"
          placeholder="YYYY-MM-DD HH:MM:SS" value="${formatUtcDateTime(this.simulationDate)}" kt-tooltip="${dt('calendar.goToTooltip')}" />
      </div>
      <table class="ui-datepicker-calendar">
        <thead>
          <tr>${this.renderDayHeaders()}</tr>
        </thead>
        <tbody>
          ${this.renderCalendarDays()}
        </tbody>
      </table>
      ${this.renderTimePicker()}
      <div class="ui-datepicker-buttonpane ui-widget-content">
        <button type="button" class="ui-datepicker-current ui-state-default ui-priority-secondary ui-corner-all" data-handler="today" data-event="click">
          ${dt('calendar.now')}
        </button>
        <button type="button" class="ui-datepicker-pause ui-state-default ui-priority-secondary ui-corner-all" data-handler="pause" data-event="click">
          ${dt('calendar.pause')}
        </button>
        <button type="button" class="ui-datepicker-close ui-state-default ui-priority-primary ui-corner-all" data-handler="hide" data-event="click">
          ${dt('calendar.done')}
        </button>
      </div>
    `;

    document.body.appendChild(newDatepickerDiv);
  }

  private attachEvents(): void {
    if (!this.isContainerClickBound_) {
      const container = document.querySelector(`#${this.containerId}`);

      if (container) {
        container.addEventListener('click', this.toggleDatePicker.bind(this));
        this.isContainerClickBound_ = true;
      }
    }

    const prevButton = document.querySelector('#ui-datepicker-div .ui-datepicker-prev');
    const nextButton = document.querySelector('#ui-datepicker-div .ui-datepicker-next');

    if (prevButton) {
      prevButton.addEventListener('click', this.goToPreviousMonth.bind(this));
    }

    if (nextButton) {
      nextButton.addEventListener('click', this.goToNextMonth.bind(this));
    }

    document.querySelector('#ui-datepicker-div select.ui-datepicker-month')?.addEventListener('change', (e) => {
      this.jumpToMonthYear_(parseInt((e.target as HTMLSelectElement).value, 10), this.calendarDate.getUTCFullYear());
    });
    document.querySelector('#ui-datepicker-div select.ui-datepicker-year')?.addEventListener('change', (e) => {
      this.jumpToMonthYear_(this.calendarDate.getUTCMonth(), parseInt((e.target as HTMLSelectElement).value, 10));
    });

    const gotoInput = document.getElementById(Calendar.GOTO_INPUT_ID) as HTMLInputElement | null;

    gotoInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.applyTypedDateTime_(gotoInput);
      }
      // Escape is handled by the picker-wide listener (see showDatePicker)
    });

    document.querySelectorAll('#ui-datepicker-div td[data-handler="selectDay"]').forEach((td) => {
      td.addEventListener('click', (event) => this.selectDay(event));
    });

    const nowButton = document.querySelector('#ui-datepicker-div .ui-datepicker-current');
    const pauseButton = document.querySelector('#ui-datepicker-div .ui-datepicker-pause');
    const doneButton = document.querySelector('#ui-datepicker-div .ui-datepicker-close');

    if (nowButton) {
      nowButton.addEventListener('click', this.setToNow.bind(this));
    }
    if (pauseButton) {
      if (this.propagationRate === 0) {
        pauseButton.addEventListener('click', this.playProp.bind(this));
      } else {
        pauseButton.addEventListener('click', this.pauseProp.bind(this));
      }
    }
    if (doneButton) {
      doneButton.addEventListener('click', this.hideDatePicker.bind(this));
    }

    // Attach events for time sliders
    this.attachSliderEvents('ui_tpicker_hour_slider', this.updateHour.bind(this));
    this.attachSliderEvents('ui_tpicker_minute_slider', this.updateMinute.bind(this));
    this.attachSliderEvents('ui_tpicker_second_slider', this.updateSecond.bind(this));
    this.attachSliderEvents('ui_tpicker_proprate_slider', this.updatePropRate.bind(this));

    // Attach event for time text input
    const timeInput = document.getElementById('calendar-time-input') as HTMLInputElement;

    if (timeInput) {
      timeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          timeInput.blur();
        }
      });
      timeInput.addEventListener('blur', () => {
        if (this.isEscapeCancel_) {
          this.isEscapeCancel_ = false;

          return;
        }
        this.onTextInputChange();
      });
    }

    // Attach events for time adjustment buttons
    this.attachTimeAdjustmentEvents('hour');
    this.attachTimeAdjustmentEvents('minute');
    this.attachTimeAdjustmentEvents('second');
    this.attachTimeAdjustmentEvents('rate');
  }

  private attachTimeAdjustmentEvents(unit: 'hour' | 'minute' | 'second' | 'rate'): void {
    const increaseButton = document.getElementById(`${unit}_increase`);
    const decreaseButton = document.getElementById(`${unit}_decrease`);

    if (increaseButton && decreaseButton) {
      increaseButton.addEventListener('click', () => this.adjustTime(unit, 1));
      decreaseButton.addEventListener('click', () => this.adjustTime(unit, -1));
    }
  }

  private adjustTime(unit: 'hour' | 'minute' | 'second' | 'rate', change: 1 | -1): void {
    let currentValue: number;

    if (unit === 'hour') {
      currentValue = this.simulationDate.getUTCHours();
      const updatedHour = (currentValue + change + 24) % 24;

      if (updatedHour === 0 && currentValue === 23) {
        // The date is now the next day
        this.simulationDate.setUTCDate(this.simulationDate.getUTCDate() + 1);
      } else if (updatedHour === 23 && currentValue === 0) {
        // The date is now the previous day
        this.simulationDate.setUTCDate(this.simulationDate.getUTCDate() - 1);
      }

      this.simulationDate.setUTCHours(updatedHour);
    }

    if (unit === 'minute') {
      currentValue = this.simulationDate.getUTCMinutes();
      const updatedMinute = (currentValue + change + 60) % 60;

      if (updatedMinute === 0 && currentValue !== 0) {
        // The hour is now the next hour
        this.simulationDate.setUTCHours(this.simulationDate.getUTCHours() + 1);
      } else if (updatedMinute === 59 && currentValue !== 59) {
        // The hour is now the previous hour
        this.simulationDate.setUTCHours(this.simulationDate.getUTCHours() - 1);
      }

      this.simulationDate.setUTCMinutes(updatedMinute);
    }

    if (unit === 'second') {
      currentValue = this.simulationDate.getUTCSeconds();
      const updatedSecond = (currentValue + change + 60) % 60;

      if (updatedSecond === 0 && currentValue !== 0) {
        // The minute is now the next minute
        this.simulationDate.setUTCMinutes(this.simulationDate.getUTCMinutes() + 1);
      } else if (updatedSecond === 59 && currentValue !== 59) {
        // The minute is now the previous minute
        this.simulationDate.setUTCMinutes(this.simulationDate.getUTCMinutes() - 1);
      }

      this.simulationDate.setUTCSeconds(updatedSecond);
    }

    if (unit === 'rate') {
      currentValue = this.propagationRate;
      const updatedRate = Math.max(this.propRateLimitMin, Math.min(currentValue + change, this.propRateLimitMax));

      this.updatePropRate(updatedRate);
    }

    this.datetimeInputFormChange();
    if (unit !== 'rate') {
      this.updateTimeInput();
    }
    this.render();
    this.attachEvents();
  }

  private attachSliderEvents(sliderId: string, updateFunction: (value: number) => void): void {
    const slider = document.getElementById(sliderId);

    if (slider) {
      const min = parseInt(slider.dataset.min || '0');
      const max = parseInt(slider.dataset.max || '59');
      const step = parseInt(slider.dataset.step || '1');
      const handle: HTMLElement | null = slider.querySelector('.ui-slider-handle');

      const updateSliderPosition = (clientX: number) => {
        const rect = slider.getBoundingClientRect();
        let percentage = (clientX - rect.left) / rect.width;

        percentage = Math.max(0, Math.min(1, percentage));
        const value = Math.round((percentage * (max - min) + min) / step) * step;

        if (handle) {
          handle.style.left = `${percentage * 100}%`;
        }
        updateFunction(value);
      };

      const onMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        updateSliderPosition(e.clientX);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      slider.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        updateSliderPosition(e.clientX);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    }
  }

  private renderDayHeaders(): string {
    const daysOfWeek = [dt('days-short.1'), dt('days-short.2'), dt('days-short.3'), dt('days-short.4'), dt('days-short.5'), dt('days-short.6'), dt('days-short.0')];

    return daysOfWeek
      .map(
        (day, index) =>
          `<th scope="col" class="${index === 0 || index === 6 ? 'ui-datepicker-week-end' : ''}">
        <span title="${this.getUTCDayFullName(index)}">${day}</span>
      </th>`
      )
      .join('');
  }

  private renderCalendarDays(): string {
    const firstDay = new Date(Date.UTC(this.calendarDate.getUTCFullYear(), this.calendarDate.getUTCMonth(), 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(this.calendarDate.getUTCFullYear(), this.calendarDate.getUTCMonth() + 1, 0)).getUTCDate();
    const today = new Date();
    let dayHtml = '';
    let dayCount = 1;

    for (let i = 0; i < 6; i++) {
      let row = '<tr>';

      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          row += '<td class="ui-datepicker-other-month ui-datepicker-unselectable ui-state-disabled">&nbsp;</td>';
        } else if (dayCount <= daysInMonth) {
          const isToday =
            this.calendarDate.getUTCFullYear() === today.getUTCFullYear() && this.calendarDate.getUTCMonth() === today.getUTCMonth() && dayCount === today.getUTCDate();
          const isSelected =
            this.simulationDate &&
            this.simulationDate.getUTCFullYear() === this.calendarDate.getUTCFullYear() &&
            this.simulationDate.getUTCMonth() === this.calendarDate.getUTCMonth() &&
            this.simulationDate.getUTCDate() === dayCount;
          const classes = [j === 0 || j === 6 ? 'ui-datepicker-week-end' : '', isToday ? 'ui-datepicker-today' : '', isSelected ? 'ui-datepicker-current-day' : '']
            .filter(Boolean)
            .join(' ');

          const jday = ServiceLocator.getTimeManager().getUTCDayOfYear(new Date(Date.UTC(this.calendarDate.getUTCFullYear(), this.calendarDate.getUTCMonth(), dayCount)));

          const dayCountPadded = dayCount.toString().padStart(2, '0');
          const jdayPadded = jday.toString().padStart(3, '0');

          row += `
            <td class="${classes}" data-handler="selectDay" data-event="click" data-month="${this.calendarDate.getUTCMonth()}" data-year="${this.calendarDate.getUTCFullYear()}">
              <a class="ui-state-default${isToday ? ' ui-state-highlight' : ''}${isSelected ? ' ui-state-active' : ''}" href="#">
                <span class="ui-datepicker-cal-day">${dayCountPadded}</span>
                <span class="ui-datepicker-jday">${jdayPadded}</span>
              </a>
            </td>
          `;
          dayCount++;
        } else {
          row += '<td class="ui-datepicker-other-month ui-datepicker-unselectable ui-state-disabled">&nbsp;</td>';
        }
      }
      row += '</tr>';
      dayHtml += row;
    }

    return dayHtml;
  }

  private renderTimePicker(): string {
    const hours = this.simulationDate.getUTCHours();
    const minutes = this.simulationDate.getUTCMinutes();
    const seconds = this.simulationDate.getUTCSeconds();
    const propRate = Math.max(this.propRateLimitMin, Math.min(this.propagationRate, this.propRateLimitMax));
    const propRateRange = this.propRateLimitMax - this.propRateLimitMin;
    const propagationPercentage = ((propRate - this.propRateLimitMin) / propRateRange) * 100;

    return html`
      <div class="ui-timepicker-div">
        <dl>
          <dt class="ui_tpicker_time_label">${dt('calendar.time')}</dt>
          <dd class="ui_tpicker_time">
            <input id="calendar-time-input" class="ui_tpicker_time_input keyboard-priority" value="${this.formatTime(hours, minutes, seconds, this.simulationDate.getUTCMilliseconds())}">
            <span id="calendar-time-prop-rate">(x${propRate.toString()})</span>
          </dd>
          <dt class="ui_tpicker_hour_label">${dt('calendar.hour')}</dt>
          <dd class="ui_tpicker_hour">
            <div id="ui_tpicker_hour_slider" class="ui_tpicker_hour_slider ui-slider ui-corner-all ui-slider-horizontal ui-widget ui-widget-content"
            style="display: inline-block; width: 100px;" data-min="0" data-max="23" data-step="1">
              <span tabindex="0" class="ui-slider-handle ui-corner-all ui-state-default" style="left: ${((hours / 23) * 100).toString()}%;"></span>
            </div>
            <span class="ui-slider-access ui-controlgroup ui-controlgroup-horizontal ui-helper-clearfix ui-corner-left" role="toolbar"
            style="margin-left: 10px; margin-right: 0px;">
              <button data-icon="ui-icon-minus" data-step="-1" class="ui-widget ui-button-icon-only ui-controlgroup-item ui-button ui-corner-left" title="-" id="hour_decrease">
                <span class="ui-button-icon ui-icon ui-icon-minus"></span>
                <span class="ui-button-icon-space"> </span>-
              </button>
              <button data-icon="ui-icon-plus" data-step="1" class="ui-widget ui-button-icon-only ui-controlgroup-item ui-button ui-corner-right" title="+" id="hour_increase">
                <span class="ui-button-icon ui-icon ui-icon-plus"></span>
                <span class="ui-button-icon-space"> </span>+
              </button>
            </span>
          </dd>
          <dt class="ui_tpicker_minute_label">${dt('calendar.minute')}</dt>
          <dd class="ui_tpicker_minute">
            <div id="ui_tpicker_minute_slider" class="ui_tpicker_minute_slider ui-slider ui-corner-all ui-slider-horizontal ui-widget ui-widget-content"
            style="display: inline-block; width: 100px;" data-min="0" data-max="59" data-step="1">
              <span tabindex="0" class="ui-slider-handle ui-corner-all ui-state-default" style="left: ${((minutes / 59) * 100).toString()}%;"></span>
            </div>
            <span class="ui-slider-access ui-controlgroup ui-controlgroup-horizontal ui-helper-clearfix ui-corner-left" role="toolbar"
            style="margin-left: 10px; margin-right: 0px;">
              <button data-icon="ui-icon-minus" data-step="-1" class="ui-widget ui-button-icon-only ui-controlgroup-item ui-button ui-corner-left" title="-" id="minute_decrease">
                <span class="ui-button-icon ui-icon ui-icon-minus"></span>
                <span class="ui-button-icon-space"> </span>-
              </button>
              <button data-icon="ui-icon-plus" data-step="1" class="ui-widget ui-button-icon-only ui-controlgroup-item ui-button ui-corner-right" title="+" id="minute_increase">
                <span class="ui-button-icon ui-icon ui-icon-plus"></span>
                <span class="ui-button-icon-space"> </span>+
              </button>
            </span>
          </dd>
          <dt class="ui_tpicker_second_label">${dt('calendar.second')}</dt>
          <dd class="ui_tpicker_second">
            <div id="ui_tpicker_second_slider" class="ui_tpicker_second_slider ui-slider ui-corner-all ui-slider-horizontal ui-widget ui-widget-content"
            style="display: inline-block; width: 100px;" data-min="0" data-max="59" data-step="1">
              <span tabindex="0" class="ui-slider-handle ui-corner-all ui-state-default" style="left: ${((seconds / 59) * 100).toString()}%;"></span>
            </div>
            <span class="ui-slider-access ui-controlgroup ui-controlgroup-horizontal ui-helper-clearfix ui-corner-left" role="toolbar"
            style="margin-left: 10px; margin-right: 0px;">
              <button data-icon="ui-icon-minus" data-step="-1" class="ui-widget ui-button-icon-only ui-controlgroup-item ui-button ui-corner-left" title="-" id="second_decrease">
                <span class="ui-button-icon ui-icon ui-icon-minus"></span>
                <span class="ui-button-icon-space"> </span>-
              </button>
              <button data-icon="ui-icon-plus" data-step="1" class="ui-widget ui-button-icon-only ui-controlgroup-item ui-button ui-corner-right" title="+" id="second_increase">
                <span class="ui-button-icon ui-icon ui-icon-plus"></span>
                <span class="ui-button-icon-space"> </span>+
              </button>
            </span>
          </dd>
          <dt class="ui_tpicker_proprate_label">${dt('calendar.propagation')}</dt>
          <dd class="ui_tpicker_proprate">
            <div id="ui_tpicker_proprate_slider" class="ui_tpicker_proprate_slider ui-slider ui-corner-all ui-slider-horizontal ui-widget ui-widget-content"
            style="display: inline-block; width: 100px;" data-min="${this.propRateLimitMin.toString()}" data-max="${this.propRateLimitMax.toString()}" data-step="1">
              <span tabindex="0" class="ui-slider-handle ui-corner-all ui-state-default" style="left: ${propagationPercentage.toString()}%;"></span>
            </div>
            <span class="ui-slider-access ui-controlgroup ui-controlgroup-horizontal ui-helper-clearfix ui-corner-left" role="toolbar"
            style="margin-left: 10px; margin-right: 0px;">
              <button data-icon="ui-icon-minus" data-step="-1" class="ui-widget ui-button-icon-only ui-controlgroup-item ui-button ui-corner-left" title="-" id="rate_decrease">
                <span class="ui-button-icon ui-icon ui-icon-minus"></span>
                <span class="ui-button-icon-space"> </span>-
              </button>
              <button data-icon="ui-icon-plus" data-step="1" class="ui-widget ui-button-icon-only ui-controlgroup-item ui-button ui-corner-right" title="+" id="rate_increase">
                <span class="ui-button-icon ui-icon ui-icon-plus"></span>
                <span class="ui-button-icon-space"> </span>+
              </button>
            </span>
          </dd>
        </dl>
      </div>
    `;
  }

  private getUTCMonthName(monthIndex: number): string {
    const monthNames = [
      dt('months.1'),
      dt('months.2'),
      dt('months.3'),
      dt('months.4'),
      dt('months.5'),
      dt('months.6'),
      dt('months.7'),
      dt('months.8'),
      dt('months.9'),
      dt('months.10'),
      dt('months.11'),
      dt('months.12'),
    ];

    return monthNames[monthIndex];
  }

  private getUTCDayFullName(dayIndex: number): string {
    const dayNames = [dt('days.0'), dt('days.1'), dt('days.2'), dt('days.3'), dt('days.4'), dt('days.5'), dt('days.6')];

    return dayNames[dayIndex];
  }

  private renderMonthOptions_(): string {
    const currentMonth = this.calendarDate.getUTCMonth();
    let options = '';

    for (let m = 0; m < 12; m++) {
      options += `<option value="${m}"${m === currentMonth ? ' selected' : ''}>${this.getUTCMonthName(m)}</option>`;
    }

    return options;
  }

  private renderYearOptions_(): string {
    const currentYear = this.calendarDate.getUTCFullYear();
    const minYear = Math.min(Calendar.YEAR_SELECT_MIN_, currentYear);
    const maxYear = Math.max(new Date().getUTCFullYear() + Calendar.YEAR_SELECT_FUTURE_SPAN_, currentYear);
    let options = '';

    for (let y = maxYear; y >= minYear; y--) {
      options += `<option value="${y}"${y === currentYear ? ' selected' : ''}>${y}</option>`;
    }

    return options;
  }

  /**
   * Moves the visible month without changing the simulation time (same as the
   * prev/next arrows). Pins the day to the 1st so e.g. Jan 31 -> Feb does not
   * roll over into March.
   */
  private jumpToMonthYear_(month: number, year: number): void {
    if (!Number.isFinite(month) || !Number.isFinite(year)) {
      return;
    }

    // Normalize month overflow (-1 -> previous December) against a fixed base year,
    // then apply the real year so years 0-99 are not remapped to 1900-1999.
    const target = new Date(Date.UTC(2000, month, 1));

    target.setUTCFullYear(year + target.getUTCFullYear() - 2000);
    this.calendarDate = target;
    this.render();
    this.attachEvents();
  }

  /**
   * Applies the typed UTC date/time from the "Go to" field. Invalid text is
   * flagged and left in place so the user can correct it.
   */
  private applyTypedDateTime_(input: HTMLInputElement): void {
    const parsed = parseUtcDateTime(input.value);

    if (!parsed) {
      input.classList.add('invalid');
      ServiceLocator.getUiManager().toast(dt('calendar.goToInvalid'), ToastMsgType.caution);

      return;
    }

    input.classList.remove('invalid');
    this.simulationDate = parsed;
    this.calendarDate = new Date(parsed);
    this.datetimeInputFormChange();
    this.updateTimeInput();
    this.render();
    this.attachEvents();
  }

  private goToPreviousMonth(): void {
    this.jumpToMonthYear_(this.calendarDate.getUTCMonth() - 1, this.calendarDate.getUTCFullYear());
  }

  private goToNextMonth(): void {
    this.jumpToMonthYear_(this.calendarDate.getUTCMonth() + 1, this.calendarDate.getUTCFullYear());
  }

  private selectDay(event: Event): void {
    const target = event.target as HTMLElement;
    let dayOfYear = -1;

    if (target.classList.contains('ui-datepicker-cal-day')) {
      const jdayElement: HTMLElement | null | undefined = target.parentElement?.querySelector('.ui-datepicker-jday');

      // If we pick the calendar day, find the parent, then get the second span (class === ui-datepicker-jday)
      dayOfYear = parseInt(jdayElement?.innerText ?? '-1');
    } else if (target.tagName === 'A') {
      const jdayElement: HTMLElement | null = target.querySelector('.ui-datepicker-jday');

      dayOfYear = parseInt(jdayElement?.innerText ?? '-1');
    } else if (target.classList.contains('ui-datepicker-jday')) {
      dayOfYear = parseInt(target.innerText);
    }

    if (dayOfYear === -1) {
      return;
    }

    const selectedDate = ServiceLocator.getTimeManager().getUTCDateFromDayOfYear(this.calendarDate.getUTCFullYear(), dayOfYear);

    selectedDate.setUTCHours(this.simulationDate.getUTCHours());
    selectedDate.setUTCMinutes(this.simulationDate.getUTCMinutes());
    selectedDate.setUTCSeconds(this.simulationDate.getUTCSeconds());

    this.simulationDate = new Date(selectedDate);

    this.datetimeInputFormChange();
    this.render();
    this.attachEvents();
  }

  setToNow(): void {
    this.calendarDate = new Date();
    this.simulationDate = new Date(this.calendarDate);
    this.updatePropRate(1);
    this.datetimeInputFormChange();
    this.render();
    this.attachEvents();
  }

  private pauseProp(): void {
    this.updatePropRate(0);
    this.render();
    this.attachEvents();
  }

  private playProp(): void {
    this.updatePropRate(1);
    this.render();
    this.attachEvents();
  }

  toggleDatePicker(): void {
    if (!ServiceLocator.getTimeManager().isTimeChangingEnabled) {
      ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

      return;
    }

    if (this.isVisible) {
      this.hideDatePicker();
    } else {
      this.showDatePicker();
    }
  }

  showDatePicker(): void {
    if (!ServiceLocator.getTimeManager().isTimeChangingEnabled) {
      ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

      return;
    }

    this.isVisible = true;
    document.removeEventListener('keydown', this.onEscapeKeyDown_);
    document.addEventListener('keydown', this.onEscapeKeyDown_);
    const datepicker = document.getElementById('ui-datepicker-div');

    if (datepicker) {
      datepicker.style.display = 'block';
    }
  }

  /**
   * Escape closes the picker without applying any partially typed time or date.
   * Enter still applies through the inputs' own handlers.
   */
  private readonly onEscapeKeyDown_ = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || !this.isVisible) {
      return;
    }

    // Drop the typed text first so the blur that hiding triggers cannot apply it
    this.isEscapeCancel_ = true;
    this.updateTimeInput(true);
    (document.activeElement as HTMLElement | null)?.blur?.();
    this.hideDatePicker();
    // Blur may not fire when nothing was focused; do not leave the cancel flag armed
    this.isEscapeCancel_ = false;
  };

  hideDatePicker(): void {
    this.isVisible = false;
    document.removeEventListener('keydown', this.onEscapeKeyDown_);
    const datepicker = document.getElementById('ui-datepicker-div');

    if (datepicker) {
      datepicker.style.display = 'none';
    }
  }

  updatePropRate(propRate: number): void {
    const timeManagerInstance = ServiceLocator.getTimeManager();

    propRate = Math.max(this.propRateLimitMin, Math.min(propRate, this.propRateLimitMax));
    timeManagerInstance.calculateSimulationTime();
    timeManagerInstance.changePropRate(propRate);
    this.propagationRate = propRate;
    this.updateTimeInput();
    this.updateSliderPosition('ui_tpicker_proprate_slider', propRate, this.propRateLimitMax - this.propRateLimitMin, this.propRateLimitMin);
  }

  private updateHour(hour: number): void {
    this.simulationDate.setUTCHours(hour);
    this.datetimeInputFormChange();
    this.updateTimeInput();
    this.updateSliderPosition('ui_tpicker_hour_slider', hour, 23);
  }

  private updateMinute(minute: number): void {
    this.simulationDate.setUTCMinutes(minute);
    this.datetimeInputFormChange();
    this.updateTimeInput();
    this.updateSliderPosition('ui_tpicker_minute_slider', minute, 59);
  }

  private updateSecond(second: number): void {
    this.simulationDate.setUTCSeconds(second);
    this.datetimeInputFormChange();
    this.updateTimeInput();
    this.updateSliderPosition('ui_tpicker_second_slider', second, 59);
  }

  private updateSliderPosition(sliderId: string, value: number, range: number, min: number = 0): void {
    const slider = document.getElementById(sliderId);

    if (slider) {
      const handle: HTMLElement | null = slider.querySelector('.ui-slider-handle');

      if (handle) {
        handle.style.left = `${((value - min) / range) * 100}%`;
      }
    }
  }

  private onTextInputChange(): void {
    const timeInput = document.getElementById('calendar-time-input') as HTMLInputElement;

    if (!timeInput) {
      return;
    }

    // Accepts HH:MM:SS, HHMMSS, and either with a fractional second (.s up to .sss)
    const match = /^(?<h>\d{2}):?(?<m>\d{2}):?(?<s>\d{2})(?:\.(?<f>\d{1,3}))?$/u.exec(timeInput.value.trim());

    if (!match?.groups) {
      errorManagerInstance.warn('Invalid time format entered! Expected HH:MM:SS, HH:MM:SS.s or HHMMSS');

      return;
    }

    const hours = parseInt(match.groups.h, 10);
    const minutes = parseInt(match.groups.m, 10);
    const seconds = parseInt(match.groups.s, 10);
    const milliseconds = match.groups.f ? parseInt(match.groups.f.padEnd(3, '0'), 10) : 0;

    this.simulationDate.setUTCHours(Math.max(0, Math.min(23, hours)));
    this.simulationDate.setUTCMinutes(Math.max(0, Math.min(59, minutes)));
    this.simulationDate.setUTCSeconds(Math.max(0, Math.min(59, seconds)));
    this.simulationDate.setUTCMilliseconds(milliseconds);

    this.datetimeInputFormChange();
    this.updateTimeInput();
    this.render();
    this.attachEvents();
  }

  private updateTimeInput(force = false): void {
    setInnerHtml('calendar-time-prop-rate', `(x${this.propagationRate.toString()})`);

    const timeInput = document.getElementById('calendar-time-input') as HTMLInputElement;

    const gotoInput = document.getElementById(Calendar.GOTO_INPUT_ID) as HTMLInputElement | null;

    // Do not clobber text the user is in the middle of typing.
    if (gotoInput && (force || document.activeElement !== gotoInput)) {
      gotoInput.value = formatUtcDateTime(this.simulationDate);
      gotoInput.classList.remove('invalid');
    }

    if (timeInput) {
      timeInput.value = this.formatTime(
        this.simulationDate.getUTCHours(),
        this.simulationDate.getUTCMinutes(),
        this.simulationDate.getUTCSeconds(),
        this.simulationDate.getUTCMilliseconds()
      );
    }
  }

  private formatTime(hours: number, minutes: number, seconds: number, milliseconds = 0): string {
    const fraction = milliseconds > 0 ? `.${milliseconds.toString().padStart(3, '0').replace(/0+$/u, '')}` : '';

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}${fraction}`;
  }

  public getSelectedDate(): Date | null {
    return this.simulationDate;
  }

  public setDate(date: Date): void {
    this.calendarDate = new Date(date);
    this.simulationDate = new Date(date);
    this.render();
    this.attachEvents();
  }

  datetimeInputFormChange() {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    const today = new Date();

    timeManagerInstance.changeStaticOffset(this.simulationDate.getTime() - today.getTime());
    timeManagerInstance.lastBoxUpdateTime = timeManagerInstance.realTime;

    colorSchemeManagerInstance.calculateColorBuffers(true);

    try {
      const watchlistOverlay = PluginRegistry.getPlugin(WatchlistOverlay);
      const uiManagerInstance = ServiceLocator.getUiManager();

      if (watchlistOverlay) {
        watchlistOverlay.lastOverlayUpdateTime = timeManagerInstance.realTime * 1 - 7000;
      }

      uiManagerInstance.updateNextPassOverlay(true);
    } catch {
      // Ignore
    }
  }
}
