/* eslint-disable max-lines */
import { CoordinateTransforms } from '@app/app/analysis/coordinate-transforms';
import { SatMath } from '@app/app/analysis/sat-math';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { SensorMath } from '@app/app/sensors/sensor-math';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl, setInnerHtml } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { BaseObject, DetailedSatellite, eci2lla, MINUTES_PER_DAY } from 'ootk';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { html } from '@app/engine/utils/development/formatter';

const SECTIONS = {
  ORBITAL: 'orbital-section',
};

const EL = {
  LATITUDE: 'sat-latitude',
  LONGITUDE: 'sat-longitude',
  ALTITUDE: 'sat-altitude',
  PERIOD: 'sat-period',
  VELOCITY: 'sat-velocity',
  INCLINATION: 'sat-inclination',
  ECCENTRICITY: 'sat-eccentricity',
  RAAN: 'sat-raan',
  ARG_PE: 'sat-argPe',
  MEAN_ANOMALY: 'sat-meanAnomaly',
  APOGEE: 'sat-apogee',
  PERIGEE: 'sat-perigee',
  ELSET_AGE: 'sat-elset-age',
  UNCERTAINTY_RADIAL: 'sat-uncertainty-radial',
  UNCERTAINTY_INTRACK: 'sat-uncertainty-intrack',
  UNCERTAINTY_CROSSTRACK: 'sat-uncertainty-crosstrack',
};

export class SatInfoBoxOrbital extends KeepTrackPlugin {
  readonly id = 'SatInfoBoxOrbital';
  dependencies_: string[] = [SatInfoBox.name];

  // Starting values of the collapsable sections
  private readonly isOrbitalSectionCollapsed_ = true;

  addHtml(): void {
    super.addHtml();

    keepTrackApi.on(EventBusEvent.satInfoBoxInit, () => {
      keepTrackApi.getPlugin(SatInfoBox)!.addElement({ html: this.createOrbitalSection(), order: 4 });
    });
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.on(EventBusEvent.satInfoBoxAddListeners, this.satInfoBoxAddListeners_.bind(this));
    keepTrackApi.on(EventBusEvent.selectSatData, this.updateOrbitData_.bind(this));
  }

  private satInfoBoxAddListeners_() {
    const satInfoBoxPlugin = keepTrackApi.getPlugin(SatInfoBox)!;

    satInfoBoxPlugin.addListenerToCollapseElement(getEl(`${SECTIONS.ORBITAL}`), { value: this.isOrbitalSectionCollapsed_ });
  }

