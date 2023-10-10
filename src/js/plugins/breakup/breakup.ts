import breakupPng from '@app/img/icons/breakup.png';
import { keepTrackContainer } from '@app/js/container';
import { GetSatType, OrbitManager, SatObject, Singletons } from '@app/js/interfaces';
import { KeepTrackApiMethods, keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { showLoading } from '@app/js/lib/showLoading';
import { StringPad } from '@app/js/lib/stringPad';
import { errorManagerInstance } from '@app/js/singletons/errorManager';

import { OrbitFinder } from '@app/js/singletons/orbit-finder';
import { TimeManager } from '@app/js/singletons/time-manager';
import { CoordinateTransforms } from '@app/js/static/coordinate-transforms';
import { SatMath } from '@app/js/static/sat-math';
import { SatelliteRecord, Sgp4, TleLine1, TleLine2 } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';

export class Breakup extends KeepTrackPlugin {
  bottomIconElementName = 'menu-breakup';
  bottomIconLabel = 'Create Breakup';
  bottomIconImg = breakupPng;
  private readonly maxDifApogeeVsPerigee_ = 1000;

  bottomIconCallback = (): void => {
    const sat: SatObject = keepTrackApi.getCatalogManager().getSat(keepTrackApi.getCatalogManager().selectedSat, GetSatType.EXTRA_ONLY);
    if (sat?.apogee - sat?.perigee > this.maxDifApogeeVsPerigee_) {
      errorManagerInstance.warn('Cannot create a breakup for non-circular orbits. Working on a fix.');
      this.closeSideMenu();
      this.setBottomIconToDisabled();
      return;
    }
    this.updateSccNumInMenu_();
  };

  static PLUGIN_NAME = 'Breakup';

  constructor() {
    super(Breakup.PLUGIN_NAME);
  }

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

  private updateSccNumInMenu_() {
    if (!this.isMenuButtonEnabled) return;
    const sat: SatObject = keepTrackApi.getCatalogManager().getSat(keepTrackApi.getCatalogManager().selectedSat, GetSatType.EXTRA_ONLY);
    (<HTMLInputElement>getEl('hc-scc')).value = sat.sccNum;
  }

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      method: KeepTrackApiMethods.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('breakup').addEventListener('submit', (e: Event) => {
          e.preventDefault();
          showLoading(() => this.onSubmit());
        });
      },
    });

    keepTrackApi.register({
      method: KeepTrackApiMethods.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (sat: SatObject) => {
        if (!sat?.sccNum) {
          if (this.isMenuButtonEnabled) {
            this.closeSideMenu();
          }
          this.setBottomIconToUnselected();
          this.setBottomIconToDisabled();
        } else if (sat?.apogee - sat?.perigee > this.maxDifApogeeVsPerigee_) {
          if (this.isMenuButtonEnabled) {
            this.closeSideMenu();
            errorManagerInstance.warn('Cannot create a breakup for non-circular orbits. Working on a fix.');
          }
          this.setBottomIconToUnselected();
          this.setBottomIconToDisabled();
        } else {
          this.setBottomIconToEnabled();
          if (this.isMenuButtonEnabled) {
            this.updateSccNumInMenu_();
          }
        }
      },
    });
  }

  onSubmit(): void {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    let satId = catalogManagerInstance.getIdFromObjNum(parseInt((<HTMLInputElement>getEl('hc-scc')).value));
    const mainsat: SatObject = catalogManagerInstance.getSat(satId);
    const origsat = mainsat;

    // Launch Points are the Satellites Current Location
    const lla = CoordinateTransforms.eci2lla(mainsat.position, timeManagerInstance.simulationTimeObj);
    const launchLat = lla.lat;
    const launchLon = lla.lon;

    const simulationTimeObj = timeManagerInstance.simulationTimeObj;

    const upOrDown = SatMath.getDirection(mainsat, timeManagerInstance.simulationTimeObj);
    if (upOrDown === 'Error') {
      errorManagerInstance.warn('Cannot calculate direction of satellite. Try again later.');
    }

    const currentEpoch = TimeManager.currentEpoch(simulationTimeObj);
    mainsat.TLE1 = (mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32)) as TleLine1;

    keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false;

    if (mainsat.apogee - mainsat.perigee > this.maxDifApogeeVsPerigee_) {
      errorManagerInstance.warn('Cannot create a breakup for non-circular orbits. Working on a fix.');
      return;
    }

    const alt = mainsat.apogee - mainsat.perigee < 300 ? 0 : lla.alt; // Ignore argument of perigee for round orbits OPTIMIZE
    let TLEs = new OrbitFinder(mainsat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj, alt).rotateOrbitToLatLon();
    const TLE1 = TLEs[0];
    const TLE2 = TLEs[1];
    catalogManagerInstance.satCruncher.postMessage({
      typ: 'satEdit',
      id: satId,
      TLE1: TLE1,
      TLE2: TLE2,
    });
    const orbitManagerInstance = keepTrackContainer.get<OrbitManager>(Singletons.OrbitManager);
    orbitManagerInstance.changeOrbitBufferData(satId, TLE1, TLE2);

    const meanmoVariation = parseFloat(<string>(<HTMLInputElement>getEl('hc-per')).value);
    const incVariation = parseFloat(<string>(<HTMLInputElement>getEl('hc-inc')).value);
    const rascVariation = parseFloat(<string>(<HTMLInputElement>getEl('hc-raan')).value);
    const breakupCount = parseInt(<string>(<HTMLInputElement>getEl('hc-count')).value);
    const eVariation = 0.00015;
    const origEcc = mainsat.eccentricity;

    // TODO: Use the values from getOrbitByLatLon (meana, raan, and rasc) to speed this up.

    // NOTE: Previously we used - settingsManager.maxAnalystSats;
    let i = 0;
    for (let rascIterat = 0; rascIterat <= 4; rascIterat++) {
      if (i >= breakupCount) break;
      satId = catalogManagerInstance.getIdFromObjNum(90000 + i);
      catalogManagerInstance.getSat(satId); // TODO: This may be unnecessary needs tested
      let sat = origsat;
      // Is this needed? -- let iTLE1 = '1 ' + (80000 + i) + TLE1.substr(7) ??

      const rascOffset = -rascVariation / 2 + rascVariation * (rascIterat / 4);
      const newAlt = mainsat.apogee - mainsat.perigee < 300 ? 0 : lla.alt; // Ignore argument of perigee for round orbits OPTIMIZE
      let iTLEs = new OrbitFinder(sat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj, newAlt, rascOffset).rotateOrbitToLatLon();

      if (iTLEs[0] === 'Error') {
        // Try a second time with a slightly different time
        // TODO: There should be a more elegant way to do this
        // I think a flag that has the orbit finder try to find a solution with more granularity would be better than
        // just trying again with a different time.
        iTLEs = new OrbitFinder(sat, launchLat, launchLon, <'N' | 'S'>upOrDown, new Date(simulationTimeObj.getTime() + 1), newAlt, rascOffset).rotateOrbitToLatLon();
        if (iTLEs[0] === 'Error') {
          errorManagerInstance.error(new Error(iTLEs[1]), 'breakup.ts', 'Error creating breakup!');
          return;
        }
      }

      let iTLE1 = iTLEs[0];
      let iTLE2 = iTLEs[1];
      for (; i < ((rascIterat + 1) * breakupCount) / 4; i++) {
        // Inclination
        let inc = parseFloat(TLE2.substr(8, 8));
        inc = inc + Math.random() * incVariation * 2 - incVariation;
        const incStr = StringPad.pad0(inc.toFixed(4), 8);
        if (incStr.length !== 8) throw new Error(`Inclination length is not 8 - ${incStr} - ${TLE2}`);

        // Ecentricity
        sat.eccentricity = origEcc;
        sat.eccentricity += Math.random() * eVariation * 2 - eVariation;

        // Mean Motion
        let meanmo = parseFloat(iTLE2.substr(52, 10));
        meanmo = meanmo + Math.random() * meanmoVariation * 2 - meanmoVariation;
        // const meanmoStr = stringPad.pad0(meanmo.toPrecision(10), 8);
        const meanmoStr = StringPad.pad0(meanmo.toFixed(8), 11);
        if (meanmoStr.length !== 11) throw new Error(`meanmo length is not 11 - ${meanmoStr} - ${iTLE2}`);

        satId = catalogManagerInstance.getIdFromObjNum(80000 + i);
        iTLE1 = `1 ${80000 + i}` + iTLE1.substr(7);
        iTLE2 = `2 ${80000 + i} ${incStr} ${iTLE2.substr(17, 35)}${meanmoStr}${iTLE2.substr(63)}`;

        if (iTLE1.length !== 69) throw new Error(`Invalid TLE1: length is not 69 - ${iTLE1}`);
        if (iTLE2.length !== 69) throw new Error(`Invalid TLE1: length is not 69 - ${iTLE2}`);

        sat = catalogManagerInstance.getSat(satId);
        sat.TLE1 = iTLE1 as TleLine1;
        sat.TLE2 = iTLE2 as TleLine2;
        sat.active = true;

        // Prevent caching of old TLEs
        sat.satrec = null;

        let satrec: SatelliteRecord;
        try {
          satrec = Sgp4.createSatrec(iTLE1, iTLE2);
        } catch (e) {
          errorManagerInstance.error(e, 'breakup.ts', 'Error creating breakup!');
          return;
        }

        if (SatMath.altitudeCheck(satrec, timeManagerInstance.simulationTimeObj) > 1) {
          catalogManagerInstance.satCruncher.postMessage({
            typ: 'satEdit',
            id: satId,
            TLE1: iTLE1,
            TLE2: iTLE2,
          });
          orbitManagerInstance.changeOrbitBufferData(satId, iTLE1, iTLE2);
        } else {
          errorManagerInstance.warn('Breakup Generator Failed');
        }
      }
    }

    keepTrackApi.getUiManager().doSearch(`${mainsat.sccNum},Analyst`);
  }
}

export const breakupPlugin = new Breakup();
