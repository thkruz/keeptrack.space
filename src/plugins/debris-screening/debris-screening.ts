import { CoordinateTransforms } from '@app/app/analysis/coordinate-transforms';
import { SatMath } from '@app/app/analysis/sat-math';
import { GetSatType, MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { showLoading } from '@app/engine/utils/showLoading';
import { keepTrackApi } from '@app/keepTrackApi';
import { DetailedSatellite, Hours, Kilometers, Milliseconds, Minutes, PosVel, Seconds, Sgp4 } from '@ootk/src/main';
import frameInspectPng from '@public/img/icons/frame-inspect.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class DebrisScreening extends KeepTrackPlugin {
  readonly id = 'DebrisScreening';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  bottomIconCallback = () => {
    if (!this.verifySatelliteSelected()) {
      return;
    }

    if (this.isMenuButtonActive) {
      const catalogManagerInstance = ServiceLocator.getCatalogManager();

      const sat = catalogManagerInstance.getObject(this.selectSatManager_.selectedSat, GetSatType.EXTRA_ONLY) as DetailedSatellite;

      (<HTMLInputElement>getEl(`${this.formPrefix_}-scc`)).value = sat.sccNum;
    }
  };

  formPrefix_ = 'ds';

  menuMode: MenuMode[] = [MenuMode.ANALYSIS, MenuMode.ALL];

  bottomIconImg = frameInspectPng;
  sideMenuElementName = 'debris-screening-menu';
  sideMenuElementHtml = html`
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
              <option value="1" selected>1 Hour</option>
              <option value="4">4 Hours</option>
              <option value="8">8 Hours</option>
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

  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl(`${this.sideMenuElementName}-form`)!.addEventListener('submit', (e: Event) => {
          e.preventDefault();
          showLoading(() => this.onFormSubmit());
        });
        getEl(`${this.sideMenuElementName}-vis`)!.addEventListener('click', (e: Event) => {
          e.preventDefault();
          showLoading(() => this.onVisClick());
        });
        getEl(`${this.sideMenuElementName}-clear-vis`)!.addEventListener('click', (e: Event) => {
          e.preventDefault();
          showLoading(() => DebrisScreening.onClearVisClick());
        });
      },
    );
  }

  onVisClick(): void {
    const uVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-u`)).value);
    const vVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-v`)).value);
    const wVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-w`)).value);

    ServiceLocator.getScene().searchBox.setCubeSize(<Kilometers>uVal, <Kilometers>vVal, <Kilometers>wVal);
  }

  static onClearVisClick(): void {
    ServiceLocator.getScene().searchBox.setCubeSize(<Kilometers>0, <Kilometers>0, <Kilometers>0);
  }

  onFormSubmit(): void {
    const satId = ServiceLocator.getCatalogManager().sccNum2Id(parseInt((<HTMLInputElement>getEl(`${this.formPrefix_}-scc`)).value));

    const uVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-u`)).value);
    const vVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-v`)).value);
    const wVal = parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-w`)).value);
    const timeVal = <Hours>parseFloat((<HTMLInputElement>getEl(`${this.formPrefix_}-time`)).value);
    const sat = ServiceLocator.getCatalogManager().getObject(satId, GetSatType.SKIP_POS_VEL) as DetailedSatellite;

    const possibleSats = keepTrackApi
      .getCatalogManager()
      .objectCache.filter((obj2) => {
        if (!obj2.isSatellite()) {
          return false;
        }
        const sat2 = obj2 as DetailedSatellite;

        if (sat2.perigee > sat.apogee) {
          return false;
        }
        if (sat.perigee > sat2.apogee) {
          return false;
        }

        return true;
      })
      .map((sat2) => sat2.id);

    let offset = <Milliseconds>0;
    let searchList = <string[]>[];

    for (let t = <Minutes>0; t < <Seconds>(timeVal * 60); t++) {
      offset = <Milliseconds>(t * 1000 * 60);
      const now = ServiceLocator.getTimeManager().getOffsetTimeObj(offset);
      const { m } = SatMath.calculateTimeVariables(now, sat.satrec) as { m: number };
      const satSv = Sgp4.propagate(sat.satrec, m);


      if (!satSv.position || !satSv.velocity) {
        continue;
      }

      for (let idx = 0; idx < possibleSats.length; idx++) {
        const obj2 = ServiceLocator.getCatalogManager().getObject(possibleSats[idx], GetSatType.SKIP_POS_VEL);

        if (!obj2?.isSatellite()) {
          continue;
        }

        const sat2 = obj2 as DetailedSatellite;
        const { m } = SatMath.calculateTimeVariables(now, sat2.satrec) as { m: number };
        const sat2Sv = Sgp4.propagate(sat2.satrec, m);

        if (!sat2Sv.position || !sat2Sv.velocity) {
          // Remove from possible sats
          possibleSats.splice(idx, 1);
          break;
        }

        const ric = CoordinateTransforms.sat2ric(satSv as PosVel, sat2Sv as PosVel);

        if (Math.abs(ric.position[0]) < uVal && Math.abs(ric.position[1]) < vVal && Math.abs(ric.position[2]) < wVal) {
          searchList.push(sat2.sccNum);
          // Remove from possible sats
          possibleSats.splice(idx, 1);
          break;
        }
      }
    }

    // Remove duplicates
    searchList = searchList.filter((v, i, a) => a.indexOf(v) === i);

    let searchStr = searchList.join(',');
    // Remove trailing comma

    searchStr = searchStr.replace(/,\s*$/u, '');
    ServiceLocator.getUiManager().doSearch(searchStr);
  }
}