  private createOrbitalSection(): string {
    return html`
        <div id="${SECTIONS.ORBITAL}">
          <div class="sat-info-section-header">
            Orbit Data
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
      { key: 'Apogee', id: EL.APOGEE, tooltip: 'Highest Point in the Orbit', value: 'xxx km' },
      { key: 'Perigee', id: EL.PERIGEE, tooltip: 'Lowest Point in the Orbit', value: 'xxx km' },
      { key: 'Inclination', id: EL.INCLINATION, tooltip: 'Angle Measured from Equator on the Ascending Node', value: 'xxx.xx' },
      { key: 'Eccentricity', id: EL.ECCENTRICITY, tooltip: 'How Circular the Orbit Is (0 is a Circle)', value: 'x.xx' },
      { key: 'Right Asc.', id: EL.RAAN, tooltip: 'Where it Rises Above the Equator', value: 'x.xx' },
      { key: 'Arg of Perigee', id: EL.ARG_PE, tooltip: 'Where the Lowest Part of the Orbit Is', value: 'x.xx' },
      { key: 'Latitude', id: EL.LATITUDE, tooltip: 'Current Latitude Over Earth', value: 'x.xx' },
      { key: 'Longitude', id: EL.LONGITUDE, tooltip: 'Current Longitude Over Earth', value: 'x.xx' },
      { key: 'Altitude', id: EL.ALTITUDE, tooltip: 'Current Altitude Above Sea Level', value: 'xxx km' },
      { key: 'Period', id: EL.PERIOD, tooltip: 'Time for One Complete Revolution Around Earth', value: 'xxx min' },
      { key: 'Velocity', id: EL.VELOCITY, tooltip: 'Current Velocity of the Satellite (Higher the Closer to Earth it Is)', value: 'xxx km/s' },
      { key: 'Age of GP', id: EL.ELSET_AGE, tooltip: 'Time Since Official Orbit Calculated (Older GPs are Less Accuarate Usually)', value: 'xxx.xxxx' },
      { key: 'Radial Sigma', id: EL.UNCERTAINTY_RADIAL, tooltip: 'Radial Uncertainty (meters)', value: 'xxx.xxxx' },
      { key: 'In Track Sigma', id: EL.UNCERTAINTY_INTRACK, tooltip: 'In Track Uncertainty (meters)', value: 'xxx.xxxx' },
      { key: 'Cross Track Sigma', id: EL.UNCERTAINTY_CROSSTRACK, tooltip: 'Cross Track Uncertainty (meters)', value: 'xxx.xxxx' },
    ];

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
      setInnerHtml(EL.APOGEE, `${obj.apogee.toFixed(0)} km`);
      setInnerHtml(EL.PERIGEE, `${obj.perigee.toFixed(0)} km`);
      setInnerHtml(EL.INCLINATION, `${obj.inclination.toFixed(2)}°`);
      setInnerHtml(EL.ECCENTRICITY, obj.eccentricity.toFixed(3));
      setInnerHtml(EL.RAAN, `${obj.rightAscension.toFixed(2)}°`);
      setInnerHtml(EL.ARG_PE, `${obj.argOfPerigee.toFixed(2)}°`);

      const periodDom = getEl(EL.PERIOD);

      if(periodDom) {
        periodDom.innerHTML = `${obj.period.toFixed(2)} min`;
        periodDom.dataset.position = 'top';
        periodDom.dataset.delay = '50';
        periodDom.dataset.tooltip = `Mean Motion: ${(MINUTES_PER_DAY / obj.period).toFixed(2)}`;
      }

      const now: Date | number | string = new Date();
      const daysold = obj.ageOfElset(now);
      const age = daysold >= 1 ? daysold : daysold * 24;
      const units = daysold >= 1 ? 'Days' : 'Hours';

      const elsetAgeDom = getEl(EL.ELSET_AGE);

      if(elsetAgeDom) {
        elsetAgeDom.innerHTML = `${age.toFixed(2)} ${units}`;
        elsetAgeDom.dataset.position = 'top';
        elsetAgeDom.dataset.delay = '50';
        elsetAgeDom.dataset.tooltip = `Epoch Year: ${obj.tle1.substr(18, 2).toString()} Day: ${obj.tle1.substr(20, 8).toString()}`;
      }

      const gmst = keepTrackApi.getTimeManager().gmst;
      const lla = eci2lla(obj.position, gmst);

      const satLonElement = getEl('sat-longitude');
      const satLatElement = getEl('sat-latitude');

      if (satLonElement && satLatElement) {
        if (lla.lon >= 0) {
          satLonElement.innerHTML = `${lla.lon.toFixed(3)}°E`;
        } else {
          satLonElement.innerHTML = `${(lla.lon * -1).toFixed(3)}°W`;
        }
        if (lla.lat >= 0) {
          satLatElement.innerHTML = `${lla.lat.toFixed(3)}°N`;
        } else {
          satLatElement.innerHTML = `${(lla.lat * -1).toFixed(3)}°S`;
        }
      }

    }
    const satAltitudeElement = getEl('sat-altitude');
    const satVelocityElement = getEl('sat-velocity');

    if (satAltitudeElement && satVelocityElement) {

      if (obj instanceof DetailedSatellite) {
        const gmst = keepTrackApi.getTimeManager().gmst;

        satAltitudeElement.innerHTML = `${SatMath.getAlt(obj.position, gmst).toFixed(2)} km`;
        satVelocityElement.innerHTML = `${obj.totalVelocity.toFixed(2)} km/s`;
      } else {
        const misl = obj as MissileObject;

        satAltitudeElement.innerHTML = `${(keepTrackApi.getSensorManager().currentTEARR?.alt ?? 0).toFixed(2)} km`;
        if (misl.totalVelocity) {
          satVelocityElement.innerHTML = `${misl.totalVelocity.toFixed(2)} km/s`;
        } else {
          satVelocityElement.innerHTML = 'Unknown';
        }
      }
    }

    const covMatrix = keepTrackApi.getPlugin(SelectSatManager)!.primarySatCovMatrix;

    if (covMatrix) {
      let covRadial = covMatrix[0];
      let covCrossTrack = covMatrix[1];
      let covInTrack = covMatrix[2];

      const useKm =
        covRadial > 0.5 &&
        covCrossTrack > 0.5 &&
        covInTrack > 0.5;

      if (useKm) {
        setInnerHtml('sat-uncertainty-radial', `${(covMatrix[0]).toFixed(2)} km`);
        setInnerHtml('sat-uncertainty-crosstrack', `${(covMatrix[1]).toFixed(2)} km`);
        setInnerHtml('sat-uncertainty-intrack', `${(covMatrix[2]).toFixed(2)} km`);
      } else {
        covRadial *= 1000;
        covCrossTrack *= 1000;
        covInTrack *= 1000;
        setInnerHtml('sat-uncertainty-radial', `${covRadial.toFixed(2)} m`);
        setInnerHtml('sat-uncertainty-crosstrack', `${covCrossTrack.toFixed(2)} m`);
        setInnerHtml('sat-uncertainty-intrack', `${covInTrack.toFixed(2)} m`);
      }
    } else {
      setInnerHtml('sat-uncertainty-radial', 'Unknown');
      setInnerHtml('sat-uncertainty-crosstrack', 'Unknown');
      setInnerHtml('sat-uncertainty-intrack', 'Unknown');
    }

    const secondarySatObj = keepTrackApi.getPlugin(SelectSatManager)!.secondarySatObj;

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
