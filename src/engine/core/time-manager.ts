import { SatMath } from '@app/app/analysis/sat-math';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { t7e } from '@app/locales/keys';
import { GreenwichMeanSiderealTime, getDayOfYear, Milliseconds } from '@ootk/src/main';
import { DateTimeManager } from '../../plugins/date-time-manager/date-time-manager';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { KeyboardComponent } from '../plugins/components/keyboard/keyboard-component';
import { errorManagerInstance } from '../utils/errorManager';
import { getEl } from '../utils/get-el';
import { PluginRegistry } from './plugin-registry';
import { ServiceLocator } from './service-locator';

export class TimeManager {
  datetimeInputDOM: HTMLInputElement | null = null;
  /**
   * The real time at the moment when dynamicOffset or propRate changes
   */
  dynamicOffsetEpoch = 0;
  lastPropRate = 1;
  propFrozen = 0;
  propOffset = 0;
  /**
   * The rate of change applied to the dynamicOffset
   */
  propRate = 0;
  /**
   * The time in the real world
   */
  realTime = <Milliseconds>0;
  selectedDate = new Date();
  /**
   * The time in the simulation
   *
   * simulationTime = realTime + staticOffset + dynamicOffset * propRate
   */
  simulationTimeObj = new Date();
  /**
   * The time offset ignoring propRate (ex. New Launch)
   */
  staticOffset: number;
  lastBoxUpdateTime = <Milliseconds>0;
  /**
   * dynamicOffset: The time offset that is impacted by propRate
   *
   * dynamicOffset = realTime - dynamicOffsetEpoch
   */
  private dynamicOffset_: number;
  gmst: GreenwichMeanSiderealTime = 0 as GreenwichMeanSiderealTime;
  j: number;
  isTimeChangingEnabled = true;
  isKeyboardBindingsInitialized_ = false;
  isInitialized = false;

  static currentEpoch(currentDate: Date): [string, string] {
    const currentDateObj = new Date(currentDate);
    const epochYear = currentDateObj.getUTCFullYear().toString().slice(2, 4);
    const epochDay = getDayOfYear(currentDateObj);
    const timeOfDay = (currentDateObj.getUTCHours() * 60 + currentDateObj.getUTCMinutes()) / 1440;
    const epochDayStr = (epochDay + timeOfDay).toFixed(8).padStart(12, '0');

    return [epochYear, epochDayStr];
  }

  // Propagation Time Functions
  calculateSimulationTime(newSimulationTime?: Date | null): Date {
    if (typeof newSimulationTime !== 'undefined' && newSimulationTime !== null) {
      this.simulationTimeObj.setTime(newSimulationTime.getTime());

      return this.simulationTimeObj;
    }

    if (this.propRate === 0) {
      const simulationTime = this.dynamicOffsetEpoch + this.staticOffset;

      this.simulationTimeObj.setTime(simulationTime);
    } else {
      this.realTime = <Milliseconds>Date.now();
      this.dynamicOffset_ = this.realTime - this.dynamicOffsetEpoch;
      const simulationTime = this.dynamicOffsetEpoch + this.staticOffset + this.dynamicOffset_ * this.propRate;

      this.simulationTimeObj.setTime(simulationTime);
    }

    EventBus.getInstance().emit(EventBusEvent.calculateSimulationTime, this.simulationTimeObj);

    return this.simulationTimeObj;
  }

