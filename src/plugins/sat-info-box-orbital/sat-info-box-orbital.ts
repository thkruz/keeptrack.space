/* eslint-disable max-lines */
import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { DetailedSatellite, MINUTES_PER_DAY } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';

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

    keepTrackApi.on(KeepTrackApiEvents.satInfoBoxInit, () => {
      keepTrackApi.getPlugin(SatInfoBox)!.addElement({ html: this.createOrbitalSection(), order: 4 });
    });
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.on(KeepTrackApiEvents.satInfoBoxAddListeners, this.satInfoBoxAddListeners_.bind(this));
    keepTrackApi.on(KeepTrackApiEvents.selectSatData, this.updateOrbitData_.bind(this));
  }

  private satInfoBoxAddListeners_() {
    const satInfoBoxPlugin = keepTrackApi.getPlugin(SatInfoBox)!;

    satInfoBoxPlugin.addListenerToCollapseElement(getEl(`${SECTIONS.ORBITAL}`), { value: this.isOrbitalSectionCollapsed_ });
  }

  private createOrbitalSection(): string {
    return keepTrackApi.html`
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

    return rows.map((row) => keepTrackApi.html`
        <div class="sat-info-row sat-only-info">
          <div class="sat-info-key" data-tooltip="${row.tooltip}">${row.key}</div>
          <div class="sat-info-value" id="${row.id}">${row.value}</div>
        </div>
      `).join('');
  }

  private updateOrbitData_(sat: DetailedSatellite): void {
    if (sat === null || typeof sat === 'undefined') {
      return;
    }

    if (sat.isSatellite()) {
      getEl(EL.APOGEE)!.innerHTML = `${sat.apogee.toFixed(0)} km`;
      getEl(EL.PERIGEE)!.innerHTML = `${sat.perigee.toFixed(0)} km`;
      getEl(EL.INCLINATION)!.innerHTML = `${sat.inclination.toFixed(2)}°`;
      getEl(EL.ECCENTRICITY)!.innerHTML = sat.eccentricity.toFixed(3);
      getEl(EL.RAAN)!.innerHTML = `${sat.rightAscension.toFixed(2)}°`;
      getEl(EL.ARG_PE)!.innerHTML = `${sat.argOfPerigee.toFixed(2)}°`;

      const periodDom = getEl(EL.PERIOD)!;

      periodDom.innerHTML = `${sat.period.toFixed(2)} min`;
      periodDom.dataset.position = 'top';
      periodDom.dataset.delay = '50';
      periodDom.dataset.tooltip = `Mean Motion: ${(MINUTES_PER_DAY / sat.period).toFixed(2)}`;

      const now: Date | number | string = new Date();
      const daysold = sat.ageOfElset(now);
      const age = daysold >= 1 ? daysold : daysold * 24;
      const units = daysold >= 1 ? 'Days' : 'Hours';
      const elsetAgeDom = getEl(EL.ELSET_AGE)!;

      elsetAgeDom.innerHTML = `${age.toFixed(2)} ${units}`;

      elsetAgeDom.dataset.position = 'top';
      elsetAgeDom.dataset.delay = '50';
      elsetAgeDom.dataset.tooltip = `Epoch Year: ${sat.tle1.substr(18, 2).toString()} Day: ${sat.tle1.substr(20, 8).toString()}`;
    }
  }
}
