/* eslint-disable max-statements */
/* eslint-disable max-lines */
import { CoordinateTransforms } from '@app/app/analysis/coordinate-transforms';
import { SatMath } from '@app/app/analysis/sat-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { SensorMath } from '@app/app/sensors/sensor-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { CelestialBody } from '@app/engine/rendering/draw-manager/celestial-bodies/celestial-body';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, setInnerHtml } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { BaseObject, DetailedSatellite, eci2lla, Kilometers, MINUTES_PER_DAY } from '@ootk/src/main';
import { Body } from 'astronomy-engine';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { EL, SECTIONS } from './sat-info-box-orbital-html';
import { PluginRegistry } from '@app/engine/core/plugin-registry';

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
      PluginRegistry.getPlugin(SatInfoBox)!.addElement({ html: this.createOrbitalSection(), order: 4 });
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

    if (obj instanceof DetailedSatellite) {
      setInnerHtml(EL.APOGEE, `${obj.apogee.toFixed(0)} ${t7e('SatInfoBoxOrbital.kilometer')}`);
      setInnerHtml(EL.PERIGEE, `${obj.perigee.toFixed(0)} ${t7e('SatInfoBoxOrbital.kilometer')}`);
      setInnerHtml(EL.INCLINATION, `${obj.inclination.toFixed(2)}°`);
      setInnerHtml(EL.ECCENTRICITY, obj.eccentricity.toFixed(3));
      setInnerHtml(EL.RAAN, `${obj.rightAscension.toFixed(2)}°`);
      setInnerHtml(EL.ARG_PE, `${obj.argOfPerigee.toFixed(2)}°`);

      const periodDom = getEl(EL.PERIOD);

      if (periodDom) {
        periodDom.innerHTML = `${obj.period.toFixed(2)} ${t7e('SatInfoBoxOrbital.Period.min')}`;
        periodDom.dataset.position = 'top';
        periodDom.dataset.delay = '50';
        periodDom.setAttribute(
          'kt-tooltip',
          `${t7e('SatInfoBoxOrbital.Period.meanMotion')}: ${(MINUTES_PER_DAY / obj.period).toFixed(2)} ${t7e('SatInfoBoxOrbital.Period.revPerDay')}`,
        );
      }

      const now: Date | number | string = new Date();
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

      const gmst = ServiceLocator.getTimeManager().gmst;
      const lla = eci2lla(obj.position, gmst);

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
    const satAltitudeElement = getEl(EL.ALTITUDE);
    const satVelocityElement = getEl(EL.VELOCITY);

    if (satAltitudeElement && satVelocityElement) {

      if (obj instanceof DetailedSatellite || obj instanceof OemSatellite) {
        const gmst = ServiceLocator.getTimeManager().gmst;

        if (((obj as OemSatellite).centerBody ?? Body.Earth) !== Body.Earth) {
          const centerBody = ServiceLocator.getScene().getBodyById((obj as OemSatellite).centerBody) as CelestialBody | null;

          if (!centerBody) {
            errorManagerInstance.debug(`Error calculating altitude for non-Earth centered object ${obj.name}: center body not found.`);

            return;
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
      } else {
        const misl = obj as MissileObject;

        satAltitudeElement.innerHTML = `${(ServiceLocator.getSensorManager().currentTEARR?.alt ?? 0).toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}`;
        if (misl.totalVelocity) {
          satVelocityElement.innerHTML = `${misl.totalVelocity.toFixed(2)} ${t7e('SatInfoBoxOrbital.kilometer')}/${t7e('SatInfoBoxOrbital.second')}`;
        } else {
          satVelocityElement.innerHTML = t7e('SatInfoBoxOrbital.unknown');
        }
      }
    }

    const covMatrix = PluginRegistry.getPlugin(SelectSatManager)!.primarySatCovMatrix;

    if (covMatrix) {
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
    } else {
      setInnerHtml(EL.UNCERTAINTY_RADIAL, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.UNCERTAINTY_CROSSTRACK, t7e('SatInfoBoxOrbital.unknown'));
      setInnerHtml(EL.UNCERTAINTY_INTRACK, t7e('SatInfoBoxOrbital.unknown'));
    }

    const secondarySatObj = PluginRegistry.getPlugin(SelectSatManager)!.secondarySatObj;

    if (secondarySatObj && obj.isSatellite()) {
      const sat = obj as DetailedSatellite;
      const ric = CoordinateTransforms.sat2ric(secondarySatObj, sat);
      const dist = SensorMath.distanceString(sat, secondarySatObj).split(' ')[2];

      const satDistanceElement = getEl('sat-sec-dist');
      const satRadiusElement = getEl('sat-sec-rad');
      const satInTrackElement = getEl('sat-sec-intrack');
      const satCrossTrackElement = getEl('sat-sec-crosstrack');

      if (satDistanceElement && satRadiusElement && satInTrackElement && satCrossTrackElement) {
        satDistanceElement.innerHTML = `${dist} km`;
        satRadiusElement.innerHTML = `${ric.position[0].toFixed(2)}km`;
        satInTrackElement.innerHTML = `${ric.position[1].toFixed(2)}km`;
        satCrossTrackElement.innerHTML = `${ric.position[2].toFixed(2)}km`;
      } else {
        errorManagerInstance.debug('Error updating secondary satellite info!');
      }
    }
  }
}