  changePropRate(propRate: number, isShowToast = true) {
    if (this.propRate === propRate) {
      return;
    } // no change

    this.propRate = propRate;
    EventBus.getInstance().emit(EventBusEvent.propRateChanged, this.propRate);

    if (!this.isInitialized) {
      return;
    }

    // One clock read: a paused sim time is dynamicOffsetEpoch + staticOffset, so two reads can drift it by 1 ms
    const now = Date.now();

    this.staticOffset = this.simulationTimeObj.getTime() - now;
    // Changing propRate or dynamicOffsetEpoch before calculating the staticOffset will give incorrect results
    this.dynamicOffsetEpoch = now;
    this.calculateSimulationTime();

    this.synchronize();

    const toggleTimeDOM = getEl('toggle-time-rmb');

    if (toggleTimeDOM) {
      if (ServiceLocator.getTimeManager().propRate === 0) {
        toggleTimeDOM.childNodes[0].textContent = t7e('rightClickMenu.startClock');
      } else {
        toggleTimeDOM.childNodes[0].textContent = t7e('rightClickMenu.pauseClock');
      }
    }

    const uiManagerInstance = ServiceLocator.getUiManager();

    if (!settingsManager.isAlwaysHidePropRate && isShowToast) {
      if (this.propRate > 1.01 || this.propRate < 0.99) {
        if (this.propRate < 10) {
          uiManagerInstance.toast(t7e('toasts.propagationSpeed').replace('{rate}', this.propRate.toFixed(1)), ToastMsgType.standby);
        }
        if (this.propRate >= 10 && this.propRate < 60) {
          uiManagerInstance.toast(t7e('toasts.propagationSpeed').replace('{rate}', this.propRate.toFixed(1)), ToastMsgType.caution);
        }
        if (this.propRate >= 60) {
          uiManagerInstance.toast(t7e('toasts.propagationSpeed').replace('{rate}', this.propRate.toFixed(1)), ToastMsgType.serious);
        }
      } else {
        uiManagerInstance.toast(t7e('toasts.propagationSpeed').replace('{rate}', this.propRate.toFixed(1)), ToastMsgType.normal);
      }
    }
  }

  static isLeapYear(dateIn: Date) {
    const year = dateIn.getUTCFullYear();

    if ((year & 3) !== 0) {
      return false;
    }

    return year % 100 !== 0 || year % 400 === 0;
  }

  /**
   * Jump the simulation clock to an absolute time. Prefer this over `changeStaticOffset(target - Date.now())`: that
   * form reads the wall clock twice, so a millisecond tick between the reads leaves a paused clock 1 ms off target.
   */
  changeSimulationTime(targetMs: number) {
    const now = Date.now();

    this.changeStaticOffset(targetMs - now, now);
  }

  changeStaticOffset(staticOffset: number, now = Date.now()) {
    if (!Number.isFinite(staticOffset)) {
      errorManagerInstance.warn(t7e('errorMsgs.TimeManager.nonFiniteOffset').replace('{value}', String(staticOffset)));

      return;
    }
    this.dynamicOffsetEpoch = now;
    this.staticOffset = staticOffset;
    this.calculateSimulationTime();
    this.synchronize();
    EventBus.getInstance().emit(EventBusEvent.staticOffsetChange, this.staticOffset);
  }

  getOffsetTimeObj(offset: number) {
    // Make a time variable
    const now = new Date();
    // Set the time variable to the time in the future

    now.setTime(this.simulationTimeObj.getTime() + offset);

    return now;
  }

  getPropOffset(): number {
    if (!this.selectedDate) {
      return 0;
    }
    // Not using local scope caused time to drift backwards!

    return this.selectedDate.getTime() - Date.now();
  }

  init() {
    // One clock read: a paused sim time is dynamicOffsetEpoch + staticOffset, so two reads can drift it by 1 ms
    const now = Date.now();

    this.dynamicOffsetEpoch = now;
    this.simulationTimeObj = new Date(now);

    this.propFrozen = now; // for when propRate 0
    this.realTime = <Milliseconds>this.propFrozen; // (initialized as Date.now)
    this.propRate = settingsManager.propRate ?? 1.0; // time rate multiplier for propagation

    this.staticOffset = settingsManager.simulationTime ? settingsManager.simulationTime.getTime() - now : 0;

    // Initialize
    this.calculateSimulationTime();
    this.setSelectedDate(this.simulationTimeObj);
    this.initializeKeyboardBindings_();

    this.isInitialized = true;
  }

