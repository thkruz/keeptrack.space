import { GetSatType, KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { showLoading } from '@app/lib/showLoading';
import { CatalogManager } from '@app/singletons/catalog-manager';
import { errorManagerInstance } from '@app/singletons/errorManager';
import breakupPng from '@public/img/icons/breakup.png';

import { OrbitFinder } from '@app/singletons/orbit-finder';
import { TimeManager } from '@app/singletons/time-manager';
import { CoordinateTransforms } from '@app/static/coordinate-transforms';
import { SatMath } from '@app/static/sat-math';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { BaseObject, DetailedSatellite, Kilometers, SatelliteRecord, Sgp4, Tle, TleLine1, TleLine2 } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class Breakup extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Breakup';
  dependencies = [SelectSatManager.PLUGIN_NAME];
  private selectSatManager_: SelectSatManager;

  constructor() {
    super(Breakup.PLUGIN_NAME);
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  bottomIconElementName = 'menu-breakup';
  bottomIconLabel = 'Create Breakup';
  bottomIconImg = breakupPng;
  private readonly maxDifApogeeVsPerigee_ = 1000;

  bottomIconCallback = (): void => {
    const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);
    if (!obj?.isSatellite()) return;

    const sat = obj as DetailedSatellite;
    if (sat?.apogee - sat?.perigee > this.maxDifApogeeVsPerigee_) {
      errorManagerInstance.warn('Cannot create a breakup for non-circular orbits. Working on a fix.');
      this.closeSideMenu();
      this.setBottomIconToDisabled();
      return;
    }
    this.updateSccNumInMenu_();
  };

  dragOptions: clickDragOptions = {
    isDraggable: true,
  };

  sideMenuElementName: string = 'breakup-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="breakup-menu" class="side-menu-parent start-hidden text-select">
    <div id="breakup-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Breakup Simulator</h5>
        <form id="breakup" class="col s12">
          <div class="input-field col s12">
            <input disabled value="00005" id="hc-scc" type="text" />
            <label for="disabled" class="active">Satellite SCC#</label>
          </div>
          <div class="input-field col s12">
            <select id="hc-inc">
              <option value="0">0 Degrees</option>
              <option value="0.1">0.1 Degrees</option>
              <option value="0.2" selected>0.2 Degrees</option>
              <option value="0.3">0.3 Degrees</option>
              <option value="0.4">0.4 Degrees</option>
              <option value="0.5">0.5 Degrees</option>
              <option value="0.6">0.6 Degrees</option>
              <option value="0.7">0.7 Degrees</option>
              <option value="0.8">0.8 Degrees</option>
              <option value="0.9">0.9 Degrees</option>
              <option value="1">1 Degrees</option>
            </select>
            <label>Inclination Variation</label>
          </div>
          <div class="input-field col s12">
            <select id="hc-per">
              <option value="0">0 Percent</option>
              <option value="0.005">0.5 Percent</option>
              <option value="0.01">1 Percent</option>
              <option value="0.015">1.5 Percent</option>
              <option value="0.02" selected>2 Percent</option>
              <option value="0.025">2.5 Percent</option>
              <option value="0.03">3 Percent</option>
              <option value="0.035">3.5 Percent</option>
              <option value="0.04">4 Percent</option>
              <option value="0.045">4.5 Percent</option>
              <option value="0.05">5 Percent</option>
            </select>
            <label>Period Variation</label>
          </div>
          <div class="input-field col s12">
            <select id="hc-raan">
            <option value="0">0 Degrees</option>
              <option value="0.1">0.1 Degrees</option>
              <option value="0.2" selected>0.2 Degrees</option>
              <option value="0.3">0.3 Degrees</option>
              <option value="0.4">0.4 Degrees</option>
              <option value="0.5">0.5 Degrees</option>
              <option value="0.6">0.6 Degrees</option>
              <option value="0.7">0.7 Degrees</option>
              <option value="0.8">0.8 Degrees</option>
              <option value="0.9">0.9 Degrees</option>
              <option value="1">1 Degrees</option>
            </select>
            <label>Right Ascension Variation</label>
          </div>
          <div class="input-field col s12">
            <select id="hc-count">
              <option value="10">10</option>
              <option value="25" selected>25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
            </select>
            <label>Pieces</label>
          </div>
          <div class="center-align">
            <button class="btn btn-ui waves-effect waves-light" type="submit" name="action">Create Breakup &#9658;</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  helpTitle = `Breakup Menu`;
  helpBody = keepTrackApi.html`The Breakup Menu is a tool for simulating the breakup of a satellite.
  <br><br>
  By modifying duplicating and modifying a satellite's orbit we can model the breakup of a satellite.
  After selecting a satellite and opening the menu, the user can select:
  <ul style="margin-left: 40px;">
    <li>Inclination Variation</li>
    <li>RAAN Variation</li>
    <li>Period Variation</li>
    <li>Number of Breakup Pieces</li>
  </ul>
  The larger the variation the bigger the spread in the simulated breakup. The default variations are sufficient to simulate a breakup with a reasonable spread.`;

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('breakup').addEventListener('submit', (e: Event) => {
          e.preventDefault();
          showLoading(() => this.onSubmit_());
        });
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (sat: BaseObject) => {
        if (!sat?.isSatellite()) {
          if (this.isMenuButtonActive) {
            this.closeSideMenu();
          }
          this.setBottomIconToUnselected();
          this.setBottomIconToDisabled();
        } else if ((sat as DetailedSatellite)?.apogee - (sat as DetailedSatellite)?.perigee > this.maxDifApogeeVsPerigee_) {
          if (this.isMenuButtonActive) {
            this.closeSideMenu();
            errorManagerInstance.warn('Cannot create a breakup for non-circular orbits. Working on a fix.');
          }
          this.setBottomIconToUnselected();
          this.setBottomIconToDisabled();
        } else {
          this.setBottomIconToEnabled();
          if (this.isMenuButtonActive) {
            this.updateSccNumInMenu_();
          }
        }
      },
    });
  }

  private updateSccNumInMenu_() {
    if (!this.isMenuButtonActive) return;
    const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);
    if (!obj?.isSatellite()) return;
    (<HTMLInputElement>getEl('hc-scc')).value = (obj as DetailedSatellite).sccNum;
  }

  private onSubmit_(): void {
    const { simulationTimeObj } = keepTrackApi.getTimeManager();
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    const { satId, breakupCount, rascVariation, incVariation, meanmoVariation } = Breakup.getFormData_(catalogManagerInstance);
    const mainsat = catalogManagerInstance.getSat(satId);
    const origsat = mainsat;

    // Launch Points are the Satellites Current Location
    const lla = CoordinateTransforms.eci2lla(mainsat.position, simulationTimeObj);
    const launchLat = lla.lat;
    const launchLon = lla.lon;

    const upOrDown = SatMath.getDirection(mainsat, simulationTimeObj);
    if (upOrDown === 'Error') {
      errorManagerInstance.warn('Cannot calculate direction of satellite. Try again later.');
    }

    const currentEpoch = TimeManager.currentEpoch(simulationTimeObj);
    mainsat.tle1 = (mainsat.tle1.substring(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.tle1.substring(32)) as TleLine1;

    keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false;

    if (mainsat.apogee - mainsat.perigee > this.maxDifApogeeVsPerigee_) {
      errorManagerInstance.warn('Cannot create a breakup for non-circular orbits. Working on a fix.');
      return;
    }

    const alt = mainsat.apogee - mainsat.perigee < 300 ? 0 : lla.alt; // Ignore argument of perigee for round orbits OPTIMIZE
    let tles = new OrbitFinder(mainsat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj, alt as Kilometers).rotateOrbitToLatLon();
    const tle1 = tles[0];
    const tle2 = tles[1];
    catalogManagerInstance.satCruncher.postMessage({
      typ: CruncerMessageTypes.SAT_EDIT,
      id: satId,
      tle1: tle1,
      tle2: tle2,
    });
    const orbitManagerInstance = keepTrackApi.getOrbitManager();
    orbitManagerInstance.changeOrbitBufferData(satId, tle1, tle2);

    const eVariation = 0.00015;
    const origEcc = mainsat.eccentricity;

    // TODO: Use the values from getOrbitByLatLon (meana, raan, and rasc) to speed this up.

    // NOTE: Previously we used - settingsManager.maxAnalystSats;
    let i = 0;
    for (let rascIterat = 0; rascIterat <= 4; rascIterat++) {
      if (i >= breakupCount) break;
      const a5Num = Tle.convert6DigitToA5((CatalogManager.ANALYST_START_ID + i).toString());
      const id = catalogManagerInstance.sccNum2Id(a5Num);
      catalogManagerInstance.getObject(id); // TODO: This may be unnecessary needs tested
      let sat = origsat;
      // Is this needed? -- let itle1 = '1 ' + (80000 + i) + tle1.substr(7) ??

      const rascOffset = -rascVariation / 2 + rascVariation * (rascIterat / 4);
      const newAlt = mainsat.apogee - mainsat.perigee < 300 ? 0 : lla.alt; // Ignore argument of perigee for round orbits OPTIMIZE
      let iTLEs = new OrbitFinder(sat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj, newAlt as Kilometers, rascOffset).rotateOrbitToLatLon();

      if (iTLEs[0] === 'Error') {
        // Try a second time with a slightly different time
        // TODO: There should be a more elegant way to do this
        // I think a flag that has the orbit finder try to find a solution with more granularity would be better than
        // just trying again with a different time.
        iTLEs = new OrbitFinder(sat, launchLat, launchLon, <'N' | 'S'>upOrDown, new Date(simulationTimeObj.getTime() + 1), newAlt as Kilometers, rascOffset).rotateOrbitToLatLon();
        if (iTLEs[0] === 'Error') {
          errorManagerInstance.error(new Error(iTLEs[1]), 'breakup.ts', 'Error creating breakup!');
          return;
        }
      }

      let iTle1 = iTLEs[0];
      let iTle2 = iTLEs[1];
      for (; i < ((rascIterat + 1) * breakupCount) / 4; i++) {
        // Inclination
        let inc = parseFloat(tle2.substring(8, 16));
        inc = inc + Math.random() * incVariation * 2 - incVariation;
        const incStr = inc.toFixed(4).padStart(8, '0');
        if (incStr.length !== 8) throw new Error(`Inclination length is not 8 - ${incStr} - ${tle2}`);

        // Ecentricity
        sat.eccentricity = origEcc;
        sat.eccentricity += Math.random() * eVariation * 2 - eVariation;

        // Mean Motion
        let meanmo = parseFloat(iTle2.substring(52, 62));
        meanmo = meanmo + Math.random() * meanmoVariation * 2 - meanmoVariation;
        const meanmoStr = meanmo.toFixed(8).padStart(11, '0');
        if (meanmoStr.length !== 11) throw new Error(`meanmo length is not 11 - ${meanmoStr} - ${iTle2}`);

        const a5Num = Tle.convert6DigitToA5((CatalogManager.ANALYST_START_ID + i).toString());
        const satId = catalogManagerInstance.sccNum2Id(a5Num);
        iTle1 = `1 ${a5Num}` + iTle1.substring(7);
        iTle2 = `2 ${a5Num} ${incStr} ${iTle2.substring(17, 52)}${meanmoStr}${iTle2.substring(63)}`;

        if (iTle1.length !== 69) throw new Error(`Invalid tle1: length is not 69 - ${iTle1}`);
        if (iTle2.length !== 69) throw new Error(`Invalid tle1: length is not 69 - ${iTle2}`);

        sat = catalogManagerInstance.getSat(satId);
        sat.tle1 = iTle1 as TleLine1;
        sat.tle2 = iTle2 as TleLine2;
        sat.active = true;

        // Prevent caching of old TLEs
        sat.satrec = null;

        let satrec: SatelliteRecord;
        try {
          satrec = Sgp4.createSatrec(iTle1, iTle2);
        } catch (e) {
          errorManagerInstance.error(e, 'breakup.ts', 'Error creating breakup!');
          return;
        }

        if (SatMath.altitudeCheck(satrec, simulationTimeObj) > 1) {
          catalogManagerInstance.satCruncher.postMessage({
            typ: CruncerMessageTypes.SAT_EDIT,
            id: satId,
            active: true,
            tle1: iTle1,
            tle2: iTle2,
          });
          orbitManagerInstance.changeOrbitBufferData(satId, iTle1, iTle2);
        } else {
          errorManagerInstance.warn('Breakup Generator Failed');
        }
      }
    }

    if (breakupCount > settingsManager.searchLimit) {
      settingsManager.searchLimit = breakupCount;
    }
    keepTrackApi.getUiManager().doSearch(`${mainsat.sccNum},Analyst`);
  }

  private static getFormData_(catalogManagerInstance: CatalogManager) {
    const satId = catalogManagerInstance.sccNum2Id((<HTMLInputElement>getEl('hc-scc')).value);
    const meanmoVariation = parseFloat((<HTMLInputElement>getEl('hc-per')).value);
    const incVariation = parseFloat((<HTMLInputElement>getEl('hc-inc')).value);
    const rascVariation = parseFloat((<HTMLInputElement>getEl('hc-raan')).value);
    const breakupCount = parseInt((<HTMLInputElement>getEl('hc-count')).value);
    return { satId, breakupCount, rascVariation, incVariation, meanmoVariation };
  }
}
