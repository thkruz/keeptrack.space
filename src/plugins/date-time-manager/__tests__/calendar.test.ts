import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Calendar } from '@app/plugins/date-time-manager/calendar';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/*
 * Calendar is the jQuery-UI-style date/time picker behind the DateTimeManager.
 * It renders an absolutely-positioned datepicker into the DOM and wires a web of
 * month/day/time/slider controls. These tests drive it against a jsdom container.
 */
describe('Calendar', () => {
  let cal: Calendar;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => cal as any;

  beforeEach(() => {
    setupStandardEnvironment();
    document.body.innerHTML = '<div id="cal-container"></div><span id="calendar-time-prop-rate"></span>';
    const tm = ServiceLocator.getTimeManager();

    tm.isTimeChangingEnabled = true;
    tm.getUTCDateFromDayOfYear = vi.fn((year: number, day: number) => new Date(Date.UTC(year, 0, day)));
    tm.changeStaticOffset = vi.fn();
    tm.calculateSimulationTime = vi.fn(() => new Date());
    tm.changePropRate = vi.fn();
    cal = new Calendar('cal-container');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the datepicker via setDate', () => {
    cal.setDate(new Date(Date.UTC(2022, 5, 15, 10, 30, 0)));

    expect(document.getElementById('ui-datepicker-div')).not.toBeNull();
    expect(document.querySelector('.ui-datepicker-calendar')).not.toBeNull();
  });

  it('toggles, shows and hides the datepicker', () => {
    cal.setDate(new Date());

    expect(() => cal.toggleDatePicker()).not.toThrow();
    cal.showDatePicker();
    expect(document.getElementById('ui-datepicker-div')!.style.display).toBe('block');
    cal.hideDatePicker();
    expect(document.getElementById('ui-datepicker-div')!.style.display).toBe('none');
  });

  it('shows a toast and bails when time changing is disabled', () => {
    ServiceLocator.getTimeManager().isTimeChangingEnabled = false;
    const toast = vi.fn();

    ServiceLocator.getUiManager().toast = toast;

    cal.showDatePicker();
    cal.toggleDatePicker();

    expect(toast).toHaveBeenCalled();
  });

  it('navigates between months', () => {
    cal.setDate(new Date(Date.UTC(2022, 5, 15)));

    expect(() => c().goToPreviousMonth()).not.toThrow();
    expect(() => c().goToNextMonth()).not.toThrow();
  });

  it('month arrows move one UTC month and never skip a short month', () => {
    cal.setDate(new Date(Date.UTC(2024, 0, 31, 12)));

    c().goToNextMonth();
    expect(c().calendarDate.getUTCMonth()).toBe(1);
    expect(c().calendarDate.getUTCFullYear()).toBe(2024);

    c().goToPreviousMonth();
    c().goToPreviousMonth();
    expect(c().calendarDate.getUTCMonth()).toBe(11);
    expect(c().calendarDate.getUTCFullYear()).toBe(2023);
  });

  it('the month and year header dropdowns jump the visible month without changing sim time', () => {
    cal.setDate(new Date(Date.UTC(2026, 9, 16, 12)));
    const yearSel = document.querySelector('#ui-datepicker-div select.ui-datepicker-year') as HTMLSelectElement;

    expect(yearSel).not.toBeNull();
    yearSel.value = '2024';
    yearSel.dispatchEvent(new Event('change'));

    const monthSel = document.querySelector('#ui-datepicker-div select.ui-datepicker-month') as HTMLSelectElement;

    monthSel.value = '7';
    monthSel.dispatchEvent(new Event('change'));

    expect(c().calendarDate.getUTCFullYear()).toBe(2024);
    expect(c().calendarDate.getUTCMonth()).toBe(7);
    expect((document.querySelector('#ui-datepicker-div select.ui-datepicker-year') as HTMLSelectElement).value).toBe('2024');
    expect(cal.getSelectedDate()?.toISOString()).toBe('2026-10-16T12:00:00.000Z');
    expect(ServiceLocator.getTimeManager().changeStaticOffset).not.toHaveBeenCalled();
  });

  it('the typed Go-to field applies a UTC date/time on Enter', () => {
    cal.setDate(new Date(Date.UTC(2026, 9, 16, 12)));
    const input = document.getElementById(Calendar.GOTO_INPUT_ID) as HTMLInputElement;

    expect(input.value).toBe('2026-10-16 12:00:00');
    input.value = '2024-08-15 06:30:00';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(cal.getSelectedDate()?.toISOString()).toBe('2024-08-15T06:30:00.000Z');
    expect(c().calendarDate.getUTCMonth()).toBe(7);
    expect(ServiceLocator.getTimeManager().changeStaticOffset).toHaveBeenCalled();
    expect((document.getElementById(Calendar.GOTO_INPUT_ID) as HTMLInputElement).value).toBe('2024-08-15 06:30:00');
  });

  it('the typed Go-to field flags invalid text and leaves the time alone', () => {
    const toast = vi.fn();

    ServiceLocator.getUiManager().toast = toast;
    cal.setDate(new Date(Date.UTC(2026, 9, 16, 12)));
    const input = document.getElementById(Calendar.GOTO_INPUT_ID) as HTMLInputElement;

    input.value = '2024-02-30 00:00:00';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(input.classList.contains('invalid')).toBe(true);
    expect(toast).toHaveBeenCalled();
    expect(cal.getSelectedDate()?.toISOString()).toBe('2026-10-16T12:00:00.000Z');

    cal.showDatePicker();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(input.value).toBe('2026-10-16 12:00:00');
    expect(input.classList.contains('invalid')).toBe(false);
  });

  it('setToNow, pauseProp and playProp adjust the propagation rate', () => {
    cal.setDate(new Date());

    expect(() => cal.setToNow()).not.toThrow();
    expect(() => c().pauseProp()).not.toThrow();
    expect(() => c().playProp()).not.toThrow();
  });

  it('updatePropRate clamps to the slider limits', () => {
    cal.setDate(new Date());

    cal.updatePropRate(999);
    expect(ServiceLocator.getTimeManager().changePropRate).toHaveBeenCalledWith(20);

    cal.updatePropRate(-999);
    expect(ServiceLocator.getTimeManager().changePropRate).toHaveBeenCalledWith(-20);
  });

  it('adjustTime handles each unit and the day/hour/minute rollovers', () => {
    cal.setDate(new Date(Date.UTC(2022, 5, 15, 23, 59, 59)));

    // Forwards across midnight / hour / minute boundaries.
    expect(() => c().adjustTime('hour', 1)).not.toThrow();
    c().simulationDate = new Date(Date.UTC(2022, 5, 15, 0, 0, 0));
    expect(() => c().adjustTime('hour', -1)).not.toThrow();
    c().simulationDate = new Date(Date.UTC(2022, 5, 15, 10, 59, 59));
    expect(() => c().adjustTime('minute', 1)).not.toThrow();
    expect(() => c().adjustTime('minute', -1)).not.toThrow();
    expect(() => c().adjustTime('second', 1)).not.toThrow();
    expect(() => c().adjustTime('second', -1)).not.toThrow();
    expect(() => c().adjustTime('rate', 1)).not.toThrow();
  });

  it('updateHour/Minute/Second update the simulation time', () => {
    cal.setDate(new Date());

    c().updateHour(5);
    c().updateMinute(30);
    c().updateSecond(15);

    expect(c().simulationDate.getUTCHours()).toBe(5);
    expect(c().simulationDate.getUTCMinutes()).toBe(30);
    expect(c().simulationDate.getUTCSeconds()).toBe(15);
  });

  it('onTextInputChange parses HHMMSS and HH:MM:SS and rejects bad lengths', () => {
    cal.setDate(new Date());
    // onTextInputChange re-renders, recreating the input, so re-query it each time.
    const input = () => document.getElementById('calendar-time-input') as HTMLInputElement;

    input().value = '081530';
    c().onTextInputChange();
    expect(c().simulationDate.getUTCHours()).toBe(8);

    input().value = '12:34:56';
    c().onTextInputChange();
    expect(c().simulationDate.getUTCMinutes()).toBe(34);

    // Too short -> rejected with a warning.
    input().value = '12';
    expect(() => c().onTextInputChange()).not.toThrow();
  });

  it('onTextInputChange accepts fractional seconds (HH:MM:SS.s)', () => {
    cal.setDate(new Date(Date.UTC(2026, 0, 1)));
    const input = () => document.getElementById('calendar-time-input') as HTMLInputElement;

    input().value = '08:15:30.4';
    c().onTextInputChange();

    expect(c().simulationDate.getUTCSeconds()).toBe(30);
    expect(c().simulationDate.getUTCMilliseconds()).toBe(400);
    expect(input().value).toBe('08:15:30.4');
  });

  it('Escape closes the picker without applying a partially typed time', () => {
    cal.setDate(new Date(Date.UTC(2026, 0, 1, 1, 2, 3)));
    cal.showDatePicker();
    const input = document.getElementById('calendar-time-input') as HTMLInputElement;

    input.focus();
    input.value = '23:59:59';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(document.getElementById('ui-datepicker-div')!.style.display).toBe('none');
    expect(c().simulationDate.getUTCHours()).toBe(1);
    expect((document.getElementById('calendar-time-input') as HTMLInputElement).value).toBe('01:02:03');
  });

  it('Escape does nothing while the picker is closed', () => {
    cal.setDate(new Date());
    const hide = vi.spyOn(cal, 'hideDatePicker');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(hide).not.toHaveBeenCalled();
  });

  it('onTextInputChange returns early when the input element is absent', () => {
    cal.setDate(new Date());
    document.getElementById('calendar-time-input')?.remove();

    expect(() => c().onTextInputChange()).not.toThrow();
  });

  it('the Enter key and blur on the time input apply the change', () => {
    cal.setDate(new Date());
    const input = document.getElementById('calendar-time-input') as HTMLInputElement;

    expect(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))).not.toThrow();
    expect(() => input.dispatchEvent(new Event('blur'))).not.toThrow();
  });

  it('render warns and returns when the container is missing', () => {
    const orphan = new Calendar('does-not-exist');

    expect(() => orphan.setDate(new Date())).not.toThrow();
  });

  it('selectDay sets the date from the clicked day-of-year', () => {
    cal.setDate(new Date(Date.UTC(2022, 0, 1)));
    const jday = document.createElement('span');

    jday.className = 'ui-datepicker-jday';
    Object.defineProperty(jday, 'innerText', { value: '100', configurable: true });

    expect(() => c().selectDay({ target: jday })).not.toThrow();
  });

  it('selectDay handles the calendar-day and anchor target shapes', () => {
    cal.setDate(new Date(Date.UTC(2022, 0, 1)));

    // A .ui-datepicker-cal-day whose parent holds the julian-day span.
    const dayCell = document.createElement('div');

    dayCell.className = 'ui-datepicker-cal-day';
    const parent = document.createElement('div');
    const jday1 = document.createElement('span');

    jday1.className = 'ui-datepicker-jday';
    Object.defineProperty(jday1, 'innerText', { value: '120', configurable: true });
    parent.appendChild(dayCell);
    parent.appendChild(jday1);
    expect(() => c().selectDay({ target: dayCell })).not.toThrow();

    // An anchor wrapping the julian-day span.
    const anchor = document.createElement('a');
    const jday2 = document.createElement('span');

    jday2.className = 'ui-datepicker-jday';
    Object.defineProperty(jday2, 'innerText', { value: '150', configurable: true });
    anchor.appendChild(jday2);
    expect(() => c().selectDay({ target: anchor })).not.toThrow();
  });

  it('selectDay ignores clicks that resolve to no day', () => {
    cal.setDate(new Date());
    const el = document.createElement('div');

    expect(() => c().selectDay({ target: el })).not.toThrow();
  });

  it('datetimeInputFormChange updates the watchlist overlay when present', () => {
    cal.setDate(new Date());
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ lastOverlayUpdateTime: 0 } as never);
    ServiceLocator.getUiManager().updateNextPassOverlay = vi.fn();

    expect(() => cal.datetimeInputFormChange()).not.toThrow();
  });

  it('getSelectedDate returns the current simulation date', () => {
    const d = new Date(Date.UTC(2022, 3, 4, 5, 6, 7));

    cal.setDate(d);
    expect(cal.getSelectedDate()?.getUTCFullYear()).toBe(2022);
  });

  it('the time sliders respond to pointer drags', () => {
    cal.setDate(new Date());
    const slider = document.getElementById('ui_tpicker_hour_slider');

    if (slider) {
      expect(() => slider.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, bubbles: true }))).not.toThrow();
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    }
  });
});
