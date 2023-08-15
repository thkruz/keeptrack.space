import aboutPng from '@app/img/icons/about.png';
import { keepTrackContainer } from '@app/js/container';
import { CatalogManager, GetSatType, SatObject, Singletons, UiManager } from '@app/js/interfaces';
import { keepTrackApi, KeepTrackApiMethods } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { showLoading } from '@app/js/lib/showLoading';
import { DrawManager } from '@app/js/singletons/draw-manager';
import { TimeManager } from '@app/js/singletons/time-manager';
import { CoordinateTransforms } from '@app/js/static/coordinate-transforms';
import { SatMath } from '@app/js/static/sat-math';
import { EciVec3, Hours, Kilometers, Milliseconds, Minutes, Seconds, Sgp4 } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class DebrisScreening extends KeepTrackPlugin {
  bottomIconCallback = () => {
    if (!this.verifySatelliteSelected()) return;

    if (this.isMenuButtonEnabled) {
      const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

      const sat: SatObject = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat, GetSatType.EXTRA_ONLY);
      (<HTMLInputElement>getEl(`${this.formPrefix_}-scc`)).value = sat.sccNum;
    }
  };

  formPrefix_ = 'ds';
  bottomIconElementName = 'debris-screening-icon';
  bottomIconImg = aboutPng;
  bottomIconLabel = 'Debris Screening';
  sideMenuElementName = 'debris-screening-menu';
  sideMenuElementHtml = keepTrackApi.html`
  <div id="${this.sideMenuElementName}" class="side-menu-parent start-hidden text-select">
    <div id="${this.sideMenuElementName}-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Debris Screening</h5>
        <form id="${this.sideMenuElementName}-form" class="col s12">
          <div class="input-field col s12">
            <input disabled value="00005" id="${this.formPrefix_}-scc" type="text" />
            <label for="disabled" class="active">Satellite SCC#</label>
          </div>
          <div class="input-field col s12">
            <select id="${this.formPrefix_}-u">
              <option value="0.25">0.25 Km</option>
              <option value="0.5" selected>0.5 Km</option>
              <option value="0.75">0.75 Km</option>
              <option value="1">1 Km</option>
              <option value="1.25">1.25 Km</option>
              <option value="1.5">1.5 Km</option>
            </select>
            <label>U (Radial)</label>
          </div>
          <div class="input-field col s12">
            <select id="${this.formPrefix_}-v">
              <option value="10">10 Km</option>
              <option value="15">15 Km</option>
              <option value="20">20 Km</option>
              <option value="25" selected>25 Km</option>
              <option value="30">30 Km</option>
              <option value="35">35 Km</option>
              <option value="40">40 Km</option>
            </select>
            <label>V (Velocity Vector)</label>
          </div>
          <div class="input-field col s12">
            <select id="${this.formPrefix_}-w">
              <option value="10">10 Km</option>
              <option value="15">15 Km</option>
              <option value="20">20 Km</option>
              <option value="25" selected>25 Km</option>
              <option value="30">30 Km</option>
              <option value="35">35 Km</option>
              <option value="40">40 Km</option>
            </select>
            <label>W (Out-of-Plane)</label>
          </div>
          <div class="input-field col s12">
            <select id="${this.formPrefix_}-time">
              <option value="1">1 Hour</option>
              <option value="4">4 Hours</option>
              <option value="8" selected>8 Hours</option>
              <option value="24">24 Hours</option>
              <option value="48">48 Hours</option>
              <option value="72">72 Hours</option>
            </select>
            <label>Assessment Length</label>
          </div>
          <div class="row">
            <div class="center-align">
              <button id="${this.sideMenuElementName}-vis" class="btn btn-ui waves-effect waves-light">Draw Search Box &#9658;</button>
            </div>
          </div>
          <div class="row">
            <div class="center-align">
              <button id="${this.sideMenuElementName}-clear-vis" class="btn btn-ui waves-effect waves-light">Clear Search Box &#9658;</button>
            </div>
          </div>
          <div class="row">
            <div class="center-align">
              <button class="btn btn-ui waves-effect waves-light" type="submit" name="action">Screen for Debris &#9658;</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
`;

  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  helpTitle = `Debris Screening`;
  helpBody = keepTrackApi.html`The Debris Screening menu is used to generate a list of debris objects that could potentially be seen by a satellite. The list is generated by calculating the orbital parameters of the debris objects and comparing them to the orbital parameters of the satellite. The user can choose to generate the list using either the TLE or the SGP4 propagator. The user can also choose to filter the list by the debris object's size and the debris object's magnitude. The user can also choose to filter the list by the debris object's size and the debris object's magnitude. The user can also choose to generate the list using either the TLE or the SGP4 propagator. The user can also choose to filter the list by the debris object's size and the debris object's magnitude.`;
  helpImage = keepTrackApi.html`<img src="${aboutPng}" />
  `;

  constructor() {
    const PLUGIN_NAME = 'Debris Screening';
    super(PLUGIN_NAME);
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      method: KeepTrackApiMethods.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl(`${this.sideMenuElementName}-form`).addEventListener('submit', (e: Event) => {
          e.preventDefault();
          showLoading(() => this.onFormSubmit());
        });
        getEl(`${this.sideMenuElementName}-vis`).addEventListener('click', (e: Event) => {
          e.preventDefault();
          showLoading(() => this.onVisClick());
        });
        getEl(`${this.sideMenuElementName}-clear-vis`).addEventListener('click', (e: Event) => {
          e.preventDefault();
          showLoading(() => DebrisScreening.onClearVisClick());
        });
      },
    });

    keepTrackApi.register({
      method: KeepTrackApiMethods.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (sat: SatObject): void => {
        if (sat) {
          this.setBottomIconToEnabled();
        } else {
          this.setBottomIconToDisabled();
        }
      },
    });
  }

  onVisClick(): void {
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    const uVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-u`)).value);
    const vVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-v`)).value);
    const wVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-w`)).value);

    drawManagerInstance.sceneManager.searchBox.setCubeSize(<Kilometers>uVal, <Kilometers>vVal, <Kilometers>wVal);
  }

  static onClearVisClick(): void {
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    drawManagerInstance.sceneManager.searchBox.setCubeSize(<Kilometers>0, <Kilometers>0, <Kilometers>0);
  }

  onFormSubmit(): void {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    const timeManagerInstance = keepTrackContainer.get<TimeManager>(Singletons.TimeManager);

    let satId = catalogManagerInstance.getIdFromObjNum(parseInt((<HTMLInputElement>getEl(`${this.formPrefix_}-scc`)).value));

    const uVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-u`)).value);
    const vVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-v`)).value);
    const wVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-w`)).value);
    const timeVal = <Hours>parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-time`)).value);
    const sat = catalogManagerInstance.getSat(satId, GetSatType.SKIP_POS_VEL);

    const possibleSats = catalogManagerInstance.satData
      .filter((sat2) => {
        if (!sat2.satrec) return false;
        if (sat2.perigee > sat.apogee) return false;
        if (sat.perigee > sat2.apogee) return false;

        return true;
      })
      .map((sat2) => sat2.id);

    let offset = <Milliseconds>0;
    let searchList = <string[]>[];
    for (let t = <Minutes>0; t < <Seconds>(timeVal * 60); t++) {
      offset = <Milliseconds>(t * 1000 * 60);
      const now = timeManagerInstance.getOffsetTimeObj(offset);
      const { m } = SatMath.calculateTimeVariables(now, sat.satrec);
      const satSv = Sgp4.propagate(sat.satrec, m) as { position: EciVec3; velocity: EciVec3 };

      for (let idx = 0; idx < possibleSats.length; idx++) {
        const sat2 = catalogManagerInstance.getSat(possibleSats[idx], GetSatType.SKIP_POS_VEL);
        if (!sat2 || !sat2.satrec) continue;

        const { m } = SatMath.calculateTimeVariables(now, sat2.satrec);
        const sat2Sv = Sgp4.propagate(sat2.satrec, m) as { position: EciVec3; velocity: EciVec3 };
        if (!sat2Sv) {
          // Remove from possible sats
          possibleSats.splice(idx, 1);
          break;
        }

        const ric = CoordinateTransforms.sat2ric({ position: satSv.position, velocity: satSv.velocity }, { position: sat2Sv.position, velocity: sat2Sv.velocity });

        if (Math.abs(ric.position[0]) < uVal && Math.abs(ric.position[1]) < vVal && Math.abs(ric.position[2]) < wVal) {
          console.log(`${sat2.sccNum} at ${new Date(now)}`);
          searchList.push(sat2.sccNum);
          // Remove from possible sats
          possibleSats.splice(idx, 1);
          break;
        }
      }
    }

    // Remove duplicates
    searchList = searchList.filter((v, i, a) => a.indexOf(v) === i);

    const searchStr = searchList.join(',');
    // Remove trailing comma
    searchStr.replace(/,\s*$/u, '');
    uiManagerInstance.doSearch(searchStr);
  }
}

export const debrisScreeningPlugin = new DebrisScreening();
