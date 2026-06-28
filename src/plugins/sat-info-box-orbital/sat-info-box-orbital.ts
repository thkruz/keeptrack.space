/* eslint-disable max-statements */
/* eslint-disable max-lines */
import { SatMath } from '@app/app/analysis/sat-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { PhasedOrbitSatellite } from '@app/app/objects/phased-orbit-satellite';
import { SensorMath } from '@app/app/sensors/sensor-math';
import { SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { CelestialBody } from '@app/engine/rendering/draw-manager/celestial-bodies/celestial-body';
import { getCatalogReferenceDate } from '@app/engine/utils/catalog-reference-time';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, setInnerHtml } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { BaseObject, eci2lla, Kilometers, MINUTES_PER_DAY, Satellite } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { EL, SECTIONS } from './sat-info-box-orbital-html';

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
    EventBus.getInstance().on(EventBusEvent.updateSelectBox, this.updateOrbitData_.bind(this));
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
      { key: t7e('SatInfoBoxOrbital.AgeOfGP.label'), id: EL.ELSET_AGE, tooltip: t7e('SatInfoBoxOrbital.AgeOfGP.tooltip'), value: 'xxx.xxxx' },
      { key: t7e('SatInfoBoxOrbital.RadialSigma.label'), id: EL.UNCERTAINTY_RADIAL, tooltip: t7e('SatInfoBoxOrbital.RadialSigma.tooltip'), value: 'xxx.xxxx' },
      { key: t7e('SatInfoBoxOrbital.InTrackSigma.label'), id: EL.UNCERTAINTY_INTRACK, tooltip: t7e('SatInfoBoxOrbital.InTrackSigma.tooltip'), value: 'xxx.xxxx' },
      { key: t7e('SatInfoBoxOrbital.CrossTrackSigma.label'), id: EL.UNCERTAINTY_CROSSTRACK, tooltip: t7e('SatInfoBoxOrbital.CrossTrackSigma.tooltip'), value: 'xxx.xxxx' },
    ];

    if (!settingsManager.plugins.SatInfoBoxOrbital!.isShowCovariance) {
      /*
       * Remove the covariance rows (Radial Sigma, In Track Sigma, Cross Track Sigma) if the setting is disabled
       * These rows are at indices 12, 13, and 14 in the 'rows' array
       */
      rows.splice(12, 3);
    }

    return rows.map((row) => html`
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" kt-tooltip="${row.tooltip}">${row.key}</div>
          <div class="sat-info-value" id="${row.id}">${row.value}</div>
        </div>
      `).join('');
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

    if (this.updateAltitudeAndVelocity_(obj) === false) {
      return;
    }

    this.updateCovariance_();
    this.updateSecondarySatellite_(obj);
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
      periodDom.innerHTML = `${period.toFixed(2)} ${t7e('SatInfoBoxOrbital.Period.min')}`;
      periodDom.dataset.position = 'top';
      periodDom.dataset.delay = '50';
      periodDom.setAttribute(
        'kt-tooltip',
        `${t7e('SatInfoBoxOrbital.Period.meanMotion')}: ${(MINUTES_PER_DAY / period).toFixed(2)} ${t7e('SatInfoBoxOrbital.Period.revPerDay')}`,
      );
    }
  }

  private updateElsetAgeElement_(obj: Satellite): void {
    const now: Date | number | string = getCatalogReferenceDate();
    const daysold = obj.ageOfElset(now);
    const age = daysold >= 1 ? daysold : daysold * 24;
    const units = daysold >= 1 ? t7e('SatInfoBoxOrbital.AgeOfGP.days') : t7e('SatInfoBoxOrbital.AgeOfGP.hours');

    const elsetAgeDom = getEl(EL.ELSET_AGE);

    if (elsetAgeDom) {
      elsetAgeDom.innerHTML = `${age.toFixed(2)} ${units}`;
      elsetAgeDom.dataset.position = 'top';
      elsetAgeDom.dataset.delay = '50';
      elsetAgeDom.setAttribute(
        'kt-tooltip',
        `${t7e('SatInfoBoxOrbital.AgeOfGP.epochYear')}: ${obj.tle1.substring(18, 20)}<br/>
           ${t7e('SatInfoBoxOrbital.AgeOfGP.epochDay')}: ${obj.tle1.substring(20, 28)}`,
      );
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

  private updateSatelliteAltitudeAndVelocity_(
    obj: Satellite | OemSatellite,
    satAltitudeElement: HTMLElement,
    satVelocityElement: HTMLElement,
  ): boolean {
    const gmst = ServiceLocator.getTimeManager().gmst;

    if (((obj as OemSatellite).centerBody ?? SolarBody.Earth) !== SolarBody.Earth) {
      const centerBody = ServiceLocator.getScene().getBodyById((obj as OemSatellite).centerBody) as CelestialBody | null;

      if (!centerBody) {
        errorManagerInstance.debug(`Error calculating altitude for non-Earth centered object ${obj.name}: center body not found.`);

        return false;
      }
      const position = {
        x: obj.position.x - centerBody.position[0] as Kilometers,
        y: obj.position.y - centerBody.position[1] as Kilometers,
        z: obj.position.z - centerBody.position[2] as Kilometers,
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

  private updateCovariance_(): void {
    const covMatrix = PluginRegistry.getPlugin(SelectSatManager)!.primarySatCovMatrix;

    if (!covMatrix) {
      setInnerHtml(EL.UNCERTAINTY_RADIAL, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.UNCERTAINTY_CROSSTRACK, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.UNCERTAINTY_INTRACK, t7e('SatInfoBoxOrbital.unknown'));

      return;
    }

    let covRadial = covMatrix[0];
    let covCrossTrack = covMatrix[1];
    let covInTrack = covMatrix[2];

    const useKm =
      covRadial > 0.5 &&
      covCrossTrack > 0.5 &&
      covInTrack > 0.5;

    if (useKm) {
      setInnerHtml(EL.UNCERTAINTY_RADIAL, `${(covMatrix[0]).toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}`);
      setInnerHtml(EL.UNCERTAINTY_CROSSTRACK, `${(covMatrix[1]).toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}`);
      setInnerHtml(EL.UNCERTAINTY_INTRACK, `${(covMatrix[2]).toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}`);
    } else {
      covRadial *= 1000;
      covCrossTrack *= 1000;
      covInTrack *= 1000;
      setInnerHtml(EL.UNCERTAINTY_RADIAL, `${covRadial.toFixed(2)} ${t7e('SatInfoBoxOrbital.meter')}`);
      setInnerHtml(EL.UNCERTAINTY_CROSSTRACK, `${covCrossTrack.toFixed(2)} ${t7e('SatInfoBoxOrbital.meter')}`);
      setInnerHtml(EL.UNCERTAINTY_INTRACK, `${covInTrack.toFixed(2)} ${t7e('SatInfoBoxOrbital.meter')}`);
    }
  }

  private updateSecondarySatellite_(obj: BaseObject): void {
    const secondarySatObj = PluginRegistry.getPlugin(SelectSatManager)!.secondarySatObj;

    if (!secondarySatObj || !obj.isSatellite()) {
      return;
    }

    const sat = obj as Satellite;
    const ric = secondarySatObj.toRIC(sat, ServiceLocator.getTimeManager().simulationTimeObj);
    const dist = SensorMath.distanceString(sat, secondarySatObj).split(' ')[2];

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
    try {
      const elements = obj.toClassicalElements();

      setInnerHtml(EL.APOGEE, `${elements.apogee.toFixed(0)} ${t7e('SatInfoBoxOrbital.kilometer')}`);
      setInnerHtml(EL.PERIGEE, `${elements.perigee.toFixed(0)} ${t7e('SatInfoBoxOrbital.kilometer')}`);
      setInnerHtml(EL.INCLINATION, `${elements.inclinationDegrees.toFixed(2)}°`);
      setInnerHtml(EL.ECCENTRICITY, elements.eccentricity.toFixed(3));
      setInnerHtml(EL.RAAN, `${elements.rightAscensionDegrees.toFixed(2)}°`);
      setInnerHtml(EL.ARG_PE, `${elements.argPerigeeDegrees.toFixed(2)}°`);

      this.updatePeriodElement_(elements.period);

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
      setInnerHtml(EL.ELSET_AGE, 'N/A');
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

      headerSpan.textContent = phaseName
        ? `${t7e('SatInfoBoxOrbital.title')} (${phaseName})`
        : t7e('SatInfoBoxOrbital.title');
    } else {
      headerSpan.textContent = t7e('SatInfoBoxOrbital.title');
    }
  }
}
