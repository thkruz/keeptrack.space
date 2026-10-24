/* eslint-disable max-lines */

import { SatMath, SunStatus } from '@app/app/analysis/sat-math';
import { estimateStdMag } from '@app/app/analysis/std-mag-estimator';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { DetailedSensor, RfSensor } from '@app/app/sensors/DetailedSensor';
import { SensorMath, TearrData } from '@app/app/sensors/sensor-math';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import type { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { KeepTrack } from '@app/keeptrack';
import { t7e } from '@app/locales/keys';
import { BaseObject, cKmPerMs, DEG2RAD, Degrees, eci2lla, Kilometers, RadecTopocentric, Satellite, SpaceObjectType, Sun, SunTime } from '@ootk/src/main';
import type { SensorManager } from '../../app/sensors/sensorManager';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { missileManager } from '../missile/missile-manager';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { StereoMap } from '../stereo-map/stereo-map';

const SECTIONS = {
  SENSOR: 'sensor-sat-info',
};

const EL = {
  RANGE: 'sat-range',
  AZIMUTH: 'sat-azimuth',
  ELEVATION: 'sat-elevation',
  RA: 'sat-ra',
  DEC: 'sat-dec',
  BEAMWIDTH: 'sat-beamwidth',
  MAX_TMX: 'sat-maxTmx',
  SUN: 'sat-sun',
  VMAG: 'sat-vmag',
  NEXT_PASS: 'sat-nextpass',
  REASON: 'sat-fov-reason',
};

const l = (key: string): string => t7e(`plugins.SatInfoBoxSensor.${key}` as Parameters<typeof t7e>[0]);

/** Real-time floor between two Next Pass searches for the same object and sensor (the search is heavy). */
const NEXT_PASS_MIN_REAL_INTERVAL_MS = 1000;
/** A backwards sim-clock move larger than this invalidates the cached Next Pass. */
const NEXT_PASS_BACKWARD_TOLERANCE_MS = 1000;
/** With no pass found, search again once the sim clock has used up this much of the 2-day horizon. */
const NEXT_PASS_NO_RESULT_REFRESH_MS = 86400e3;
/** While in view, refresh once the shown pass start is this far behind the sim clock (catches jumps into a later pass). */
const NEXT_PASS_IN_VIEW_REFRESH_MS = 3600e3;
/** `SensorMath.nextpass` returns 'yyyy-mm-dd HH:MM:ss' in UTC. */
const NEXT_PASS_TIME_PATTERN = /^(?<y>\d{4})-(?<mo>\d{2})-(?<d>\d{2}) (?<h>\d{2}):(?<mi>\d{2}):(?<s>\d{2})$/u;

/** What the last Next Pass search was run for, all times in epoch milliseconds. */
export interface NextPassCache {
  satId: number;
  sensorName: string;
  /** Sim time the search started from. */
  calcSimMs: number;
  /** Wall-clock time of the search, for throttling. */
  calcRealMs: number;
  /** Start of the pass found, or null when the result is not a time ('No Passes in 2 Days', 'Beyond Max Range', ...). */
  resultMs: number | null;
}

export class SatInfoBoxSensor extends KeepTrackPlugin {
  readonly id = 'SatInfoBoxSensor';
  dependencies_: string[] = [SatInfoBox.name];

  // Starting values of the collapsable sections
  private readonly isSensorSectionCollapsed_ = true;
  private nextPassCache_: NextPassCache | null = null;

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.satInfoBoxInit, () => {
      PluginRegistry.getPlugin(SatInfoBox)!.addElement({ html: this.createSensorSection_(), order: 6 });
    });
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.satInfoBoxAddListeners, this.satInfoBoxAddListeners_.bind(this));
    EventBus.getInstance().on(EventBusEvent.selectSatData, (obj: BaseObject) => {
      if (SatInfoBox.isCurrentSelection(obj)) {
        this.updateSensorInfo_(obj);
      }
    });
    EventBus.getInstance().on(EventBusEvent.updateSelectBox, (obj: BaseObject) => {
      if (SatInfoBox.isCurrentSelection(obj)) {
        this.updateSelectBox_(obj);
      }
    });
    EventBus.getInstance().on(EventBusEvent.setSensor, this.updateSensorVisibility_.bind(this));
    EventBus.getInstance().on(EventBusEvent.resetSensor, this.updateSensorVisibility_.bind(this));
  }

  private satInfoBoxAddListeners_() {
    const satInfoBoxPlugin = PluginRegistry.getPlugin(SatInfoBox)!;

    satInfoBoxPlugin.addListenerToCollapseElement(getEl(`${SECTIONS.SENSOR}`), { value: this.isSensorSectionCollapsed_ });

    // Set correct initial visibility now that the DOM element exists
    this.updateSensorVisibility_();
  }

  private createSensorSection_(): string {
    // Similar structure for sensor section
    const rows = [
      { key: 'Range', id: EL.RANGE, tooltip: 'Distance from the Sensor', value: 'xxxx km' },
      { key: 'Azimuth', id: EL.AZIMUTH, tooltip: 'Angle (Left/Right) from the Sensor', value: 'XX deg' },
      { key: 'Elevation', id: EL.ELEVATION, tooltip: 'Angle (Up/Down) from the Sensor', value: 'XX deg' },
      { key: l('labels.reason'), id: EL.REASON, tooltip: l('tooltips.reason'), value: '-' },
      { key: l('labels.ra'), id: EL.RA, tooltip: l('tooltips.ra'), value: 'XX deg' },
      { key: l('labels.dec'), id: EL.DEC, tooltip: l('tooltips.dec'), value: 'XX deg' },
      { key: 'Beam Width', id: EL.BEAMWIDTH, tooltip: "Linear Width at Target's Range", value: 'xxxx km' },
      { key: 'Max Tmx Time', id: EL.MAX_TMX, tooltip: 'Time for RF/Light to Reach Target and Back', value: 'xxxx ms' },
      { key: 'Sun', id: EL.SUN, tooltip: 'Does the Sun Impact the Sensor', value: '-' },
      { key: 'Vis Mag', id: EL.VMAG, tooltip: 'Visual Magnitude (Lower numbers are brighter)', value: 'xx.x' },
      { key: 'Next Pass', id: EL.NEXT_PASS, tooltip: 'Next Time in Coverage', value: '00:00:00z' },
    ];

    return html`
      <div id="${SECTIONS.SENSOR}">
      <div class="sat-info-section-header">
        Sensor Data
        <span id="${SECTIONS.SENSOR}-collapse" class="section-collapse material-icons">expand_less</span>
      </div>
      ${rows
        .map(
          (row) => html`
        <div
          class="sat-info-row${row.id === EL.SUN || row.id === EL.VMAG || row.id === EL.NEXT_PASS ? ' sat-only-info' : ''}"
        >
        <div class="sat-info-key" data-position="top" data-delay="50"
          kt-tooltip="${row.tooltip}"
        >
          ${row.key}
        </div>
        <div class="sat-info-value" id="${row.id}">${row.value}</div>
        </div>
      `
        )
        .join('')}
      </div>
    `;
  }

  private updateSensorVisibility_(): void {
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);
    const hasSatSelected = selectSatManager && selectSatManager.selectedSat >= 0;
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    if (hasSatSelected && sensorManagerInstance.isSensorSelected()) {
      showEl(SECTIONS.SENSOR);

      // Immediately update sun status so the placeholder is never visible
      const obj = selectSatManager!.primarySatObj;

      if (obj) {
        this.calculateSunStatus_(obj);
      }
    } else {
      hideEl(SECTIONS.SENSOR);
    }
  }

  private updateSensorInfo_(obj: BaseObject) {
    if (obj === null || typeof obj === 'undefined') {
      return;
    }

    this.updateSensorVisibility_();

    const sensorManagerInstance = ServiceLocator.getSensorManager();

    if (!sensorManagerInstance.isSensorSelected()) {
      const satSunDom = getEl(EL.SUN);

      if (satSunDom?.parentElement) {
        satSunDom.parentElement.style.display = 'none';
      }
    } else {
      this.calculateSunStatus_(obj);
    }
  }

  private calculateSunStatus_(obj: BaseObject) {
    let satInSun: SunStatus;
    let sunTime: SunTime;
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const sensorManagerInstance = ServiceLocator.getSensorManager();
    let now = new Date(timeManagerInstance.simulationTimeObj.getTime());

    try {
      sunTime = Sun.getTimes(now, sensorManagerInstance.currentSensors[0].lat, sensorManagerInstance.currentSensors[0].lon);
      satInSun = SatMath.calculateIsInSun(obj, ServiceLocator.getScene().sun.eci);
    } catch {
      sunTime = {
        sunriseStart: new Date(2050),
        sunsetEnd: new Date(1970),
      } as SunTime;
      satInSun = SunStatus.UNKNOWN;
    }

    // Reset the time to the current simulation time
    now = new Date(timeManagerInstance.simulationTimeObj.getTime());

    // If No Sensor, then Ignore Sun Exclusion
    const satSunDom = getEl(EL.SUN);

    if (satSunDom?.parentElement) {
      // If No Sensor, then Ignore Sun Exclusion
      if (!sensorManagerInstance.isSensorSelected()) {
        satSunDom.parentElement.style.display = 'none';

        return;
      }
      satSunDom.parentElement.style.display = 'flex';

      // If Radar Selected, then Say the Sun Doesn't Matter
      if (sensorManagerInstance.currentSensors[0].type !== SpaceObjectType.OPTICAL && sensorManagerInstance.currentSensors[0].type !== SpaceObjectType.OBSERVER) {
        satSunDom.innerHTML = 'No Effect';
        satSunDom.style.color = 'green';

        return;
      }

      // If we are in the sun exclusion zone, then say so
      if (sunTime?.sunriseStart.getTime() - now.getTime() < 0 && sunTime?.sunsetEnd.getTime() - now.getTime() > 0) {
        // Unless you are in sun exclusion
        satSunDom.innerHTML = 'Sun Exclusion';
        satSunDom.style.color = 'red';

        return;
      }

      // If it is night then tell the user if the satellite is illuminated
      switch (satInSun) {
        case SunStatus.UMBRAL:
          satSunDom.innerHTML = 'No Sunlight';
          satSunDom.style.color = 'red';
          break;
        case SunStatus.PENUMBRAL:
          satSunDom.innerHTML = 'Limited Sunlight';
          satSunDom.style.color = 'orange';
          break;
        case SunStatus.SUN:
          satSunDom.innerHTML = 'Direct Sunlight';
          satSunDom.style.color = 'green';
          break;
        case SunStatus.UNKNOWN:
        default:
          satSunDom.innerHTML = 'Unable to Calculate';
          satSunDom.style.color = 'red';
          break;
      }
    }
  }

  // eslint-disable-next-line max-statements, complexity
  private updateSelectBox_(obj: BaseObject) {
    if (!KeepTrack.getInstance().isInitialized) {
      return;
    }

    if (!obj?.isSatellite() && !obj?.isMissile()) {
      return;
    }

    // updateSelectBox can fire before SatInfoBox.uiManagerFinal_ injects the section.
    // EL.RANGE is created in createSensorSection_(), so its presence implies the section exists.
    if (!getEl(EL.RANGE, true)) {
      return;
    }

    try {
      const timeManagerInstance = ServiceLocator.getTimeManager();
      const sensorManagerInstance = ServiceLocator.getSensorManager();

      if (obj instanceof Satellite) {
        if (!obj.position?.x || !obj.position?.y || !obj.position?.z || isNaN(obj.position?.x) || isNaN(obj.position?.y) || isNaN(obj.position?.z)) {
          const newPosition = SatMath.getEci(obj, timeManagerInstance.simulationTimeObj).position as { x: number; y: number; z: number };

          if (!newPosition || (newPosition?.x === 0 && newPosition?.y === 0 && newPosition?.z === 0)) {
            keepTrackApi
              .getUiManager()
              .toast(
                `Satellite ${obj.sccNum} is not in orbit!<br>Sim time is ${timeManagerInstance.simulationTimeObj.toUTCString()}.<br>Be sure to check you have the right TLE.`,
                ToastMsgType.error,
                true
              );
            PluginRegistry.getPlugin(SelectSatManager)!.selectSat(-1);

            return;
          }
        }

        let isInView, rae;
        let fovReason: string | undefined;

        if (ServiceLocator.getSensorManager().isSensorSelected()) {
          const sensor = ServiceLocator.getSensorManager().currentSensors[0];

          rae = sensor.rae(obj, timeManagerInstance.simulationTimeObj);
          isInView = sensor.isRaeInFov(rae.az, rae.el, rae.rng);
          fovReason = isInView ? undefined : SatInfoBoxSensor.describeFovReason_(sensor, rae);
        } else {
          rae = {
            az: 0,
            el: 0,
            rng: 0,
          };
          isInView = false;
        }

        const lla = eci2lla(obj.position, ServiceLocator.getTimeManager().gmst);
        const currentTearr: TearrData = {
          time: timeManagerInstance.simulationTimeObj.toISOString(),
          az: rae.az,
          el: rae.el,
          rng: rae.rng,
          objName: obj.name,
          lat: lla.lat,
          lon: lla.lon,
          alt: lla.alt,
          inView: isInView,
          fovReason,
        };

        ServiceLocator.getSensorManager().currentTEARR = currentTearr;
      } else if (obj instanceof OemSatellite) {
        let isInView, rae;
        let fovReason: string | undefined;

        if (ServiceLocator.getSensorManager().isSensorSelected()) {
          const sensor = ServiceLocator.getSensorManager().currentSensors[0];

          // Use SpaceObject.rae() which properly interpolates the ephemeris at the exact time
          const raeResult = obj.rae(sensor, timeManagerInstance.simulationTimeObj);

          if (raeResult) {
            rae = raeResult;
            isInView = sensor.isRaeInFov(rae.az, rae.el, rae.rng);
            fovReason = isInView ? undefined : SatInfoBoxSensor.describeFovReason_(sensor, rae);
          } else {
            rae = { az: 0, el: 0, rng: 0 };
            isInView = false;
          }
        } else {
          rae = {
            az: 0,
            el: 0,
            rng: 0,
          };
          isInView = false;
        }

        const lla = obj.lla(timeManagerInstance.simulationTimeObj) ?? eci2lla(obj.position, ServiceLocator.getTimeManager().gmst);
        const currentTearr: TearrData = {
          time: timeManagerInstance.simulationTimeObj.toISOString(),
          az: rae.az,
          el: rae.el,
          rng: rae.rng,
          objName: obj.name,
          lat: lla.lat,
          lon: lla.lon,
          alt: lla.alt,
          inView: isInView,
          fovReason,
        };

        ServiceLocator.getSensorManager().currentTEARR = currentTearr;
      } else {
        // Is Missile
        ServiceLocator.getSensorManager().currentTEARR = missileManager.getMissileTEARR(obj as MissileObject);
      }

      if (
        settingsManager.plugins?.StereoMap &&
        PluginRegistry.getPlugin(StereoMap)?.isMenuButtonActive &&
        timeManagerInstance.realTime > settingsManager.lastMapUpdateTime + 30000
      ) {
        PluginRegistry.getPlugin(StereoMap)?.updateMap();
        settingsManager.lastMapUpdateTime = timeManagerInstance.realTime;
      }

      this.updateSatelliteTearrData_(obj, sensorManagerInstance, timeManagerInstance);

      // Always update Sun status - hides the row when no sensor, computes when sensor active
      this.calculateSunStatus_(obj);

      this.updateNextPass_(obj, sensorManagerInstance, timeManagerInstance);
    } catch {
      errorManagerInstance.debug('Error updating satellite info!');
    }
  }

  /**
   * Next Pass is searched forward from the simulation clock. The search is heavy, so the result is
   * cached, but the cache must follow the sim clock: a time jump (backwards, or forwards past the
   * cached pass) has to trigger a new search or the row shows a pass computed for another time.
   */
  private updateNextPass_(obj: BaseObject, sensorManagerInstance: SensorManager, timeManagerInstance: TimeManager): void {
    const nextPassElement = getEl(EL.NEXT_PASS, true);

    if (!sensorManagerInstance.isSensorSelected()) {
      this.nextPassCache_ = null;
      if (nextPassElement) {
        nextPassElement.innerHTML = l('values.unavailable');
      }

      return;
    }

    if (obj.isMissile()) {
      return;
    }

    const satId = PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? obj.id;
    const sensorName = sensorManagerInstance.currentSensors[0]?.objName ?? '';
    const simNowMs = timeManagerInstance.simulationTimeObj.getTime();
    const realNowMs = Date.now();
    const isInView = !!sensorManagerInstance.currentTEARR?.inView;

    if (!SatInfoBoxSensor.shouldRecalcNextPass_(this.nextPassCache_, { satId, sensorName, simNowMs, realNowMs, isInView })) {
      return;
    }

    const nextPassText = this.calculateNextPassText_(obj, sensorManagerInstance);
    const resultMs = SatInfoBoxSensor.parseNextPassTime_(nextPassText);

    this.nextPassCache_ = { satId, sensorName, calcSimMs: simNowMs, calcRealMs: realNowMs, resultMs };

    if (nextPassElement) {
      nextPassElement.innerHTML = resultMs === null ? nextPassText : `${nextPassText} UTC`;
    }
  }

  /** Decides whether the cached Next Pass is stale for the current object, sensor and sim time. */
  static shouldRecalcNextPass_(cache: NextPassCache | null, now: { satId: number; sensorName: string; simNowMs: number; realNowMs: number; isInView: boolean }): boolean {
    if (cache?.satId !== now.satId || cache.sensorName !== now.sensorName) {
      return true;
    }

    if (now.realNowMs - cache.calcRealMs < NEXT_PASS_MIN_REAL_INTERVAL_MS) {
      return false;
    }

    // The sim clock went backwards: an earlier pass may now be next.
    if (now.simNowMs < cache.calcSimMs - NEXT_PASS_BACKWARD_TOLERANCE_MS) {
      return true;
    }

    if (cache.resultMs === null) {
      return now.simNowMs - cache.calcSimMs > NEXT_PASS_NO_RESULT_REFRESH_MS;
    }

    if (now.simNowMs > cache.resultMs) {
      // Pass over (or jumped past it), or a long time inside one pass / a jump into a later pass.
      return !now.isInView || now.simNowMs - cache.resultMs > NEXT_PASS_IN_VIEW_REFRESH_MS;
    }

    return false;
  }

  /** Parses the UTC time `SensorMath.nextpass` returns; null for its non-time answers. */
  static parseNextPassTime_(text: string): number | null {
    const g = NEXT_PASS_TIME_PATTERN.exec(text)?.groups;

    if (!g) {
      return null;
    }

    return Date.UTC(Number(g.y), Number(g.mo) - 1, Number(g.d), Number(g.h), Number(g.mi), Number(g.s));
  }

  private calculateNextPassText_(obj: BaseObject, sensorManagerInstance: SensorManager): string {
    if (obj instanceof OemSatellite) {
      return 'N/A (OEM)';
    }

    const sat = obj as Satellite;

    if (sat.perigee > sensorManagerInstance.currentSensors[0].maxRng) {
      return 'Beyond Max Range';
    }

    return SensorMath.nextpass(sat, sensorManagerInstance.currentSensors, 2, 5);
  }

  /** Fills the Reason row, or hides it when the object is in view. */
  private static setReasonRow_(text: string | null): void {
    const reasonEl = getEl(EL.REASON, true);

    if (!reasonEl?.parentElement) {
      return;
    }

    reasonEl.parentElement.style.display = text ? 'flex' : 'none';
    reasonEl.innerHTML = text ?? '-';
  }

  /** Human-readable version of the first FOV bound the look angle breaks. */
  static describeFovReason_(sensor: DetailedSensor, rae: { az: number; el: number; rng: number }): string {
    const reason = sensor.getFovRejectReason(rae.az as Degrees, rae.el as Degrees, rae.rng as Kilometers);

    if (!reason) {
      return l('values.outOfFov');
    }

    const deg = (v: number) => `${v.toFixed(1)}°`;
    const km = (v: number) => `${v.toFixed(0)} km`;

    switch (reason.kind) {
      case 'minRange':
        return t7e('plugins.SatInfoBoxSensor.values.reasonMinRange' as Parameters<typeof t7e>[0], { value: km(reason.value), limit: km(reason.limit) });
      case 'maxRange':
        return t7e('plugins.SatInfoBoxSensor.values.reasonMaxRange' as Parameters<typeof t7e>[0], { value: km(reason.value), limit: km(reason.limit) });
      case 'minEl':
        return t7e('plugins.SatInfoBoxSensor.values.reasonMinEl' as Parameters<typeof t7e>[0], { value: deg(reason.value), limit: deg(reason.limit) });
      case 'maxEl':
        return t7e('plugins.SatInfoBoxSensor.values.reasonMaxEl' as Parameters<typeof t7e>[0], { value: deg(reason.value), limit: deg(reason.limit) });
      case 'mask':
        return t7e('plugins.SatInfoBoxSensor.values.reasonMask' as Parameters<typeof t7e>[0], { value: deg(reason.value), limit: deg(reason.limit) });
      case 'azimuth':
        return t7e('plugins.SatInfoBoxSensor.values.reasonAzimuth' as Parameters<typeof t7e>[0], {
          value: deg(reason.value),
          min: deg(reason.limit),
          max: deg(reason.limit2 ?? reason.limit),
        });
      case 'cone':
      default:
        return l('values.reasonCone');
    }
  }

  private updateSatelliteTearrData_(obj: BaseObject, sensorManagerInstance: SensorManager, timeManagerInstance: TimeManager) {
    const elements = {
      az: getEl('sat-azimuth'),
      el: getEl('sat-elevation'),
      rng: getEl('sat-range'),
      ra: getEl('sat-ra'),
      dec: getEl('sat-dec'),
      vmag: getEl('sat-vmag'),
      beamwidth: getEl('sat-beamwidth'),
      maxTmx: getEl('sat-maxTmx'),
    };

    if (ServiceLocator.getSensorManager().currentTEARR.inView) {
      this.updateSatTearrInFov_(elements, obj, sensorManagerInstance, timeManagerInstance);
    } else {
      this.updateSatTearrOutFov_(elements, sensorManagerInstance);
    }
  }

  private updateSatTearrOutFov_(
    elements: {
      az: HTMLElement | null;
      el: HTMLElement | null;
      rng: HTMLElement | null;
      vmag: HTMLElement | null;
      beamwidth: HTMLElement | null;
      maxTmx: HTMLElement | null;
      ra: HTMLElement | null;
      dec: HTMLElement | null;
    },
    sensorManagerInstance: SensorManager
  ) {
    const tearr = ServiceLocator.getSensorManager().currentTEARR;

    if (elements.vmag) {
      elements.vmag.innerHTML = 'Out of FOV';
    }

    /*
     * The look angles are still meaningful outside the FOV (they are what the
     * reason row compares against the sensor limits), so show them instead of
     * hiding them behind a tooltip.
     */
    if (elements.az) {
      elements.az.innerHTML = tearr.az ? `${tearr.az.toFixed(0)}°` : 'Unknown';
      elements.az.title = '';
    }
    if (elements.el) {
      elements.el.innerHTML = tearr.el ? `${tearr.el.toFixed(1)}°` : 'Unknown';
      elements.el.title = '';
    }
    if (elements.rng) {
      elements.rng.innerHTML = tearr.rng ? `${tearr.rng.toFixed(2)} km` : 'Unknown';
      elements.rng.title = '';
    }

    SatInfoBoxSensor.setReasonRow_(tearr.fovReason ?? l('values.outOfFov'));

    if (elements.ra) {
      elements.ra.innerHTML = 'Out of FOV';
    }
    if (elements.dec) {
      elements.dec.innerHTML = 'Out of FOV';
    }

    let beamwidthString = 'Unknown';

    if (sensorManagerInstance.currentSensors[0] instanceof RfSensor) {
      beamwidthString = sensorManagerInstance.currentSensors[0]?.beamwidth ? `${sensorManagerInstance.currentSensors[0].beamwidth}°` : 'Unknown';
    }
    if (elements.beamwidth) {
      elements.beamwidth.innerHTML = 'Out of FOV';
    }
    if (elements.beamwidth) {
      elements.beamwidth.title = beamwidthString;
    }
    if (elements.maxTmx) {
      elements.maxTmx.innerHTML = 'Out of FOV';
    }
  }

  /**
   * Topocentric RA/Dec of `obj` seen from `sensor`, both evaluated at the simulation time `simTime`
   * (never the wall clock). Both state vectors are J2000 (TEME/ITRF rotated with precession and
   * nutation), so the result is referred to the J2000 mean equator and equinox. It is the geometric
   * direction: no refraction, aberration or light-time correction.
   */
  static computeTopocentricRaDec_(obj: Satellite | OemSatellite, sensor: DetailedSensor, simTime: Date): { ra: number; dec: number } {
    const raDec = RadecTopocentric.fromStateVector(obj.toJ2000(simTime), sensor.toJ2000(simTime));
    const ra = ((raDec.rightAscensionDegrees % 360) + 360) % 360;

    return { ra, dec: raDec.declinationDegrees };
  }

  /**
   * Same intrinsic (standard) magnitude the Object Data card's Apparent Mag uses: the catalog value
   * when present, otherwise the preset/physics estimate. Without this the Vis Mag fell back to a
   * flat 8.0 for objects with no catalog vmag and disagreed with Apparent Mag by several magnitudes.
   */
  static intrinsicMagOverride_(sat: Satellite): number | undefined {
    if (typeof sat.vmag === 'number' && !Number.isNaN(sat.vmag)) {
      return undefined;
    }

    return estimateStdMag(sat) ?? undefined;
  }

  private static updateRaDec_(elements: { ra: HTMLElement | null; dec: HTMLElement | null }, obj: BaseObject, sensor: DetailedSensor, simTime: Date): void {
    let raText = 'N/A';
    let decText = 'N/A';

    if (obj instanceof Satellite || obj instanceof OemSatellite) {
      try {
        const { ra, dec } = SatInfoBoxSensor.computeTopocentricRaDec_(obj, sensor, simTime);

        raText = `${ra.toFixed(4)}°`;
        decText = `${dec.toFixed(4)}°`;
      } catch {
        raText = l('values.unableToCalculate');
        decText = raText;
      }
    }

    if (elements.ra) {
      elements.ra.innerHTML = raText;
    }
    if (elements.dec) {
      elements.dec.innerHTML = decText;
    }
  }

  private updateSatTearrInFov_(
    elements: {
      az: HTMLElement | null;
      el: HTMLElement | null;
      rng: HTMLElement | null;
      vmag: HTMLElement | null;
      beamwidth: HTMLElement | null;
      maxTmx: HTMLElement | null;
      ra: HTMLElement | null;
      dec: HTMLElement | null;
    },
    obj: BaseObject,
    sensorManagerInstance: SensorManager,
    timeManagerInstance: TimeManager
  ) {
    SatInfoBoxSensor.setReasonRow_(null);

    if (elements.az) {
      const az = ServiceLocator.getSensorManager().currentTEARR.az;

      if (az) {
        elements.az.innerHTML = `${az.toFixed(0)}°`;
      } else {
        elements.az.innerHTML = 'Unknown';
      }
    } // Convert to Degrees
    if (elements.el) {
      const el = ServiceLocator.getSensorManager().currentTEARR.el;

      if (el) {
        elements.el.innerHTML = `${el.toFixed(1)}°`;
      } else {
        elements.el.innerHTML = 'Unknown';
      }
    }
    if (elements.rng) {
      const rng = ServiceLocator.getSensorManager().currentTEARR.rng;

      if (rng) {
        elements.rng.innerHTML = `${rng.toFixed(2)} km`;
      } else {
        elements.rng.innerHTML = 'Unknown';
      }
    }

    SatInfoBoxSensor.updateRaDec_(elements, obj, sensorManagerInstance.currentSensors[0], timeManagerInstance.simulationTimeObj);

    const sun = ServiceLocator.getScene().sun;

    if (elements.vmag) {
      if (obj.isMissile()) {
        elements.vmag.innerHTML = 'N/A';
      } else if (obj instanceof OemSatellite) {
        elements.vmag.innerHTML = 'N/A';
      } else {
        const sat = obj as Satellite;

        elements.vmag.innerHTML = SatMath.calculateVisMag(
          sat,
          sensorManagerInstance.currentSensors[0],
          timeManagerInstance.simulationTimeObj,
          sun,
          SatInfoBoxSensor.intrinsicMagOverride_(sat)
        ).toFixed(2);
      }
    }
    let beamwidthString = 'Unknown';

    if (sensorManagerInstance.currentSensors[0] instanceof RfSensor) {
      const currentRange = ServiceLocator.getSensorManager().currentTEARR.rng;

      beamwidthString =
        sensorManagerInstance.currentSensors[0].beamwidth && currentRange
          ? `${(currentRange * Math.sin(DEG2RAD * sensorManagerInstance.currentSensors[0].beamwidth)).toFixed(2)} km`
          : 'Unknown';
    }
    if (elements.beamwidth) {
      elements.beamwidth.innerHTML = beamwidthString;
    }
    if (elements.maxTmx) {
      const currentRange = ServiceLocator.getSensorManager().currentTEARR.rng;
      // Time for RF to hit target and bounce back

      elements.maxTmx.innerHTML = currentRange ? `${((currentRange / cKmPerMs) * 2).toFixed(2)} ms` : 'Unknown';
    }
  }
}
