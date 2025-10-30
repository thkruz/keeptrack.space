import { SatMath } from '@app/app/analysis/sat-math';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { t7e } from '@app/locales/keys';
import { CruncherInMsgTimeSync } from '@app/webworker/orbit-cruncher-interfaces';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { getDayOfYear, GreenwichMeanSiderealTime, Milliseconds } from '@ootk/src/main';
import { DateTimeManager } from '../../plugins/date-time-manager/date-time-manager';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { getEl } from '../utils/get-el';
import { PluginRegistry } from './plugin-registry';
import { ServiceLocator } from './service-locator';

export class TimeManager {
  datetimeInputDOM: HTMLInputElement | null = null;
  /**
   * The real time at the moment when dynamicOffset or propRate changes
   */
  dynamicOffsetEpoch = <number>null;
  lastPropRate = <number>1;
  propFrozen = 0;
  propOffset = 0;
  /**
   * The rate of change applied to the dynamicOffset
   */
  propRate = <number>null;
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
  readonly timeUntilChangingEnabled = 10000;
  isTimeChangingEnabled = false;
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

    this.staticOffset = this.simulationTimeObj.getTime() - Date.now();
    // Changing propRate or dynamicOffsetEpoch before calculating the staticOffset will give incorrect results
    this.dynamicOffsetEpoch = Date.now();
    this.calculateSimulationTime();

    this.synchronize();

    const toggleTimeDOM = getEl('toggle-time-rmb');

    if (ServiceLocator.getTimeManager().propRate === 0) {
      toggleTimeDOM.childNodes[0].textContent = 'Start Clock';
    } else {
      toggleTimeDOM.childNodes[0].textContent = 'Pause Clock';
    }

    const uiManagerInstance = ServiceLocator.getUiManager();

