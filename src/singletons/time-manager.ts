import { Milliseconds } from 'ootk';
import { keepTrackApi } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { StringPad } from '../lib/stringPad';
import { getDayOfYear } from '../lib/transforms';
import { DateTimeManager } from '../plugins/date-time-manager/date-time-manager';
import { UrlManager } from '../static/url-manager';

export class TimeManager {
  dateDOM = null;
  datetimeInputDOM = <HTMLInputElement>null;
  /**
   * The real time at the moment when dynamicOffset or propRate changes
   */
  dynamicOffsetEpoch = <number>null;
  private iText = <number>null;
  lastPropRate = <number>null;
  /**
   * Time in Milliseconds the last time sim time was updated
   */
  private lastTime = <Milliseconds>0;
  propFrozen = 0;
  propOffset = 0;
  /**
   * The rate of change applied to the dynamicOffset
   */
  propRate = <number>null;
  propRate0 = <number>null;
  /**
   * The time in the real world
   */
  realTime = <Milliseconds>0;
  selectedDate = <Date>null;
  /**
   * The time in the simulation
   *
   * simulationTime = realTime + staticOffset + dynamicOffset * propRate
   */
  simulationTimeObj = <Date>null;
  /**
   * The time offset ignoring propRate (ex. New Launch)
   */
  staticOffset = 0;
  private simulationTimeSerialized_ = <string>null;
  timeTextStr = <string>null;
  /**
   * Reusable empty text string to reduce garbage collection
   */
  private timeTextStrEmpty_ = <string>null;
  lastBoxUpdateTime = <Milliseconds>0;
  /**
   * dynamicOffset: The time offset that is impacted by propRate
   *
   * dynamicOffset = realTime - dynamicOffsetEpoch
   */
  private dynamicOffset_: number;

  static currentEpoch(currentDate: Date): [string, string] {
    const currentDateObj = new Date(currentDate);
    let epochYear = currentDateObj.getUTCFullYear().toString().substr(2, 2);
    let epochDay = getDayOfYear(currentDateObj);
    let timeOfDay = (currentDateObj.getUTCHours() * 60 + currentDateObj.getUTCMinutes()) / 1440;
    const epochDayStr = StringPad.pad0((epochDay + timeOfDay).toFixed(8), 12);
    return [epochYear, epochDayStr];
  }

  // Propagation Time Functions
  calculateSimulationTime(newSimulationTime?: Date): Date {
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

    return this.simulationTimeObj;
  }

  changePropRate(propRate: number) {
    if (this.propRate === propRate) return; // no change

    this.staticOffset = this.simulationTimeObj.getTime() - Date.now();
    // Changing propRate or dynamicOffsetEpoch before calculating the staticOffset will give incorrect results
    this.dynamicOffsetEpoch = Date.now();
    this.propRate = propRate;
    this.calculateSimulationTime();

    this.synchronize();

    UrlManager.updateURL();
  }

  changeStaticOffset(staticOffset: number) {
    this.dynamicOffsetEpoch = Date.now();
    this.staticOffset = staticOffset;
    this.calculateSimulationTime();
    this.synchronize();
    keepTrackApi.methods.staticOffsetChange(this.staticOffset);
  }

  getOffsetTimeObj(offset: number) {
    // Make a time variable
    const now = new Date();
    // Set the time variable to the time in the future
    now.setTime(this.simulationTimeObj.getTime() + offset);
    return now;
  }

  getPropOffset(): number {
    if (!this.selectedDate) return 0;
    // Not using local scope caused time to drift backwards!
    return this.selectedDate.getTime() - Date.now();
  }

  init() {
    this.dynamicOffsetEpoch = Date.now();
    this.simulationTimeObj = new Date();

    this.timeTextStr = '';
    this.timeTextStrEmpty_ = '';

    this.propFrozen = Date.now(); // for when propRate 0
    this.realTime = <Milliseconds>this.propFrozen; // (initialized as Date.now)
    this.propRate = 1.0; // time rate multiplier for propagation

    // Initialize
    this.calculateSimulationTime();
    this.setSelectedDate(this.simulationTimeObj);
  }

  setNow(realTime: Milliseconds) {
    this.realTime = realTime;
    this.lastTime = <Milliseconds>this.simulationTimeObj.getTime();

    // NOTE: This should be the only regular call to calculateSimulationTime!!
    this.calculateSimulationTime();
    this.setSelectedDate(this.simulationTimeObj);

    // Passing datetimeInput eliminates needing jQuery in main module
    if (
      this.lastTime - this.simulationTimeObj.getTime() < 300 &&
      ((<DateTimeManager>keepTrackApi.getPlugin(DateTimeManager))?.isEditTimeOpen || !settingsManager.cruncherReady || !keepTrackApi.getPlugin(DateTimeManager))
    ) {
      if (settingsManager.plugins.datetime) {
        if (this.datetimeInputDOM == null) {
          this.datetimeInputDOM = <HTMLInputElement>getEl('datetime-input-tb', true);
        }
        if (this.datetimeInputDOM !== null) {
          this.datetimeInputDOM.value = this.selectedDate.toISOString().slice(0, 10) + ' ' + this.selectedDate.toISOString().slice(11, 19);
        }
      }
    }
  }

  setSelectedDate(selectedDate: Date) {
    this.selectedDate = selectedDate;

    // This function only applies when datetime plugin is enabled
    if (settingsManager.plugins.datetime) {
      if (this.lastTime - this.simulationTimeObj.getTime() < <Milliseconds>300) {
        this.simulationTimeSerialized_ = this.simulationTimeObj.toJSON();
        this.timeTextStr = this.timeTextStrEmpty_;
        for (this.iText = 11; this.iText < 20; this.iText++) {
          if (this.iText > 11) this.timeTextStr += this.simulationTimeSerialized_[this.iText - 1];
        }
        this.propRate0 = this.propRate;
        settingsManager.isPropRateChange = false;
      }

      // Avoid race condition
      if (this.dateDOM == null) {
        try {
          this.dateDOM = getEl('datetime-text');
          if (this.dateDOM == null) return;
        } catch {
          console.log('errors...');
          return;
        }
      }

      // textContent doesn't remove the Node! No unecessary DOM changes everytime time updates.
      this.dateDOM.textContent = this.timeTextStr;

      // Load the current JDAY
      const jday = getDayOfYear(this.simulationTimeObj);
      getEl('jday').innerHTML = jday.toString();
    }
  }

  synchronize() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const orbitManagerInstance = keepTrackApi.getOrbitManager();

    const message = {
      typ: 'offset',
      staticOffset: this.staticOffset,
      dynamicOffsetEpoch: this.dynamicOffsetEpoch,
      propRate: this.propRate,
    };
    catalogManagerInstance.satCruncher.postMessage(message);

    // OrbitWorker starts later than the satCruncher so it might not be
    // ready yet.
    if (orbitManagerInstance.orbitWorker) {
      orbitManagerInstance.orbitWorker.postMessage(message);
    }
  }
}
