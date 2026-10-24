/* eslint-disable max-statements */
/* eslint-disable max-lines */
import { SatMath } from '@app/app/analysis/sat-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { PhasedOrbitSatellite } from '@app/app/objects/phased-orbit-satellite';
import { SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { CelestialBody } from '@app/engine/rendering/draw-manager/celestial-bodies/celestial-body';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { BaseObject, eci2lla, Kilometers, MINUTES_PER_DAY, Satellite, Tle, TleLine1 } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { EL, SECTIONS } from './sat-info-box-orbital-html';
import { screeningSigmasKm } from './screening-sigmas';

// Keep all fields in the current selection's synchronous render transaction.
const setInnerHtml = (id: string, value: string): void => {
  const element = getEl(id, true);

  if (element) {
    element.innerHTML = value;
  }
};

export class SatInfoBoxOrbital extends KeepTrackPlugin {
  readonly id = 'SatInfoBoxOrbital';
  dependencies_: string[] = [SatInfoBox.name];

  // Starting values of the collapsable sections
  private readonly isOrbitalSectionCollapsed_ = true;

  init(): void {
    super.init();
  }

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.satInfoBoxInit, () => {
      PluginRegistry.getPlugin(SatInfoBox)!.addElement({ html: this.createOrbitalSection(), order: 5 });
    });
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.satInfoBoxAddListeners, this.satInfoBoxAddListeners_.bind(this));
    const updateCurrentSelection = (obj?: BaseObject): void => {
      const selection = PluginRegistry.getPlugin(SelectSatManager);

      if (obj && selection?.selectedSat === obj.id && selection.primarySatObj === obj) {
        this.updateOrbitData_(obj);
      }
    };

    EventBus.getInstance().on(EventBusEvent.updateSelectBox, updateCurrentSelection);
    EventBus.getInstance().on(EventBusEvent.selectSatData, updateCurrentSelection);
  }

  private satInfoBoxAddListeners_() {
    const satInfoBoxPlugin = PluginRegistry.getPlugin(SatInfoBox)!;

    satInfoBoxPlugin.addListenerToCollapseElement(getEl(`${SECTIONS.ORBITAL}`), { value: this.isOrbitalSectionCollapsed_ });
  }

  private createOrbitalSection(): string {
    return html`
        <div id="${SECTIONS.ORBITAL}">
          <div class="sat-info-section-header">
            <span>${t7e('SatInfoBoxOrbital.title')}</span>
            <span id="${SECTIONS.ORBITAL}-collapse" class="section-collapse material-icons">expand_less</span>
          </div>
          <!-- Orbital data rows -->
          ${this.createOrbitalDataRows()}
        </div>
      `;
  }

  private createOrbitalDataRows(): string {
    // Create all orbital data rows
    const rows = [
      { key: t7e('SatInfoBoxOrbital.Apogee.label'), id: EL.APOGEE, tooltip: t7e('SatInfoBoxOrbital.Apogee.tooltip'), value: 'xxx km' },
      { key: t7e('SatInfoBoxOrbital.Perigee.label'), id: EL.PERIGEE, tooltip: t7e('SatInfoBoxOrbital.Perigee.tooltip'), value: 'xxx km' },
      { key: t7e('SatInfoBoxOrbital.Inclination.label'), id: EL.INCLINATION, tooltip: t7e('SatInfoBoxOrbital.Inclination.tooltip'), value: 'xxx.xx' },
      { key: t7e('SatInfoBoxOrbital.Eccentricity.label'), id: EL.ECCENTRICITY, tooltip: t7e('SatInfoBoxOrbital.Eccentricity.tooltip'), value: 'x.xx' },
      { key: t7e('SatInfoBoxOrbital.RightAsc.label'), id: EL.RAAN, tooltip: t7e('SatInfoBoxOrbital.RightAsc.tooltip'), value: 'x.xx' },
      { key: t7e('SatInfoBoxOrbital.ArgOfPerigee.label'), id: EL.ARG_PE, tooltip: t7e('SatInfoBoxOrbital.ArgOfPerigee.tooltip'), value: 'x.xx' },
      { key: t7e('SatInfoBoxOrbital.Latitude.label'), id: EL.LATITUDE, tooltip: t7e('SatInfoBoxOrbital.Latitude.tooltip'), value: 'x.xx' },
      { key: t7e('SatInfoBoxOrbital.Longitude.label'), id: EL.LONGITUDE, tooltip: t7e('SatInfoBoxOrbital.Longitude.tooltip'), value: 'x.xx' },
      { key: t7e('SatInfoBoxOrbital.Altitude.label'), id: EL.ALTITUDE, tooltip: t7e('SatInfoBoxOrbital.Altitude.tooltip'), value: 'xxx km' },
      { key: t7e('SatInfoBoxOrbital.Period.label'), id: EL.PERIOD, tooltip: t7e('SatInfoBoxOrbital.Period.tooltip'), value: 'xxx min' },
      { key: t7e('SatInfoBoxOrbital.Velocity.label'), id: EL.VELOCITY, tooltip: t7e('SatInfoBoxOrbital.Velocity.tooltip'), value: 'xxx km/s' },
      { key: t7e('SatInfoBoxOrbital.GPEpoch.label'), id: EL.GP_EPOCH, tooltip: t7e('SatInfoBoxOrbital.GPEpoch.tooltip'), value: 'xxxx-xx-xx xx:xx:xx UTC' },
      { key: t7e('SatInfoBoxOrbital.AgeOfGP.label'), id: EL.ELSET_AGE, tooltip: t7e('SatInfoBoxOrbital.AgeOfGP.tooltip'), value: 'xxx.xxxx' },
      { key: t7e('SatInfoBoxOrbital.RadialSigma.label'), id: EL.UNCERTAINTY_RADIAL, tooltip: t7e('SatInfoBoxOrbital.RadialSigma.tooltip'), value: 'xxx.xxxx' },
      { key: t7e('SatInfoBoxOrbital.InTrackSigma.label'), id: EL.UNCERTAINTY_INTRACK, tooltip: t7e('SatInfoBoxOrbital.InTrackSigma.tooltip'), value: 'xxx.xxxx' },
      { key: t7e('SatInfoBoxOrbital.CrossTrackSigma.label'), id: EL.UNCERTAINTY_CROSSTRACK, tooltip: t7e('SatInfoBoxOrbital.CrossTrackSigma.tooltip'), value: 'xxx.xxxx' },
    ];

    const covarianceIds: string[] = [EL.UNCERTAINTY_RADIAL, EL.UNCERTAINTY_INTRACK, EL.UNCERTAINTY_CROSSTRACK];
    // Drop the covariance rows (Radial, In Track, Cross Track Sigma) when the setting is disabled
    const visibleRows = settingsManager.plugins.SatInfoBoxOrbital!.isShowCovariance ? rows : rows.filter((row) => !covarianceIds.includes(row.id));

    return visibleRows
      .map(
        (row) => html`
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" kt-tooltip="${row.tooltip}">${row.key}</div>
          <div class="sat-info-value" id="${row.id}">${row.value}</div>
        </div>
      `
      )
      .join('');
  }

  private updateOrbitData_(obj: BaseObject): void {
    if (obj === null || typeof obj === 'undefined') {
      return;
    }

    // updateSelectBox can fire before SatInfoBox.uiManagerFinal_ injects the section.
    // EL.APOGEE is created in createOrbitalDataRows(), so its presence implies the section exists.
    if (!getEl(EL.APOGEE, true)) {
      return;
    }

    if (obj instanceof Satellite) {
      this.updateSatelliteOrbitalElements_(obj);
    } else if (obj instanceof OemSatellite) {
      this.updateOemOrbitalElements_(obj);
    }

    // Only objects propagated from a GP element set (TLE) have a GP epoch; OEM, missiles, etc. show N/A
    setInnerHtml(EL.GP_EPOCH, obj instanceof Satellite ? SatInfoBoxOrbital.formatGpEpoch(obj.tle1) : 'N/A');

    this.updateCovariance_(obj);
    this.updateSecondarySatellite_(obj);
    this.updateAltitudeAndVelocity_(obj);
  }

  private updateSatelliteOrbitalElements_(obj: Satellite): void {
    setInnerHtml(EL.APOGEE, `${obj.apogee.toFixed(0)} ${t7e('SatInfoBoxOrbital.kilometer')}`);
    setInnerHtml(EL.PERIGEE, `${obj.perigee.toFixed(0)} ${t7e('SatInfoBoxOrbital.kilometer')}`);
    setInnerHtml(EL.INCLINATION, `${obj.inclination.toFixed(2)}°`);
    setInnerHtml(EL.ECCENTRICITY, obj.eccentricity.toFixed(3));
    setInnerHtml(EL.RAAN, `${obj.rightAscension.toFixed(2)}°`);
    setInnerHtml(EL.ARG_PE, `${obj.argOfPerigee.toFixed(2)}°`);

    this.updatePeriodElement_(obj.period);
    this.updateElsetAgeElement_(obj);
    this.updateLatLonElements_(obj.position);

    this.updateSectionHeader_();
  }

  private updatePeriodElement_(period: number): void {
    const periodDom = getEl(EL.PERIOD);

    if (periodDom) {
      if (!Number.isFinite(period) || period <= 0) {
        periodDom.textContent = 'N/A';
        periodDom.removeAttribute('kt-tooltip');

        return;
      }
      periodDom.innerHTML = `${period.toFixed(2)} ${t7e('SatInfoBoxOrbital.Period.min')}`;
      periodDom.dataset.position = 'top';
      periodDom.dataset.delay = '50';
      periodDom.setAttribute('kt-tooltip', `${t7e('SatInfoBoxOrbital.Period.meanMotion')}: ${(MINUTES_PER_DAY / period).toFixed(2)} ${t7e('SatInfoBoxOrbital.Period.revPerDay')}`);
    }
  }

  private updateElsetAgeElement_(obj: Satellite): void {
    // Age of GP is measured against the SIMULATION clock, not the wall clock, so it follows time jumps and reads
    // negative when the sim time is before the element set epoch.
    const simTime = ServiceLocator.getTimeManager().simulationTimeObj;
    const ageText = SatInfoBoxOrbital.formatElsetAge(obj.ageOfElset(simTime));

    const elsetAgeDom = getEl(EL.ELSET_AGE);

    if (elsetAgeDom) {
      elsetAgeDom.innerHTML = ageText;
      elsetAgeDom.dataset.position = 'top';
      elsetAgeDom.dataset.delay = '50';
      elsetAgeDom.setAttribute(
        'kt-tooltip',
        `${t7e('SatInfoBoxOrbital.AgeOfGP.epochYear')}: ${obj.tle1.substring(18, 20)}<br/>
           ${t7e('SatInfoBoxOrbital.AgeOfGP.epochDay')}: ${obj.tle1.substring(20, 28)}`
      );
    }
  }

  /**
   * Formats an element set age (in days, signed) for the Age of GP row. Ages under one day show in hours. A negative
   * age means the GP epoch is after the simulation time; it keeps the minus sign and adds a short localized note.
   */
  static formatElsetAge(daysOld: number): string {
    if (!Number.isFinite(daysOld)) {
      return 'N/A';
    }

    const absDays = Math.abs(daysOld);
    const isDays = absDays >= 1;
    const magnitude = isDays ? absDays : absDays * 24;
    const units = isDays ? t7e('SatInfoBoxOrbital.AgeOfGP.days') : t7e('SatInfoBoxOrbital.AgeOfGP.hours');
    // Treat anything that rounds to 0.00 as zero so the row never shows "-0.00"
    const isFuture = daysOld < 0 && magnitude.toFixed(2) !== '0.00';

    if (!isFuture) {
      return `${magnitude.toFixed(2)} ${units}`;
    }

    return `-${magnitude.toFixed(2)} ${units} (${t7e('SatInfoBoxOrbital.AgeOfGP.epochAfterSimTime')})`;
  }

  /**
   * Formats the epoch of a GP element set as `YYYY-MM-DD HH:MM:SS UTC`, or 'N/A' when the TLE has no parsable epoch.
   * Uses the same 57 year pivot as {@link Tle.calcElsetAge}, which drives the Age of GP row.
   */
  static formatGpEpoch(tle1: TleLine1 | undefined | null): string {
    if (typeof tle1 !== 'string' || tle1.length < 32) {
      return 'N/A';
    }

    try {
      const year = Tle.epochYearFull(tle1);
      const dayOfYear = Tle.epochDay(tle1);
      // Round to the millisecond so float noise cannot turn :38.000 into :37.999
      const epochMs = Math.round(Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86400000);

      if (!Number.isFinite(epochMs)) {
        return 'N/A';
      }

      return `${new Date(epochMs).toISOString().slice(0, 19).replace('T', ' ')} UTC`;
    } catch {
      return 'N/A';
    }
  }

  private updateLatLonElements_(position: Parameters<typeof eci2lla>[0]): void {
    const gmst = ServiceLocator.getTimeManager().gmst;
    const lla = eci2lla(position, gmst);

    const satLonElement = getEl(EL.LONGITUDE);
    const satLatElement = getEl(EL.LATITUDE);

    if (satLonElement && satLatElement) {
      if (lla.lon >= 0) {
        satLonElement.innerHTML = `${lla.lon.toFixed(3)}°${t7e('SatInfoBoxOrbital.Longitude.east')}`;
      } else {
        satLonElement.innerHTML = `${(lla.lon * -1).toFixed(3)}°${t7e('SatInfoBoxOrbital.Longitude.west')}`;
      }
      if (lla.lat >= 0) {
        satLatElement.innerHTML = `${lla.lat.toFixed(3)}°${t7e('SatInfoBoxOrbital.Latitude.north')}`;
      } else {
        satLatElement.innerHTML = `${(lla.lat * -1).toFixed(3)}°${t7e('SatInfoBoxOrbital.Latitude.south')}`;
      }
    }
  }

  /**
   * Updates the altitude/velocity rows. Returns false when the caller should
   * abort the rest of the update (non-Earth center body not found).
   */
  private updateAltitudeAndVelocity_(obj: BaseObject): boolean {
    const satAltitudeElement = getEl(EL.ALTITUDE);
    const satVelocityElement = getEl(EL.VELOCITY);

    if (satAltitudeElement && satVelocityElement) {
      if (obj instanceof Satellite || obj instanceof OemSatellite) {
        return this.updateSatelliteAltitudeAndVelocity_(obj, satAltitudeElement, satVelocityElement);
      }

      this.updateMissileAltitudeAndVelocity_(obj as MissileObject, satAltitudeElement, satVelocityElement);
    }

    return true;
  }

  private updateSatelliteAltitudeAndVelocity_(obj: Satellite | OemSatellite, satAltitudeElement: HTMLElement, satVelocityElement: HTMLElement): boolean {
    const gmst = ServiceLocator.getTimeManager().gmst;

    if (((obj as OemSatellite).centerBody ?? SolarBody.Earth) !== SolarBody.Earth) {
      const centerBody = ServiceLocator.getScene().getBodyById((obj as OemSatellite).centerBody) as CelestialBody | null;

      if (!centerBody) {
        errorManagerInstance.debug(`Error calculating altitude for non-Earth centered object ${obj.name}: center body not found.`);

        satAltitudeElement.textContent = 'N/A';
        satVelocityElement.textContent = 'N/A';

        return false;
      }
      const position = {
        x: (obj.position.x - centerBody.position[0]) as Kilometers,
        y: (obj.position.y - centerBody.position[1]) as Kilometers,
        z: (obj.position.z - centerBody.position[2]) as Kilometers,
      };

      satAltitudeElement.innerHTML = `${SatMath.getAlt(position, gmst, centerBody.RADIUS as Kilometers).toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}`;
    } else {
      satAltitudeElement.innerHTML = `${SatMath.getAlt(obj.position, gmst).toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}`;
    }

    satVelocityElement.innerHTML = `${obj.totalVelocity.toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}/${t7e('SatInfoBoxOrbital.second')}`;

    return true;
  }

  private updateMissileAltitudeAndVelocity_(misl: MissileObject, satAltitudeElement: HTMLElement, satVelocityElement: HTMLElement): void {
    satAltitudeElement.innerHTML = `${(ServiceLocator.getSensorManager().currentTEARR?.alt ?? 0).toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}`;
    if (misl.totalVelocity) {
      satVelocityElement.innerHTML = `${misl.totalVelocity.toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}/${t7e('SatInfoBoxOrbital.second')}`;
    } else {
      satVelocityElement.innerHTML = t7e('SatInfoBoxOrbital.unknown');
    }
  }

  /**
   * Sigma rows: 1-sigma R / I / C of the TLE-derived screening covariance at the GP epoch, the
   * same numbers the Conjunction Report prints and the model Pc is computed from. Deliberately not
   * SelectSatManager.primarySatCovMatrix: that holds ellipsoid display radii, which are scaled by
   * the confidence level and replaced by the Pro Covariance plugin's measured covariance.
   */
  private updateCovariance_(obj: BaseObject): void {
    const sigmas = obj instanceof Satellite ? screeningSigmasKm(obj.tle1, obj.tle2) : null;

    if (!sigmas) {
      setInnerHtml(EL.UNCERTAINTY_RADIAL, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.UNCERTAINTY_CROSSTRACK, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.UNCERTAINTY_INTRACK, t7e('SatInfoBoxOrbital.unknown'));

      return;
    }

    setInnerHtml(EL.UNCERTAINTY_RADIAL, SatInfoBoxOrbital.formatSigmaKm(sigmas.radial));
    setInnerHtml(EL.UNCERTAINTY_INTRACK, SatInfoBoxOrbital.formatSigmaKm(sigmas.inTrack));
    setInnerHtml(EL.UNCERTAINTY_CROSSTRACK, SatInfoBoxOrbital.formatSigmaKm(sigmas.crossTrack));
  }

  /** A 1-sigma value (km) with its unit: meters below 1 km, km (3 decimals, as in the reports) above. */
  static formatSigmaKm(sigmaKm: number): string {
    if (sigmaKm < 1) {
      return `${(sigmaKm * 1000).toFixed(1)} ${t7e('SatInfoBoxOrbital.meter')}`;
    }

    return `${sigmaKm.toFixed(3)} ${t7e('SatInfoBoxOrbital.kilometer')}`;
  }

  private updateSecondarySatellite_(obj: BaseObject): void {
    const secondarySatObj = PluginRegistry.getPlugin(SelectSatManager)!.secondarySatObj;

    if (!secondarySatObj || !(obj instanceof Satellite)) {
      ['sat-sec-dist', 'sat-sec-rad', 'sat-sec-intrack', 'sat-sec-crosstrack'].forEach((id) => {
        setInnerHtml(id, 'N/A');
      });

      return;
    }

    const sat = obj as Satellite;
    const ric = secondarySatObj.toRIC(sat, ServiceLocator.getTimeManager().simulationTimeObj);
    /*
     * Linear range comes from the same main-thread SGP4 states as R/I/C. The cruncher-buffer positions lag a
     * time jump by up to two cruncher cycles, so mixing the two sources showed a stale range on first paint.
     */
    const dist = ric.range.toFixed(2);

    const satDistanceElement = getEl('sat-sec-dist');
    const satRadiusElement = getEl('sat-sec-rad');
    const satInTrackElement = getEl('sat-sec-intrack');
    const satCrossTrackElement = getEl('sat-sec-crosstrack');

    if (satDistanceElement && satRadiusElement && satInTrackElement && satCrossTrackElement) {
      satDistanceElement.innerHTML = `${dist} km`;
      satRadiusElement.innerHTML = `${ric.position.x.toFixed(2)}km`;
      satInTrackElement.innerHTML = `${ric.position.y.toFixed(2)}km`;
      satCrossTrackElement.innerHTML = `${ric.position.z.toFixed(2)}km`;
    } else {
      errorManagerInstance.debug('Error updating secondary satellite info!');
    }
  }

  private updateOemOrbitalElements_(obj: OemSatellite): void {
    // OemSatellite.toClassicalElements uses the Earth-gravity J2000 conversion.
    // Interplanetary ephemerides do not have Earth-centered osculating elements;
    // report unavailable until a body/frame-aware element model is provided.
    if (obj.centerBody !== SolarBody.Earth) {
      [EL.APOGEE, EL.PERIGEE, EL.INCLINATION, EL.ECCENTRICITY, EL.RAAN, EL.ARG_PE, EL.PERIOD, EL.ELSET_AGE, EL.LATITUDE, EL.LONGITUDE].forEach((id) => {
        setInnerHtml(id, 'N/A');
      });
      getEl(EL.PERIOD, true)?.removeAttribute('kt-tooltip');
      this.updateSectionHeader_(obj);

      return;
    }
    try {
      const elements = obj.toClassicalElements();

      const finite = (value: number, digits: number, suffix = ''): string => (Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : 'N/A');
      const isElliptic = elements.eccentricity >= 0 && elements.eccentricity < 1;

      setInnerHtml(EL.APOGEE, isElliptic ? finite(elements.apogee, 0, ` ${t7e('SatInfoBoxOrbital.kilometer')}`) : 'N/A');
      // Earth-centered elements of an escape or heliocentric trajectory are not an orbit, so do not show them as one.
      setInnerHtml(EL.PERIGEE, isElliptic ? finite(elements.perigee, 0, ` ${t7e('SatInfoBoxOrbital.kilometer')}`) : 'N/A');
      setInnerHtml(EL.INCLINATION, finite(elements.inclinationDegrees, 2, '°'));
      setInnerHtml(EL.ECCENTRICITY, isElliptic ? finite(elements.eccentricity, 3) : 'N/A');
      setInnerHtml(EL.RAAN, finite(elements.rightAscensionDegrees, 2, '°'));
      setInnerHtml(EL.ARG_PE, finite(elements.argPerigeeDegrees, 2, '°'));

      this.updatePeriodElement_(isElliptic ? elements.period : NaN);

      setInnerHtml(EL.ELSET_AGE, 'N/A');

      this.updateLatLonElements_(obj.position);
    } catch {
      setInnerHtml(EL.APOGEE, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.PERIGEE, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.INCLINATION, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.ECCENTRICITY, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.RAAN, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.ARG_PE, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.PERIOD, t7e('SatInfoBoxOrbital.unknown'));
      getEl(EL.PERIOD, true)?.removeAttribute('kt-tooltip');
      setInnerHtml(EL.ELSET_AGE, 'N/A');
      setInnerHtml(EL.LATITUDE, 'N/A');
      setInnerHtml(EL.LONGITUDE, 'N/A');
    }

    this.updateSectionHeader_(obj);
  }

  private updateSectionHeader_(obj?: OemSatellite): void {
    const sectionEl = getEl(SECTIONS.ORBITAL);

    if (!sectionEl) {
      return;
    }

    const headerSpan = sectionEl.querySelector('.sat-info-section-header > span:first-child') as HTMLSpanElement | null;

    if (!headerSpan) {
      return;
    }

    if (obj instanceof PhasedOrbitSatellite) {
      const phase = obj.getActivePhase();
      const phaseName = phase ? phase.name : '';

      headerSpan.textContent = phaseName ? `${t7e('SatInfoBoxOrbital.title')} (${phaseName})` : t7e('SatInfoBoxOrbital.title');
    } else {
      headerSpan.textContent = t7e('SatInfoBoxOrbital.title');
    }
  }
}
