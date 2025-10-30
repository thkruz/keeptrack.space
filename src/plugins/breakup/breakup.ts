import { OrbitFinder } from '@app/app/analysis/orbit-finder';
import { SatMath } from '@app/app/analysis/sat-math';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { BaseObject, DetailedSatellite, Kilometers, Tle, TleLine1, TleLine2, eci2lla } from '@ootk/src/main';
import streamPng from '@public/img/icons/stream.png';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class Breakup extends KeepTrackPlugin {
  readonly id = 'Breakup';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = streamPng;
  private readonly maxDifApogeeVsPerigee_ = 1000;

  bottomIconCallback = (): void => {
    const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

    if (!obj?.isSatellite()) {
      return;
    }

    const sat = obj as DetailedSatellite;

    if (sat?.apogee - sat?.perigee > this.maxDifApogeeVsPerigee_) {
      errorManagerInstance.warn(t7e('errorMsgs.Breakup.CannotCreateBreakupForNonCircularOrbits'));
      this.closeSideMenu();
      this.setBottomIconToDisabled();

      return;
    }
    this.updateSccNumInMenu_();
  };

  dragOptions: ClickDragOptions = {
    isDraggable: true,
  };

  sideMenuElementName: string = 'breakup-menu';
  sideMenuElementHtml: string = html`
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
            <input id="hc-startNum" type="text" value="90000" />
            <label for="hc-startNum" class="active">Initial Satellite Number</label>
          </div>
          <div class="input-field col s12">
            <select id="hc-inc">
              <option value="0">0 Degrees</option>
              <option value="0.005">0.005 Degrees</option>
              <option value="0.025">0.025 Degrees</option>
              <option value="0.05" selected>0.05 Degrees</option>
              <option value="0.1">0.1 Degrees</option>
              <option value="0.2">0.2 Degrees</option>
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
              <option value="0">0 Minutes</option>
              <option value="0.1" selected>0.1 Minutes</option>
              <option value="0.15">0.15 Minutes</option>
              <option value="0.25">0.25 Minutes</option>
              <option value="0.3">0.3 Minutes</option>
              <option value="0.5">0.5 Minutes</option>
              <option value="0.75">0.75 Minutes</option>
              <option value="1">1 Minute</option>
              <option value="1.5">1.5 Minutes</option>
              <option value="2">2 Minutes</option>
              <option value="2.5">2.5 Minutes</option>
              <option value="3">3 Minutes</option>
              <option value="4">4 Minutes</option>
              <option value="5">5 Minutes</option>
            </select>
            <label>Period Variation</label>
          </div>
          <div class="input-field col s12">
            <select id="hc-raan">
            <option value="0">0 Degrees</option>
              <option value="0.005">0.005 Degrees</option>
              <option value="0.025">0.025 Degrees</option>
              <option value="0.05" selected>0.05 Degrees</option>
              <option value="0.1">0.1 Degrees</option>
              <option value="0.2">0.2 Degrees</option>
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
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25" selected>25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">250</option>
              <option value="500">500</option>
              <option value="750">750</option>
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

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('breakup')!.addEventListener('submit', (e: Event) => {
          e.preventDefault();
          showLoading(() => this.onSubmit_());
        });
      },
    );

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (sat: BaseObject) => {
        if (!sat?.isSatellite()) {
          if (this.isMenuButtonActive) {
            this.closeSideMenu();
          }
          this.setBottomIconToUnselected();
          this.setBottomIconToDisabled();
        } else if ((sat as DetailedSatellite)?.apogee - (sat as DetailedSatellite)?.perigee > this.maxDifApogeeVsPerigee_) {
          if (this.isMenuButtonActive) {
            this.closeSideMenu();
            errorManagerInstance.warn(t7e('errorMsgs.Breakup.CannotCreateBreakupForNonCircularOrbits'));
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
    );
  }

  private updateSccNumInMenu_() {
    if (!this.isMenuButtonActive) {
      return;
    }
    const obj = this.selectSatManager_.getSelectedSat(GetSatType.EXTRA_ONLY);

    if (!obj?.isSatellite()) {
      return;
    }
    (<HTMLInputElement>getEl('hc-scc')).value = (obj as DetailedSatellite).sccNum;
  }

  // eslint-disable-next-line max-statements
  private onSubmit_(): void {
    const { simulationTimeObj } = ServiceLocator.getTimeManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    const { satId, breakupCount, rascVariation, incVariation, meanmoVariation, startNum } = Breakup.getFormData_(catalogManagerInstance);
    const mainsat = catalogManagerInstance.getSat(satId ?? -1);

    if (!mainsat || satId === null) {
      errorManagerInstance.warn(t7e('errorMsgs.Breakup.SatelliteNotFound'));

      return;
    }

    const origsat = mainsat;

    // Launch Points are the Satellites Current Location
    const gmst = ServiceLocator.getTimeManager().gmst;
    const lla = eci2lla(mainsat.position, gmst);
    const launchLat = lla.lat;
    const launchLon = lla.lon;

    const upOrDown = SatMath.getDirection(mainsat, simulationTimeObj);

    if (upOrDown === 'Error') {
      errorManagerInstance.warn(t7e('errorMsgs.Breakup.CannotCalcDirectionOfSatellite'));
    }

    const currentEpoch = TimeManager.currentEpoch(simulationTimeObj);

    mainsat.tle1 = (mainsat.tle1.substring(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.tle1.substring(32)) as TleLine1;

    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

    if (mainsat.apogee - mainsat.perigee > this.maxDifApogeeVsPerigee_) {
      errorManagerInstance.warn(t7e('errorMsgs.Breakup.CannotCreateBreakupForNonCircularOrbits'));

      return;
    }

    const alt = mainsat.apogee - mainsat.perigee < 300 ? 0 : lla.alt; // Ignore argument of perigee for round orbits OPTIMIZE
    const tles = new OrbitFinder(mainsat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj, alt as Kilometers).rotateOrbitToLatLon();
    const tle1 = tles[0];
    const tle2 = tles[1];

    if (tle1 === 'Error') {
      // console.error(tle2);
      errorManagerInstance.warn(t7e('errorMsgs.Breakup.ErrorCreatingBreakup'));

      return;
    }

    const newSat = new DetailedSatellite({
      ...mainsat,
      ...{
        id: satId,
        tle1,
        tle2: tle2 as TleLine2,
        active: true,
      },
    });

    catalogManagerInstance.objectCache[satId] = newSat;
    catalogManagerInstance.satCruncher.postMessage({
      typ: CruncerMessageTypes.SAT_EDIT,
      id: satId,
      tle1,
      tle2,
    });
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    orbitManagerInstance.changeOrbitBufferData(satId, tle1, tle2);

    const eVariation = 0.00015;
    const origEcc = mainsat.eccentricity;

    // TODO: Use the values from getOrbitByLatLon (meana, raan, and rasc) to speed this up.

    // NOTE: Previously we used - settingsManager.maxAnalystSats;
    let i = 0;

    for (let rascIterat = 0; rascIterat <= 4; rascIterat++) {
      if (i >= breakupCount) {
        break;
      }
      const a5Num = Tle.convert6DigitToA5((startNum + i).toString());
      const id = catalogManagerInstance.sccNum2Id(a5Num);

      catalogManagerInstance.getObject(id); // TODO: This may be unnecessary needs tested
      const sat = origsat;
      // Is this needed? -- let itle1 = '1 ' + (80000 + i) + tle1.substr(7) ??

      const rascOffset = -rascVariation / 2 + rascVariation * (rascIterat / 4);
      const newAlt = mainsat.apogee - mainsat.perigee < 300 ? 0 : lla.alt; // Ignore argument of perigee for round orbits OPTIMIZE
      let iTLEs = new OrbitFinder(sat, launchLat, launchLon, <'N' | 'S'>upOrDown, simulationTimeObj, newAlt as Kilometers, rascOffset).rotateOrbitToLatLon();

      if (iTLEs[0] === 'Error') {
        /*
         * Try a second time with a slightly different time
         * TODO: There should be a more elegant way to do this
         * I think a flag that has the orbit finder try to find a solution with more granularity would be better than
         * just trying again with a different time.
         */
        iTLEs = new OrbitFinder(sat, launchLat, launchLon, <'N' | 'S'>upOrDown, new Date(simulationTimeObj.getTime() + 1), newAlt as Kilometers, rascOffset).rotateOrbitToLatLon();
        if (iTLEs[0] === 'Error') {
          // console.error(iTLEs[1]);
          errorManagerInstance.warn(t7e('errorMsgs.Breakup.ErrorCreatingBreakup'));

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

        if (incStr.length !== 8) {
          throw new Error(`Inclination length is not 8 - ${incStr} - ${tle2}`);
        }

        // Ecentricity
        sat.eccentricity = origEcc;
        sat.eccentricity += Math.random() * eVariation * 2 - eVariation;

        // Mean Motion
        let meanmo = parseFloat(iTle2.substring(52, 62));

        meanmo = meanmo + (Math.random() * meanmoVariation * 2) - meanmoVariation;
        const meanmoStr = meanmo.toFixed(8).padStart(11, '0');

        if (meanmoStr.length !== 11) {
          throw new Error(`meanmo length is not 11 - ${meanmoStr} - ${iTle2}`);
        }

        const a5Num = Tle.convert6DigitToA5((startNum + i).toString());
        const satId = catalogManagerInstance.sccNum2Id(a5Num);

        if (!satId) {
          errorManagerInstance.warn(t7e('errorMsgs.Breakup.SatelliteNotFound'));

          return;
        }

        iTle1 = `1 ${a5Num}${iTle1.substring(7)}` as TleLine1;
        iTle2 = `2 ${a5Num} ${incStr} ${iTle2.substring(17, 52)}${meanmoStr}${iTle2.substring(63)}`;

        if (iTle1.length !== 69) {
          throw new Error(`Invalid tle1: length is not 69 - ${iTle1}`);
        }
        if (iTle2.length !== 69) {
          throw new Error(`Invalid tle1: length is not 69 - ${iTle2}`);
        }

        let newSat: DetailedSatellite;

        try {
          newSat = new DetailedSatellite({
            ...catalogManagerInstance.objectCache[satId],
            ...{
              id: satId,
              name: `Breakup Piece ${i + 1}`,
              tle1: iTle1,
              tle2: iTle2 as TleLine2,
              active: true,
            },
          });
        } catch (e) {
          errorManagerInstance.error(e, 'breakup.ts', t7e('errorMsgs.Breakup.ErrorCreatingBreakup'));

          return;
        }

        if (SatMath.altitudeCheck(newSat.satrec!, simulationTimeObj) > 1) {
          catalogManagerInstance.objectCache[satId] = newSat;
          catalogManagerInstance.satCruncher.postMessage({
            typ: CruncerMessageTypes.SAT_EDIT,
            id: satId,
            active: true,
            tle1: iTle1,
            tle2: iTle2,
          });
          orbitManagerInstance.changeOrbitBufferData(satId, iTle1, iTle2);
        } else {
          errorManagerInstance.warn(t7e('errorMsgs.Breakup.BreakupGeneratorFailed'));
        }
      }
    }

    if (breakupCount > settingsManager.searchLimit) {
      settingsManager.searchLimit = breakupCount;
    }
    ServiceLocator.getUiManager().doSearch(`${mainsat.sccNum},Breakup Piece`);
  }

  private static getFormData_(catalogManagerInstance: CatalogManager) {
    const satId = catalogManagerInstance.sccNum2Id((<HTMLInputElement>getEl('hc-scc')).value);
    const periodVariation = parseFloat((<HTMLInputElement>getEl('hc-per')).value);
    const incVariation = parseFloat((<HTMLInputElement>getEl('hc-inc')).value);
    const rascVariation = parseFloat((<HTMLInputElement>getEl('hc-raan')).value);
    const breakupCount = parseInt((<HTMLInputElement>getEl('hc-count')).value);
    let startNum = parseInt((<HTMLInputElement>getEl('hc-startNum')).value);

    if (isNaN(startNum)) {
      errorManagerInstance.warn(t7e('errorMsgs.Breakup.InvalidStartNum'));
      startNum = 90000;
    }

    const meanmoVariation = periodVariation / 1440;

    return { satId, breakupCount, rascVariation, incVariation, meanmoVariation, startNum };
  }
}