    if (!settingsManager.isAlwaysHidePropRate && isShowToast) {
      if (this.propRate > 1.01 || this.propRate < 0.99) {
        if (this.propRate < 10) {
          uiManagerInstance.toast(`Propagation Speed: ${this.propRate.toFixed(1)}x`, ToastMsgType.standby);
        }
        if (this.propRate >= 10 && this.propRate < 60) {
          uiManagerInstance.toast(`Propagation Speed: ${this.propRate.toFixed(1)}x`, ToastMsgType.caution);
        }
        if (this.propRate >= 60) {
          uiManagerInstance.toast(`Propagation Speed: ${this.propRate.toFixed(1)}x`, ToastMsgType.serious);
        }
      } else {
        uiManagerInstance.toast(`Propagation Speed: ${this.propRate.toFixed(1)}x`, ToastMsgType.normal);
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

  changeStaticOffset(staticOffset: number) {
    this.dynamicOffsetEpoch = Date.now();
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
    this.dynamicOffsetEpoch = Date.now();
    this.simulationTimeObj = new Date();

    this.propFrozen = Date.now(); // for when propRate 0
    this.realTime = <Milliseconds>this.propFrozen; // (initialized as Date.now)
    this.propRate = settingsManager.propRate ?? 1.0; // time rate multiplier for propagation

    this.staticOffset = settingsManager.simulationTime ? settingsManager.simulationTime.getTime() - Date.now() : 0;

    // Initialize
    this.calculateSimulationTime();
    this.setSelectedDate(this.simulationTimeObj);
    this.initializeKeyboardBindings_();

    setTimeout(() => {
      this.isTimeChangingEnabled = true;
    }, this.timeUntilChangingEnabled);

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
    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (key === 't' && !isRepeat) {
        if (!this.isTimeChangingEnabled) {
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

          return;
        }
        ServiceLocator.getUiManager().toast('Time Set to Real Time', ToastMsgType.normal);
        this.changeStaticOffset(0); // Reset to Current Time
      }
    });

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (key === ',' && !isRepeat) {
        if (!this.isTimeChangingEnabled) {
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

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
          newPropRate = (this.propRate * 1.5);
        } else {
          newPropRate = ((this.propRate * 2) / 3);
        }

        const calendarInstance = PluginRegistry.getPlugin(DateTimeManager)?.calendar;

        if (calendarInstance) {
          calendarInstance.updatePropRate(newPropRate);
        } else {
          this.changePropRate(newPropRate);
        }
      }
    });

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (key === '.' && !isRepeat) {
        if (!this.isTimeChangingEnabled) {
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

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
          newPropRate = (this.propRate * 1.5);
        } else {
          newPropRate = ((this.propRate * 2) / 3);
        }

        const calendarInstance = PluginRegistry.getPlugin(DateTimeManager)?.calendar;

        if (calendarInstance) {
          calendarInstance.updatePropRate(newPropRate);
        } else {
          this.changePropRate(newPropRate);
        }
      }
    });

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (key === '<' && !isRepeat) {
        if (!this.isTimeChangingEnabled) {
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

          return;
        }

        this.calculateSimulationTime();
        this.changeStaticOffset(this.staticOffset - settingsManager.changeTimeWithKeyboardAmountBig);
      }
    });

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (key === '>' && !isRepeat) {
        if (!this.isTimeChangingEnabled) {
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

          return;
        }

        this.calculateSimulationTime();
        this.changeStaticOffset(this.staticOffset + settingsManager.changeTimeWithKeyboardAmountBig);
      }
    });

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (key === '/' && !isRepeat) {
        if (!this.isTimeChangingEnabled) {
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

          return;
        }

        let newPropRate: number;

        if (this.propRate === 1) {
          newPropRate = 0;
        } else {
          newPropRate = 1;
        }

        const calendarInstance = PluginRegistry.getPlugin(DateTimeManager)?.calendar;

        if (calendarInstance) {
          calendarInstance.updatePropRate(newPropRate);
        } else {
          this.changePropRate(newPropRate);
        }
        this.calculateSimulationTime();
      }
    });

    EventBus.getInstance().on(EventBusEvent.KeyDown, (_key: string, code: string, isRepeat: boolean) => {
      if (code === 'Equal' && !isRepeat) {
        if (!this.isTimeChangingEnabled) {
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

          return;
        }

        this.calculateSimulationTime();
        this.changeStaticOffset(this.staticOffset + settingsManager.changeTimeWithKeyboardAmountSmall);
      }
    });

    EventBus.getInstance().on(EventBusEvent.KeyDown, (_key: string, code: string, isRepeat: boolean) => {
      if (code === 'Minus' && !isRepeat) {
        if (!this.isTimeChangingEnabled) {
          ServiceLocator.getUiManager().toast(t7e('errorMsgs.catalogNotFullyInitialized'), ToastMsgType.caution, true);

          return;
        }

        this.calculateSimulationTime();
        this.changeStaticOffset(this.staticOffset - settingsManager.changeTimeWithKeyboardAmountSmall);
      }
    });

    this.isKeyboardBindingsInitialized_ = true;
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
        uiManagerInstance.toast(`Propagation Speed: ${this.propRate.toFixed(1)}x`, ToastMsgType.standby);
      }
      if (this.propRate >= 10 && this.propRate < 60) {
        uiManagerInstance.toast(`Propagation Speed: ${this.propRate.toFixed(1)}x`, ToastMsgType.caution);
      }
      if (this.propRate >= 60) {
        uiManagerInstance.toast(`Propagation Speed: ${this.propRate.toFixed(1)}x`, ToastMsgType.serious);
      }
    } else {
      uiManagerInstance.toast(`Propagation Speed: ${this.propRate.toFixed(1)}x`, ToastMsgType.normal);
    }
  }

  setSelectedDate(selectedDate: Date) {
    this.selectedDate = selectedDate;

    EventBus.getInstance().emit(EventBusEvent.selectedDateChange, this.selectedDate);
  }

  synchronize() {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    EventBus.getInstance().emit(EventBusEvent.updateDateTime, new Date(this.dynamicOffsetEpoch + this.staticOffset));

    const message = {
      typ: CruncerMessageTypes.OFFSET,
      type: CruncerMessageTypes.OFFSET,
      staticOffset: this.staticOffset,
      dynamicOffsetEpoch: this.dynamicOffsetEpoch,
      propRate: this.propRate,
    } as CruncherInMsgTimeSync;

    catalogManagerInstance.satCruncher.postMessage(message);
    orbitManagerInstance.orbitThreadMgr.postMessage(message);
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
    let dayInYear = 365;
    let dayOfYear = dayCount[mn] + dn;

    if (mn > 1 && this.isLeapYear(doy)) {
      dayOfYear++;
      dayInYear++;
    }

    return dayOfYear % dayInYear;
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
