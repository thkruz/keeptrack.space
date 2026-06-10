import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  ICommandPaletteCommand,
  IHelpConfig,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { hideLoading, showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import rocketPng from '@public/img/icons/rocket.png';
import { missileManager } from './missile-manager';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.MissilePlugin.${key}` as Parameters<typeof t7e>[0]);

export class MissilePlugin extends KeepTrackPlugin {
  readonly id = 'MissilePlugin';
  dependencies_ = [];

  /** Is a submarine selected */
  private isSub_: boolean = false;
  private i_: number;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: `${this.id}-bottom-icon`,
      label: l('bottomIconLabel'),
      image: rocketPng,
      menuMode: [MenuMode.CREATE, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: `${this.id}-menu`,
      title: l('title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: {
        isDraggable: true,
      },
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/missile/missile-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.typesHeading'),
          content: l('help.types'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2'), l('help.tip3')],
    };
  }

  private buildSideMenuHtml_(): string {
    return html`
    <div id="${this.id}-menu" class="side-menu-parent start-hidden">
      <div id="${this.id}-content" class="side-menu">
        <div class="row">
          <form id="${this.id}-menu-form" class="col s12">
            <div class="input-field col s12">
              <select id="ms-type">
                <option value="0">${l('types.customMissile')}</option>
                <option value="1">${l('types.russiaToUsa')}</option>
                <option value="2">${l('types.russiaToUsaSubs')}</option>
                <option value="3">${l('types.chinaToUsa')}</option>
                <option value="4">${l('types.northKoreaToUsa')}</option>
                <option value="5">${l('types.usaToRussia')}</option>
                <option value="6">${l('types.usaToChina')}</option>
                <option value="7">${l('types.usaToNorthKorea')}</option>
              </select>
              <label>${l('labels.typeOfAttack')}</label>
            </div>
            <div id="ms-custom-opt">
              <div class="input-field col s12">
                <select id="ms-attacker">
                  <optgroup label="${l('groups.russia')}">
                    <option value="200">${l('attackers.aleysk')}</option>
                    <option value="201">${l('attackers.dombarovskiy')}</option>
                    <option value="202">${l('attackers.uzhur')}</option>
                    <option value="203">${l('attackers.kartaly')}</option>
                    <option value="204">${l('attackers.irkutsk')}</option>
                    <option value="205">${l('attackers.kansk')}</option>
                    <option value="206">${l('attackers.krasnoyarsk')}</option>
                    <option value="207">${l('attackers.nizhniyTagil')}</option>
                    <option value="208">${l('attackers.novosibirsk')}</option>
                    <option value="209">${l('attackers.tatischevoSs19')}</option>
                    <option value="210">${l('attackers.tatischevoSs27')}</option>
                    <option value="211">${l('attackers.teykovo')}</option>
                    <option value="212">${l('attackers.yoshkarOla')}</option>
                    <option value="213">${l('attackers.boreiSub')}</option>
                    <option value="214">${l('attackers.deltaIvSubSineva')}</option>
                    <option value="215">${l('attackers.deltaIvSubLayner')}</option>
                  </optgroup>
                  <optgroup label="${l('groups.china')}">
                    <option value="321">${l('attackers.type092Sub')}</option>
                    <option value="300">${l('attackers.nanyang')}</option>
                    <option value="301">${l('attackers.xining')}</option>
                    <option value="302">${l('attackers.delingha')}</option>
                    <option value="303">${l('attackers.haiyan')}</option>
                    <option value="304">${l('attackers.datong')}</option>
                    <option value="305">${l('attackers.tainshui')}</option>
                    <option value="306">${l('attackers.xixia')}</option>
                    <option value="307">${l('attackers.shaoyang')}</option>
                    <option value="308">${l('attackers.yuxi')}</option>
                    <option value="309">${l('attackers.luoyang')}</option>
                    <option value="310">${l('attackers.wuzhai')}</option>
                    <option value="311">${l('attackers.xuanhua')}</option>
                    <option value="312">${l('attackers.tongdao')}</option>
                    <option value="313">${l('attackers.lushi')}</option>
                    <option value="314">${l('attackers.jingxianA')}</option>
                    <option value="315">${l('attackers.jingxianB')}</option>
                    <option value="316">${l('attackers.hunan')}</option>
                    <option value="317">${l('attackers.daqingCity')}</option>
                    <option value="318">${l('attackers.xinyangCity')}</option>
                    <option value="319">${l('attackers.xinjiangProvince')}</option>
                    <option value="320">${l('attackers.tibetProvince')}</option>
                  </optgroup>
                  <optgroup label="${l('groups.unitedStates')}">
                    <option value="101">${l('attackers.minot')}</option>
                    <option value="102">${l('attackers.malmstrom')}</option>
                    <option value="103">${l('attackers.feWarren')}</option>
                    <option value="100">${l('attackers.ohioSub')}</option>
                  </optgroup>
                  <optgroup label="${l('groups.unitedKingdom')}">
                    <option value="600">${l('attackers.vanguardSub')}</option>
                    <option value="601">${l('attackers.hmnbClyde')}</option>
                  </optgroup>
                  <optgroup label="${l('groups.france')}">
                    <option value="500">${l('attackers.triomphantSub')}</option>
                    <option value="501">${l('attackers.bayOfBiscay')}</option>
                  </optgroup>
                  <optgroup label="${l('groups.northKorea')}">
                    <option value="400">${l('attackers.sinpoSub')}</option>
                    <option value="401">${l('attackers.sinpo')}</option>
                    <option value="402">${l('attackers.pyongan')}</option>
                    <option value="403">${l('attackers.pyongyang')}</option>
                  </optgroup>
                </select>
                <label>${l('labels.launchLocation')}</label>
              </div>
              <div id="ms-lau-holder-lat" class="input-field col s12">
                <input placeholder="00.000" id="ms-lat-lau" type="text" maxlength="8" />
                <label for="ms-lat-lau" class="active">${l('labels.customLaunchLatitude')}</label>
              </div>
              <div id="ms-lau-holder-lon" class="input-field col s12">
                <input placeholder="00.000" id="ms-lon-lau" type="text" maxlength="8" />
                <label for="ms-lon-lau" class="active">${l('labels.customLaunchLongitude')}</label>
              </div>
              <div class="input-field col s12">
                <select id="ms-target">
                  <optgroup label="${l('groups.unitedStates')}">
                    <option value="0">${l('targets.washingtonDc')}</option>
                    <option value="1">${l('targets.newYorkCity')}</option>
                    <option value="2">${l('targets.losAngeles')}</option>
                    <option value="3">${l('targets.chicago')}</option>
                    <option value="4">${l('targets.boston')}</option>
                    <option value="5">${l('targets.seattle')}</option>
                    <option value="6">${l('targets.miami')}</option>
                    <option value="7">${l('targets.dallas')}</option>
                    <option value="8">${l('targets.coloradoSprings')}</option>
                    <option value="9">${l('targets.omaha')}</option>
                    <option value="10">${l('targets.hawaii')}</option>
                    <option value="11">${l('targets.guam')}</option>
                  </optgroup>
                  <option value="-1">${l('targets.customImpact')}</option>
                  <optgroup label="${l('groups.natoCountries')}">
                    <option value="12">${l('targets.london')}</option>
                    <option value="13">${l('targets.paris')}</option>
                    <option value="14">${l('targets.frenchCaribbean')}</option>
                    <option value="15">${l('targets.madrid')}</option>
                    <option value="16">${l('targets.rome')}</option>
                    <option value="17">${l('targets.berlin')}</option>
                    <option value="18">${l('targets.toronto')}</option>
                  </optgroup>
                  <optgroup label="${l('groups.nonNatoCountries')}">
                    <option value="19">${l('targets.moscow')}</option>
                    <option value="20">${l('targets.stPetersburg')}</option>
                    <option value="21">${l('targets.novosibirsk')}</option>
                    <option value="22">${l('targets.beijing')}</option>
                    <option value="23">${l('targets.pyongyang')}</option>
                  </optgroup>
                </select>
                <label>${l('labels.targetLocation')}</label>
              </div>
              <div id="ms-tgt-holder-lat" class="input-field col s12">
                <input placeholder="00.000" id="ms-lat" type="text" maxlength="8" />
                <label for="ms-lat" class="active">${l('labels.customTargetLatitude')}</label>
              </div>
              <div id="ms-tgt-holder-lon" class="input-field col s12">
                <input placeholder="00.000" id="ms-lon" type="text" maxlength="8" />
                <label for="ms-lon" class="active">${l('labels.customTargetLongitude')}</label>
              </div>
            </div>
            <div class="center-align">
              <button class="btn btn-ui waves-effect waves-light" type="submit" name="action">${l('buttons.launchMissileAttack')} &#9658;</button>
            </div>
          </form>
          <div class="row"></div>
          <div class="center-align">
            <button id="searchRvBtn" class="btn btn-ui waves-effect waves-light" name="search">${l('buttons.showAllMissiles')} &#9658;</button>
          </div>
        </div>
        <div id="ms-error" class="center-align menu-selectable start-hidden">
          <h6 class="center-align">${l('labels.error')}</h6>
        </div>
      </div>
    </div>
    `;
  }

  onFormSubmit(): void {
    this.missileSubmit_();
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'MissilePlugin.open',
        label: l('commands.open'),
        category: 'Simulation',
        callback: () => this.bottomMenuClicked(),
      },
      {
        id: 'MissilePlugin.showAllMissiles',
        label: l('commands.showAllMissiles'),
        category: 'Simulation',
        callback: () => this.searchForRvs_(),
        isAvailable: () => missileManager.missilesInUse > 0,
      },
    ];
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));

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
        uiManagerInstance.toast(l('msgs.simLoaded').replace('{sim}', sim), ToastMsgType.standby, true);
      }
      if (type === 0) {
        if (target === -1) {
          // Custom Target
          if (isNaN(tgtLat)) {
            uiManagerInstance.toast(l('errorMsgs.invalidTargetLatitude'), ToastMsgType.critical);
            hideLoading();

            return;
          }
          if (isNaN(tgtLon)) {
            uiManagerInstance.toast(l('errorMsgs.invalidTargetLongitude'), ToastMsgType.critical);
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
            uiManagerInstance.toast(l('errorMsgs.invalidLaunchLatitude'), ToastMsgType.critical);
            hideLoading();

            return;
          }
          if (isNaN(lauLon)) {
            uiManagerInstance.toast(l('errorMsgs.invalidLaunchLongitude'), ToastMsgType.critical);
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
        // The new missile was just activated in objectCache; nudge the (worker-mode) color worker
        // so it recolors the slot from transparent before the group overlay renders. Without this
        // the orbit overlay skips the missile on alpha and it only appears on hover. (Once after
        // creation - createMissile is called once per launch here.)
        ServiceLocator.getColorSchemeManager().notifyObjectsChanged();
        uiManagerInstance.doSearch('RV_');
      }
      hideLoading();
    });
  }

  private uiManagerFinal_(): void {
    getEl('ms-attacker')!.addEventListener('change', this.msAttackerChange_);
    getEl('ms-target')!.addEventListener('change', this.msTargetChange_);
    getEl('ms-error')!.addEventListener('click', this.msErrorClick_);
    getEl(`${this.id}-menu-form`)!.addEventListener('change', this.missileChange_);
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