  update() {
    const { gmst, j } = SatMath.calculateTimeVariables(this.simulationTimeObj);

    this.gmst = gmst;
    this.j = j;
  }

  private initializeKeyboardBindings_() {
    if (this.isKeyboardBindingsInitialized_) {
      return;
    }

    const d = (key: string) => t7e(`keyboard.descriptions.${key}` as Parameters<typeof t7e>[0]);

    new KeyboardComponent('TimeManager', [
      {
        key: 't',
        description: d('realTime'),
        callback: () => {
          if (!this.guardTimeChange_()) {
            return;
          }
          ServiceLocator.getUiManager().toast(t7e('toasts.timeSetToRealTime'), ToastMsgType.normal);
          this.changeStaticOffset(0);
        },
      },
      {
        key: ',',
        // Ctrl+, is SettingsMenuPlugin's "preferences" shortcut
        ctrl: false,
        shift: false,
        description: d('slowDown'),
        callback: () => {
          if (!this.guardTimeChange_()) {
            return;
          }
          this.calculateSimulationTime();
          let newPropRate = this.propRate;

          if (this.propRate < 0.001 && this.propRate > -0.001) {
            newPropRate = -0.001;
          }
          if (this.propRate < -1000) {
            newPropRate = -1000;
          }
          if (newPropRate < 0) {
            newPropRate = this.propRate * 1.5;
          } else {
            newPropRate = (this.propRate * 2) / 3;
          }
          this.applyPropRate_(newPropRate);
        },
      },
      {
        key: '.',
        description: d('speedUp'),
        callback: () => {
          if (!this.guardTimeChange_()) {
            return;
          }
          this.calculateSimulationTime();
          let newPropRate = this.propRate;

          if (this.propRate < 0.001 && this.propRate > -0.001) {
            newPropRate = 0.001;
          }
          if (this.propRate > 1000) {
            newPropRate = 1000;
          }
          if (newPropRate > 0) {
            newPropRate = this.propRate * 1.5;
          } else {
            newPropRate = (this.propRate * 2) / 3;
          }
          this.applyPropRate_(newPropRate);
        },
      },
      {
        key: '<',
        description: d('jumpBack'),
        callback: () => {
          if (!this.guardTimeChange_()) {
            return;
          }
          this.calculateSimulationTime();
          this.changeStaticOffset(this.staticOffset - settingsManager.changeTimeWithKeyboardAmountBig);
        },
      },
      {
        key: '>',
        description: d('jumpForward'),
        callback: () => {
          if (!this.guardTimeChange_()) {
            return;
          }
          this.calculateSimulationTime();
          this.changeStaticOffset(this.staticOffset + settingsManager.changeTimeWithKeyboardAmountBig);
        },
      },
      {
        key: '/',
        description: d('togglePause'),
        callback: () => {
          if (!this.guardTimeChange_()) {
            return;
          }
          const newPropRate = this.propRate === 1 ? 0 : 1;

          this.applyPropRate_(newPropRate);
          this.calculateSimulationTime();
        },
      },
      {
        key: '=',
        code: 'Equal',
        description: d('stepForward'),
        callback: () => {
          if (!this.guardTimeChange_()) {
            return;
          }
          this.calculateSimulationTime();
          this.changeStaticOffset(this.staticOffset + settingsManager.changeTimeWithKeyboardAmountSmall);
        },
      },
      {
        key: '-',
        code: 'Minus',
        description: d('stepBack'),
        callback: () => {
          if (!this.guardTimeChange_()) {
            return;
          }
          this.calculateSimulationTime();
          this.changeStaticOffset(this.staticOffset - settingsManager.changeTimeWithKeyboardAmountSmall);
        },
      },
    ]).init();

    this.isKeyboardBindingsInitialized_ = true;
  }

