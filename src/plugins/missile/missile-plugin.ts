import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { clickAndDragWidth } from '@app/engine/utils/click-and-drag';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { hideLoading, showLoading } from '@app/engine/utils/showLoading';
import rocketPng from '@public/img/icons/rocket.png';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { missileManager } from './missile-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class MissilePlugin extends KeepTrackPlugin {
  readonly id = 'MissilePlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = rocketPng;
  sideMenuElementName: string = `${this.id}-menu`;
  sideMenuElementHtml: string = html`
  <div id="${this.id}-menu" class="side-menu-parent start-hidden text-select">
    <div id="${this.id}-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">Create Missile Attack</h5>
        <form id="${this.id}-form" class="col s12">
          <div class="input-field col s12">
            <select id="ms-type">
              <option value="0">Custom Missile</option>
              <option value="1">Russia to USA</option>
              <option value="2">Russia to USA w/ Subs</option>
              <option value="3">China to USA</option>
              <option value="4">North Korea to USA</option>
              <option value="5">USA to Russia</option>
              <option value="6">USA to China</option>
              <option value="7">USA to North Korea</option>
            </select>
            <label>Type of Attack</label>
          </div>
          <div id="ms-custom-opt">
            <div class="input-field col s12">
              <select id="ms-attacker">
                <optgroup label="Russia">
                  <option value="200">Aleysk</option>
                  <option value="201">Dombarovskiy</option>
                  <option value="202">Uzhur</option>
                  <option value="203">Kartaly</option>
                  <option value="204">Irkutsk</option>
                  <option value="205">Kansk</option>
                  <option value="206">Krasnoyarsk</option>
                  <option value="207">Nizhniy Tagil</option>
                  <option value="208">Novosibirsk</option>
                  <option value="209">Tatischevo (SS-19)</option>
                  <option value="210">Tatischevo (SS-27)</option>
                  <option value="211">Teykovo</option>
                  <option value="212">Yoshkar Ola</option>
                  <option value="213">Borei Sub (Bulava)</option>
                  <option value="214">Delta IV Sub (Sineva)</option>
                  <option value="215">Delta IV Sub (Layner)</option>
                </optgroup>
                <optgroup label="China">
                  <option value="321">Type 092 Sub (JL-2)</option>
                  <option value="300">Nanyang</option>
                  <option value="301">Xining</option>
                  <option value="302">Delingha</option>
                  <option value="303">Haiyan</option>
                  <option value="304">Datong</option>
                  <option value="305">Tainshui</option>
                  <option value="306">Xixia</option>
                  <option value="307">Shaoyang</option>
                  <option value="308">Yuxi</option>
                  <option value="309">Luoyang</option>
                  <option value="310">Wuzhai</option>
                  <option value="311">Xuanhua</option>
                  <option value="312">Tongdao</option>
                  <option value="313">Lushi</option>
                  <option value="314">Jingxian A</option>
                  <option value="315">Jingxian B</option>
                  <option value="316">Hunan</option>
                  <option value="317">Daqing City</option>
                  <option value="318">Xinyang City</option>
                  <option value="319">Xinjiang Province</option>
                  <option value="320">Tibet Province</option>
                </optgroup>
                <optgroup label="United States">
                  <option value="101">Minot</option>
                  <option value="102">Malmstrom</option>
                  <option value="103">F.E. Warren</option>
                  <option value="100">Ohio Sub (Trident II)</option>
                </optgroup>
                <optgroup label="United Kingdom">
                  <option value="600">Vanguard Sub (Trident II)</option>
                  <option value="601">HMNB Clyde (Trident II)</option>
                </optgroup>
                <optgroup label="France">
                  <option value="500">Triomphant Sub (M51)</option>
                  <option value="501">Bay of Biscay</option>
                </optgroup>
                <optgroup label="North Korea">
                  <option value="400">Sinpo Sub (Pukkŭksŏng-1)</option>
                  <option value="401">Sinpo</option>
                  <option value="402">P'yong'an</option>
                  <option value="403">Pyongyang</option>
                </optgroup>
              </select>
              <label>Launch Location</label>
            </div>
            <div id="ms-lau-holder-lat" class="input-field col s12">
              <input placeholder="00.000" id="ms-lat-lau" type="text" maxlength="8" />
              <label for="ms-lat-lau" class="active">Custom Launch Latitude</label>
            </div>
            <div id="ms-lau-holder-lon" class="input-field col s12">
              <input placeholder="00.000" id="ms-lon-lau" type="text" maxlength="8" />
              <label for="ms-lon-lau" class="active">Custom Launch Longitude</label>
            </div>
            <div class="input-field col s12">
              <select id="ms-target">
                <optgroup label="United States">
                  <option value="0">Washington DC</option>
                  <option value="1">New York City</option>
                  <option value="2">Los Angeles</option>
                  <option value="3">Chicago</option>
                  <option value="4">Boston</option>
                  <option value="5">Seattle</option>
                  <option value="6">Miami</option>
                  <option value="7">Dallas</option>
                  <option value="8">Colorado Springs</option>
                  <option value="9">Omaha</option>
                  <option value="10">Hawaii</option>
                  <option value="11">Guam</option>
                </optgroup>
                <option value="-1">Custom Impact</option>
                <optgroup label="NATO Countries">
                  <option value="12">London</option>
                  <option value="13">Paris</option>
                  <option value="14">French Caribean</option>
                  <option value="15">Madrid</option>
                  <option value="16">Rome</option>
                  <option value="17">Berlin</option>
                  <option value="18">Toronto</option>
                </optgroup>
                <optgroup label="Non-NATO Countries">
                  <option value="19">Moscow</option>
                  <option value="20">St. Petersburg</option>
                  <option value="21">Novosibirsk</option>
                  <option value="22">Beijing</option>
                  <option value="23">Pyongyang</option>
                </optgroup>
              </select>
              <label>Target Location</label>
            </div>
            <div id="ms-tgt-holder-lat" class="input-field col s12">
              <input placeholder="00.000" id="ms-lat" type="text" maxlength="8" />
              <label for="ms-lat" class="active">Custom Target Latitude</label>
            </div>
            <div id="ms-tgt-holder-lon" class="input-field col s12">
              <input placeholder="00.000" id="ms-lon" type="text" maxlength="8" />
              <label for="ms-lon" class="active">Custom Target Longitude</label>
            </div>
          </div>
          <div class="center-align">
            <button class="btn btn-ui waves-effect waves-light" type="submit" name="action">Launch Missile Attack &#9658;</button>
          </div>
        </form>
        <div class="row"></div>
        <div class="center-align">
          <button id="searchRvBtn" class="btn btn-ui waves-effect waves-light" name="search">Show All Missiles &#9658;</button>
        </div>
      </div>
      <div id="ms-error" class="center-align menu-selectable start-hidden">
        <h6 class="center-align">Error</h6>
      </div>
    </div>
  </div>
  `;

  dragOptions: ClickDragOptions = {
    isDraggable: true,
  };
  /** Is a submarine selected */
  private isSub_: boolean = false;
  private i_: number;

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  addJs(): void {
    super.addJs();

    // Missile orbits have to be updated every draw or they quickly become inaccurate
    EventBus.getInstance().on(EventBusEvent.updateLoop, this.updateLoop_.bind(this));
  }

  private searchForRvs_() {
    const uiManagerInstance = ServiceLocator.getUiManager();

    uiManagerInstance.doSearch('RV_');
  }

  private missileSubmit_(): void {
    // eslint-disable-next-line max-statements
    showLoading(() => {
      const timeManagerInstance = ServiceLocator.getTimeManager();
      const uiManagerInstance = ServiceLocator.getUiManager();

      getEl('ms-error')!.style.display = 'none';
      const type = parseFloat((<HTMLInputElement>getEl('ms-type')).value);
      const attacker = parseFloat((<HTMLInputElement>getEl('ms-attacker')).value);
      let lauLat = parseFloat((<HTMLInputElement>getEl('ms-lat-lau')).value);
      let lauLon = parseFloat((<HTMLInputElement>getEl('ms-lon-lau')).value);
      const target = parseFloat((<HTMLInputElement>getEl('ms-target')).value);
      let tgtLat = parseFloat((<HTMLInputElement>getEl('ms-lat')).value);
      let tgtLon = parseFloat((<HTMLInputElement>getEl('ms-lon')).value);
      const launchTime = timeManagerInstance.selectedDate.getTime();

      let sim = '';

      if (type === 1) {
        sim = 'simulation/Russia2USA.json';
        missileManager.massRaidPre(launchTime, sim);
      }
      if (type === 2) {
        sim = 'simulation/Russia2USAalt.json';
        missileManager.massRaidPre(launchTime, sim);
      }
      if (type === 3) {
        sim = 'simulation/China2USA.json';
        missileManager.massRaidPre(launchTime, sim);
      }
      if (type === 4) {
        sim = 'simulation/NorthKorea2USA.json';
        missileManager.massRaidPre(launchTime, sim);
      }
      if (type === 5) {
        sim = 'simulation/USA2Russia.json';
        missileManager.massRaidPre(launchTime, sim);
      }
      if (type === 6) {
        sim = 'simulation/USA2China.json';
        missileManager.massRaidPre(launchTime, sim);
      }
      if (type === 7) {
        sim = 'simulation/USA2NorthKorea.json';
        missileManager.massRaidPre(launchTime, sim);
      }
      if (type !== 0) {
        uiManagerInstance.toast(`${sim} Loaded`, ToastMsgType.standby, true);
      }
      if (type === 0) {
        if (target === -1) {
          // Custom Target
          if (isNaN(tgtLat)) {
            uiManagerInstance.toast('Invalid Target Latitude!', ToastMsgType.critical);
            hideLoading();

            return;
          }
          if (isNaN(tgtLon)) {
            uiManagerInstance.toast('Invalid Target Longitude!', ToastMsgType.critical);
            hideLoading();

            return;
          }
        } else {
          // Premade Target
          tgtLat = <number>missileManager.globalBMTargets[target * 3];
          tgtLon = <number>missileManager.globalBMTargets[target * 3 + 1];
        }

        if (this.isSub_) {
          if (isNaN(lauLat)) {
            uiManagerInstance.toast('Invalid Launch Latitude!', ToastMsgType.critical);
            hideLoading();

            return;
          }
          if (isNaN(lauLon)) {
            uiManagerInstance.toast('Invalid Launch Longitude!', ToastMsgType.critical);
            hideLoading();

            return;
          }
        }

        let a: number;
        let b: number;
        const catalogManagerInstance = ServiceLocator.getCatalogManager();

        if (attacker < 200) {
          // USA
          a = attacker - 100;
          b = 500 - missileManager.missilesInUse;
          let missileMinAlt = 1200;

          if (attacker !== 100) {
            // Use Custom Launch Site
            lauLat = <number>missileManager.UsaICBM[a * 4];
            lauLon = <number>missileManager.UsaICBM[a * 4 + 1];
            missileMinAlt = 1100; // https://www.space.com/8689-air-force-launches-ballistic-missile-suborbital-test.html
          }
          missileManager.createMissile(
            lauLat,
            lauLon,
            tgtLat,
            tgtLon,
            3,
            catalogManagerInstance.missileSats - b,
            launchTime,
            missileManager.UsaICBM[a * 4 + 2] as string,
            30,
            2.9,
            0.07,
            <number>missileManager.UsaICBM[a * 4 + 3],
            'United States',
            missileMinAlt,
          );
        } else if (attacker < 300) {
          // Russian
          a = attacker - 200;
          b = 500 - missileManager.missilesInUse;
          const missileMinAlt = 1120;

          if (attacker !== 213 && attacker !== 214 && attacker !== 215) {
            // Use Custom Launch Site
            lauLat = <number>missileManager.RussianICBM[a * 4];
            lauLon = <number>missileManager.RussianICBM[a * 4 + 1];
          }
          missileManager.createMissile(
            lauLat,
            lauLon,
            tgtLat,
            tgtLon,
            3,
            catalogManagerInstance.missileSats - b,
            launchTime,
            missileManager.RussianICBM[a * 4 + 2] as string,
            30,
            2.9,
            0.07,
            <number>missileManager.RussianICBM[a * 4 + 3],
            'Russia',
            missileMinAlt,
          );
        } else if (attacker < 400) {
          // Chinese
          a = attacker - 300;
          b = 500 - missileManager.missilesInUse;
          const missileMinAlt = 1120;

          if (attacker !== 321) {
            // Use Custom Launch Site
            lauLat = <number>missileManager.ChinaICBM[a * 4];
            lauLon = <number>missileManager.ChinaICBM[a * 4 + 1];
          }
          missileManager.createMissile(
            lauLat,
            lauLon,
            tgtLat,
            tgtLon,
            3,
            catalogManagerInstance.missileSats - b,
            launchTime,
            missileManager.ChinaICBM[a * 4 + 2] as string,
            30,
            2.9,
            0.07,
            <number>missileManager.ChinaICBM[a * 4 + 3],
            'China',
            missileMinAlt,
          );
        } else if (attacker < 500) {
          // North Korean
          a = attacker - 400;
          b = 500 - missileManager.missilesInUse;
          const missileMinAlt = 1120;

          if (attacker !== 400) {
            // Use Custom Launch Site
            lauLat = <number>missileManager.NorthKoreanBM[a * 4];
            lauLon = <number>missileManager.NorthKoreanBM[a * 4 + 1];
          }
          missileManager.createMissile(
            lauLat,
            lauLon,
            tgtLat,
            tgtLon,
            3,
            catalogManagerInstance.missileSats - b,
            launchTime,
            missileManager.NorthKoreanBM[a * 4 + 2] as string,
            30,
            2.9,
            0.07,
            <number>missileManager.NorthKoreanBM[a * 4 + 3],
            'North Korea',
            missileMinAlt,
          );
        } else if (attacker < 600) {
          // French SLBM
          a = attacker - 500;
          b = 500 - missileManager.missilesInUse;
          const missileMinAlt = 1000;

          if (attacker !== 500) {
            // Use Custom Launch Site
            lauLat = <number>missileManager.FraSLBM[a * 4];
            lauLon = <number>missileManager.FraSLBM[a * 4 + 1];
          }
          // https://etikkradet.no/files/2017/02/EADS-Engelsk.pdf
          missileManager.createMissile(
            lauLat,
            lauLon,
            tgtLat,
            tgtLon,
            3,
            catalogManagerInstance.missileSats - b,
            launchTime,
            missileManager.FraSLBM[a * 4 + 2] as string,
            30,
            2.9,
            0.07,
            <number>missileManager.FraSLBM[a * 4 + 3],
            'France',
            missileMinAlt,
          );
        } else if (attacker < 700) {
          // United Kingdom SLBM
          a = attacker - 600;
          b = 500 - missileManager.missilesInUse;
          const missileMinAlt = 1200;

          if (attacker !== 600) {
            // Use Custom Launch Site
            lauLat = <number>missileManager.ukSLBM[a * 4];
            lauLon = <number>missileManager.ukSLBM[a * 4 + 1];
          }
          missileManager.createMissile(
            lauLat,
            lauLon,
            tgtLat,
            tgtLon,
            3,
            catalogManagerInstance.missileSats - b,
            launchTime,
            missileManager.ukSLBM[a * 4 + 2] as string,
            30,
            2.9,
            0.07,
            <number>missileManager.ukSLBM[a * 4 + 3],
            'United Kigndom',
            missileMinAlt,
          );
        }
        uiManagerInstance.toast(missileManager.lastMissileError, missileManager.lastMissileErrorType);
        uiManagerInstance.doSearch('RV_');
      }
      hideLoading();
    });
  }

  private uiManagerFinal_(): void {
    clickAndDragWidth(getEl(`${this.id}-menu`));
    getEl(`${this.id}-form`)!.addEventListener('submit', (e: Event): void => {
      e.preventDefault();
      this.missileSubmit_();
    });
    getEl('ms-attacker')!.addEventListener('change', this.msAttackerChange_);
    getEl('ms-target')!.addEventListener('change', this.msTargetChange_);
    getEl('ms-error')!.addEventListener('click', this.msErrorClick_);
    getEl(`${this.id}-form`)!.addEventListener('change', this.missileChange_);
    getEl('searchRvBtn')!.addEventListener('click', this.searchForRvs_);

    this.msAttackerChange_();
    this.msTargetChange_();
  }

  private updateLoop_(): void {
    if (typeof missileManager !== 'undefined' && missileManager.missileArray.length > 0) {
      const orbitManagerInstance = ServiceLocator.getOrbitManager();

      for (this.i_ = 0; this.i_ < missileManager.missileArray.length; this.i_++) {
        orbitManagerInstance.updateOrbitBuffer(missileManager.missileArray[this.i_].id);
      }
    }
  }

  private missileChange_(): void {
    if (parseFloat((<HTMLInputElement>getEl('ms-type')).value) !== 0) {
      getEl('ms-custom-opt')!.style.display = 'none';
    } else {
      getEl('ms-custom-opt')!.style.display = 'block';
    }
  }
  private msErrorClick_(): void {
    getEl('ms-error')!.style.display = 'none';
  }
  private msTargetChange_() {
    if (parseInt((<HTMLInputElement>getEl('ms-target')).value) !== -1) {
      getEl('ms-tgt-holder-lat')!.style.display = 'none';
      getEl('ms-tgt-holder-lon')!.style.display = 'none';
    } else {
      getEl('ms-tgt-holder-lat')!.style.display = 'block';
      getEl('ms-tgt-holder-lon')!.style.display = 'block';
    }
  }

  private msAttackerChange_() {
    this.isSub_ = false;
    const subList = [100, 600, 213, 214, 215, 321, 500, 400];

    for (const sub of subList) {
      if (sub === parseInt((<HTMLInputElement>getEl('ms-attacker')).value)) {
        this.isSub_ = true;
      }
    }
    if (!this.isSub_) {
      getEl('ms-lau-holder-lat')!.style.display = 'none';
      getEl('ms-lau-holder-lon')!.style.display = 'none';
    } else {
      getEl('ms-lau-holder-lat')!.style.display = 'block';
      getEl('ms-lau-holder-lon')!.style.display = 'block';
    }
  }
}