  private guardTimeChange_(): boolean {
    if (!this.isTimeChangingEnabled) {
      ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

      return false;
    }

    return true;
  }

  private applyPropRate_(newPropRate: number): void {
    const calendarInstance = PluginRegistry.getPlugin(DateTimeManager)?.calendar;

    if (calendarInstance) {
      calendarInstance.updatePropRate(newPropRate);
    } else {
      this.changePropRate(newPropRate);
    }
  }

  setNow(realTime: Milliseconds) {
    this.realTime = realTime;

    // NOTE: This should be the only regular call to calculateSimulationTime!!
    this.calculateSimulationTime();
  }

  toggleTime() {
    if (this.propRate === 0) {
      this.changePropRate(this.lastPropRate);
    } else {
      this.lastPropRate = this.propRate;
      this.changePropRate(0);
    }

    const uiManagerInstance = ServiceLocator.getUiManager();

    if (this.propRate > 1.01 || this.propRate < 0.99) {
      if (this.propRate < 10) {
        uiManagerInstance.toast(t7e('toasts.propagationSpeed').replace('{rate}', this.propRate.toFixed(1)), ToastMsgType.standby);
      }
      if (this.propRate >= 10 && this.propRate < 60) {
        uiManagerInstance.toast(t7e('toasts.propagationSpeed').replace('{rate}', this.propRate.toFixed(1)), ToastMsgType.caution);
      }
      if (this.propRate >= 60) {
        uiManagerInstance.toast(t7e('toasts.propagationSpeed').replace('{rate}', this.propRate.toFixed(1)), ToastMsgType.serious);
      }
    } else {
      uiManagerInstance.toast(t7e('toasts.propagationSpeed').replace('{rate}', this.propRate.toFixed(1)), ToastMsgType.normal);
    }
  }

  setSelectedDate(selectedDate: Date) {
    this.selectedDate = selectedDate;

    EventBus.getInstance().emit(EventBusEvent.selectedDateChange, this.selectedDate);
  }

  synchronize() {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const simDate = new Date(this.dynamicOffsetEpoch + this.staticOffset);

    if (Number.isNaN(simDate.getTime())) {
      errorManagerInstance.warn(t7e('errorMsgs.TimeManager.invalidDate').replace('{epoch}', String(this.dynamicOffsetEpoch)).replace('{offset}', String(this.staticOffset)));

      return;
    }

    EventBus.getInstance().emit(EventBusEvent.updateDateTime, simDate);

    // eslint-disable-next-line no-sync
    catalogManagerInstance.satCruncherThread.sendTimeSync(this.staticOffset, this.dynamicOffsetEpoch, this.propRate);
  }

  private isLeapYear(date: Date): boolean {
    const year = date.getUTCFullYear();

    if ((year & 3) !== 0) {
      return false;
    }

    return year % 100 !== 0 || year % 400 === 0;
  }

  getUTCDayOfYear(doy: Date) {
    const mn = doy.getUTCMonth();
    const dn = doy.getUTCDate();
    const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let dayOfYear = dayCount[mn] + dn;

    if (mn > 1 && this.isLeapYear(doy)) {
      dayOfYear++;
    }

    return dayOfYear;
  }

  getUTCDateFromDayOfYear(year: number, dayOfYear: number): Date {
    const isLeapYear = this.isLeapYear(this.createUTCDate(year, 0, 1));
    const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let month = 0;

    while (dayOfYear > daysInMonth[month]) {
      dayOfYear -= daysInMonth[month];
      month++;
    }

    return this.createUTCDate(year, month, dayOfYear);
  }

  private createUTCDate(year: number, month?: number, day?: number, hours?: number, minutes?: number, seconds?: number): Date {
    const date = new Date(Date.UTC(year, month ?? 0, day ?? 1, hours ?? 0, minutes ?? 0, seconds ?? 0));

    return date;
  }
}
