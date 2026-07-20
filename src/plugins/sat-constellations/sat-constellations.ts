import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { GroupType } from '@app/app/data/object-group';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IHelpConfig, ISecondaryMenuConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import { Satellite } from '@ootk/src/main';
import categoryPng from '@public/img/icons/category.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './sat-constellations.css';

interface ConstellationStats {
  count: number;
  avgAltitudeKm: number;
  incMinDeg: number;
  incMaxDeg: number;
}

interface ConstellationDef {
  groupName: string;
  groupType: GroupType;
  groupValue: (number | string)[] | RegExp;
  groupSlug: string;
}

/** Built-in constellation slugs used for menu items, switch cases, and persistence. */
const BUILT_IN_CONSTELLATIONS = [
  'SpaceStations',
  'AmateurRadio',
  'GPSGroup',
  'GalileoGroup',
  'GlonassGroup',
  'iridium',
  'orbcomm',
  'globalstar',
  'ses',
  'aehf',
  'wgs',
  'starlink',
  'sbirs',
  'starlink-gen2',
  'starlink-v2',
  'starlink-snapshot',
  'starshield',
  'pwsa',
  'kuiper',
  'ast-spaceobile',
  'oneweb',
  'telesat-lightspeed',
  'boeing',
  'astra',
  'spinlaunch',
  'hvnet',
  'lynk',
  'guanwang',
  'qianfan',
  'honghu3',
  'yinhe',
  'hanwha',
] as const;

export class SatConstellations extends KeepTrackPlugin {
  readonly id = 'SatConstellations';
  dependencies_: string[] = [SelectSatManager.name];

  private readonly additionalConstellations_: ConstellationDef[] = [];
  private selectedGroupName_: string | null = null;

  // ── Composition Config ──────────────────────────────────────────────

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'menu-constellations',
      label: t7e('plugins.SatConstellations.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: categoryPng as unknown as string,
      menuMode: [MenuMode.CATALOG, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'constellations-menu',
      title: t7e('plugins.SatConstellations.title' as Parameters<typeof t7e>[0]),
      html: this.buildSideMenuHtml_(),
      width: 650,
    };
  }

  getSecondaryMenuConfig(): ISecondaryMenuConfig {
    return {
      html: this.buildSecondaryMenuHtml_(),
      width: 280,
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.SatConstellations.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.SatConstellations.help.overview'),
          image: {
            src: 'img/help/sat-constellations/sat-constellations-menu.png',
            alt: t7e('plugins.SatConstellations.help.imgAlt'),
            caption: t7e('plugins.SatConstellations.help.imgCaption'),
          },
        },
        {
          heading: t7e('plugins.SatConstellations.help.readingHeading'),
          content: t7e('plugins.SatConstellations.help.reading'),
        },
        {
          heading: t7e('plugins.SatConstellations.help.filtersHeading'),
          content: t7e('plugins.SatConstellations.help.filters'),
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.SatConstellations.help.howToUse'),
        },
      ],
      tips: [t7e('plugins.SatConstellations.help.tip1'), t7e('plugins.SatConstellations.help.tip2'), t7e('plugins.SatConstellations.help.tip3')],
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = t7e('plugins.SatConstellations.commands.category' as Parameters<typeof t7e>[0]);

    const builtInCommands: ICommandPaletteCommand[] = BUILT_IN_CONSTELLATIONS.map((slug) => ({
      id: `SatConstellations.${slug}`,
      label: this.getConstellationLabel_(slug),
      category,
      callback: () => this.constellationMenuClick_(slug),
    }));

    const additionalCommands: ICommandPaletteCommand[] = this.additionalConstellations_.map((c) => ({
      id: `SatConstellations.${c.groupSlug}`,
      label: c.groupName,
      category,
      callback: () => this.constellationMenuClick_(c.groupSlug),
    }));

    return [...builtInCommands, ...additionalCommands];
  }

  // ── Download ────────────────────────────────────────────────────────

  onDownload(): void {
    if (!this.selectedGroupName_) {
      return;
    }
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const group = groupManagerInstance.groupList[this.selectedGroupName_];

    if (!group) {
      return;
    }

    const sats = group.ids.map((id: number) => catalogManagerInstance.getSat(id)).filter(Boolean) as Satellite[];

    CatalogExporter.exportTle2Csv(sats);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      const menuEl = getEl('constellations-menu');

      // Opt this menu (and its filter secondary menu) into the v13+ card UI.
      menuEl?.classList.add('kt-ui-v13');
      getEl('constellations-menu-secondary')?.classList.add('kt-ui-v13');

      const ulEl = menuEl?.querySelector('ul');

      if (ulEl) {
        // Add additional constellations
        ulEl.insertAdjacentHTML('beforeend', this.additionalConstellations_.map((c) => `<li class="menu-selectable" data-group="${c.groupSlug}">${c.groupName}</li>`).join(''));
      }

      // Wire click handlers on all list items
      menuEl?.querySelectorAll('li').forEach((element) => {
        element.addEventListener('click', (evt: Event) => {
          const group = (evt.target as HTMLElement).dataset.group;

          if (group) {
            this.constellationMenuClick_(group);
          }
        });
      });

      // Wire filter form buttons
      getEl('sc-filter-apply')?.addEventListener('click', () => this.applyFilters_());
      getEl('sc-filter-reset')?.addEventListener('click', () => this.resetFilters_());

      // Restore last selected constellation
      const last = PersistenceManager.getInstance().getItem(StorageKey.LAST_CONSTELLATION);

      if (last) {
        this.constellationMenuClick_(last, true);
      }
    });
  }

  // ── Public API ──────────────────────────────────────────────────────

  addConstellation(groupName: string, groupType: GroupType, groupValue: (number | string)[] | RegExp): void {
    const groupSlug = groupName.replace(/\s+/gu, '-').toLowerCase();

    this.additionalConstellations_.push({ groupName, groupType, groupValue, groupSlug });
  }

  // ── Private: HTML Builders ──────────────────────────────────────────

  private buildSideMenuHtml_(): string {
    const l = (key: string) => t7e(`plugins.SatConstellations.constellations.${key}` as Parameters<typeof t7e>[0]);
    const s = (key: string) => t7e(`plugins.SatConstellations.sections.${key}` as Parameters<typeof t7e>[0]);

    return html`
      <section class="kt-section">
        <div class="kt-section-label">${s('constellations')}</div>
        <ul id="sc-constellation-list" class="sc-constellation-list">
          <li class="menu-selectable" data-group="SpaceStations">${l('SpaceStations')}</li>
          <li class="menu-selectable" data-group="AmateurRadio">${l('AmateurRadio')}</li>
          <li class="menu-selectable" data-group="GPSGroup">${l('GPSGroup')}</li>
          <li class="menu-selectable" data-group="GalileoGroup">${l('GalileoGroup')}</li>
          <li class="menu-selectable" data-group="GlonassGroup">${l('GlonassGroup')}</li>
          <li class="menu-selectable" data-group="iridium">${l('iridium')}</li>
          <li class="menu-selectable" data-group="orbcomm">${l('orbcomm')}</li>
          <li class="menu-selectable" data-group="globalstar">${l('globalstar')}</li>
          <li class="menu-selectable" data-group="ses">${l('ses')}</li>
          <li class="menu-selectable" data-group="aehf">${l('aehf')}</li>
          <li class="menu-selectable" data-group="wgs">${l('wgs')}</li>
          <li class="menu-selectable" data-group="starlink">${l('starlink')}</li>
          <li class="menu-selectable" data-group="sbirs">${l('sbirs')}</li>
          <li class="menu-selectable" data-group="starlink-gen2">${l('starlink-gen2')}</li>
          <li class="menu-selectable" data-group="starlink-v2">${l('starlink-v2')}</li>
          <li class="menu-selectable" data-group="starlink-snapshot">${l('starlink-snapshot')}</li>
          <li class="menu-selectable" data-group="starshield">${l('starshield')}</li>
          <li class="menu-selectable" data-group="pwsa">${l('pwsa')}</li>
          <li class="menu-selectable" data-group="kuiper">${l('kuiper')}</li>
          <li class="menu-selectable" data-group="ast-spaceobile">${l('ast-spaceobile')}</li>
          <li class="menu-selectable" data-group="oneweb">${l('oneweb')}</li>
          <li class="menu-selectable" data-group="telesat-lightspeed">${l('telesat-lightspeed')}</li>
          <li class="menu-selectable" data-group="boeing">${l('boeing')}</li>
          <li class="menu-selectable" data-group="astra">${l('astra')}</li>
          <li class="menu-selectable" data-group="spinlaunch">${l('spinlaunch')}</li>
          <li class="menu-selectable" data-group="hvnet">${l('hvnet')}</li>
          <li class="menu-selectable" data-group="lynk">${l('lynk')}</li>
          <li class="menu-selectable" data-group="guanwang">${l('guanwang')}</li>
          <li class="menu-selectable" data-group="qianfan">${l('qianfan')}</li>
          <li class="menu-selectable" data-group="honghu3">${l('honghu3')}</li>
          <li class="menu-selectable" data-group="yinhe">${l('yinhe')}</li>
          <li class="menu-selectable" data-group="hanwha">${l('hanwha')}</li>
        </ul>
      </section>
      <section id="sc-stats" class="kt-section sc-stats start-hidden">
        <div class="kt-section-label">${s('statistics')}</div>
        <div class="sc-stats-row">
          <span id="sc-stat-count"></span>
          <span id="sc-stat-alt"></span>
          <span id="sc-stat-inc"></span>
        </div>
      </section>
      <section id="sc-table-wrapper" class="kt-section start-hidden">
        <div class="kt-section-label">${s('results')}</div>
        <div class="sc-table-scroll">
          <table id="sc-results-table" class="sc-results-table center-align striped"></table>
        </div>
        <sub id="sc-results-count" class="center-align"></sub>
      </section>
    `;
  }

  private buildSecondaryMenuHtml_(): string {
    const l = (key: string) => t7e(`plugins.SatConstellations.filters.${key}` as Parameters<typeof t7e>[0]);
    const s = (key: string) => t7e(`plugins.SatConstellations.sections.${key}` as Parameters<typeof t7e>[0]);

    return html`
      <section class="kt-section">
        <div class="kt-section-label">${s('filters')}</div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input placeholder="0" id="sc-filter-inc-min" type="number" />
            <label for="sc-filter-inc-min" class="active">${l('incMin')}</label>
          </div>
          <div class="input-field col s6">
            <input placeholder="180" id="sc-filter-inc-max" type="number" />
            <label for="sc-filter-inc-max" class="active">${l('incMax')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input placeholder="0" id="sc-filter-alt-min" type="number" />
            <label for="sc-filter-alt-min" class="active">${l('altMin')}</label>
          </div>
          <div class="input-field col s6">
            <input placeholder="50000" id="sc-filter-alt-max" type="number" />
            <label for="sc-filter-alt-max" class="active">${l('altMax')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s6">
            <input placeholder="0" id="sc-filter-raan-min" type="number" />
            <label for="sc-filter-raan-min" class="active">${l('raanMin')}</label>
          </div>
          <div class="input-field col s6">
            <input placeholder="360" id="sc-filter-raan-max" type="number" />
            <label for="sc-filter-raan-max" class="active">${l('raanMax')}</label>
          </div>
        </div>
        <div class="kt-field-row">
          <div class="input-field col s12">
            <input placeholder=".*" id="sc-filter-name" type="text" />
            <label for="sc-filter-name" class="active">${l('nameFilter')}</label>
          </div>
        </div>
        <button id="sc-filter-apply" type="button" class="kt-action waves-effect">
          <span class="kt-action-label">${l('apply')}</span>
        </button>
        <button id="sc-filter-reset" type="button" class="kt-action waves-effect">
          <span class="kt-action-label">${l('reset')}</span>
        </button>
      </section>
    `;
  }

  // ── Private: Constellation Selection ────────────────────────────────

  private constellationMenuClick_(groupName: string, skipCloseMenus = false): void {
    const groupManagerInstance = ServiceLocator.getGroupsManager();

    if (typeof groupManagerInstance === 'undefined') {
      return;
    }

    // Catch for things like the divider
    if (!groupName) {
      return;
    }

    if (!groupManagerInstance.groupList[groupName]) {
      this.createConstellationGroup_(groupName);
    }

    if (!groupManagerInstance.groupList[groupName]) {
      throw new Error(`Unknown group name: ${groupName}`);
    }

    this.selectedGroupName_ = groupName;
    PersistenceManager.getInstance().saveItem(StorageKey.LAST_CONSTELLATION, groupName);
    this.groupSelected_(groupName, skipCloseMenus);
  }

  /**
   * Creates the catalog group for a constellation, dispatching through the
   * static name-pattern and SCC-list tables, the computed link-manager groups,
   * and finally any constellations registered at runtime. Leaves the group
   * uncreated (so the caller throws) when the name is unknown.
   */
  private createConstellationGroup_(groupName: string): void {
    const groupManagerInstance = ServiceLocator.getGroupsManager();

    const regexDef = SatConstellations.REGEX_GROUP_DEFS_[groupName];

    if (regexDef) {
      groupManagerInstance.createGroup(regexDef.type, regexDef.pattern, groupName);

      return;
    }

    const sccList = SatConstellations.SCC_GROUP_DEFS_[groupName];

    if (sccList) {
      groupManagerInstance.createGroup(GroupType.SCC_NUM, sccList, groupName);

      return;
    }

    const computedIds = this.computedConstellationIds_(groupName);

    if (computedIds) {
      groupManagerInstance.createGroup(GroupType.SCC_NUM, computedIds, groupName);

      return;
    }

    const constellation = this.additionalConstellations_.find((c) => c.groupSlug === groupName);

    if (constellation) {
      groupManagerInstance.createGroup(constellation.groupType, constellation.groupValue, groupName);
    }
  }

  /**
   * Resolves the SCC numbers for the link-manager-derived constellations, whose
   * membership is computed from the catalog rather than a static name pattern.
   */
  private computedConstellationIds_(groupName: string): string[] | null {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const slm = catalogManagerInstance.satLinkManager;

    switch (groupName) {
      case 'aehf':
        return catalogManagerInstance.id2satnum(slm.aehf);
      case 'wgs':
        return catalogManagerInstance.id2satnum(slm.wgs.concat(slm.dscs));
      case 'sbirs': // SBIRS and DSP
        return catalogManagerInstance.id2satnum([...slm.sbirs, ...slm.dsp]);
      default:
        return null;
    }
  }

  private groupSelected_(groupName: string, skipCloseMenus = false): void {
    if (typeof groupName === 'undefined') {
      return;
    }
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const groupManagerInstance = ServiceLocator.getGroupsManager();

    if (typeof groupManagerInstance.groupList[groupName] === 'undefined') {
      throw new Error(`Unknown group name: ${groupName}`);
    }

    groupManagerInstance.selectGroup(groupManagerInstance.groupList[groupName]);

    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);

    const sats = groupManagerInstance.groupList[groupName].ids.map((id: number) => catalogManagerInstance.getSat(id)).filter(Boolean) as Satellite[];

    if (sats.length === 0) {
      ServiceLocator.getUiManager().toast(t7e('plugins.SatConstellations.errorMsgs.ConstellationEmpty' as Parameters<typeof t7e>[0]), ToastMsgType.caution);
    }

    this.updateSearchBar_(sats);

    if (!skipCloseMenus && settingsManager.isMobileModeEnabled) {
      const uiManagerInstance = ServiceLocator.getUiManager();

      uiManagerInstance.searchManager.closeSearch();
      uiManagerInstance.hideSideMenus();
    }

    // Populate the stats panel and results table
    this.populateTable_(groupName);
  }

  // ── Private: Stats & Table ──────────────────────────────────────────

  private populateTable_(groupName: string): void {
    // Guard: DOM may not be ready during persistence restore
    if (!getEl('sc-results-table', true)) {
      return;
    }

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const group = groupManagerInstance.groupList[groupName];

    if (!group) {
      return;
    }

    const sats = group.ids.map((id: number) => catalogManagerInstance.getSat(id)).filter(Boolean) as Satellite[];

    this.updateStats_(sats);
    this.buildTable_(sats);

    // Show the stats and table sections
    getEl('sc-stats')?.classList.remove('start-hidden');
    getEl('sc-table-wrapper')?.classList.remove('start-hidden');

    const countEl = getEl('sc-results-count');

    if (countEl) {
      const label = t7e('plugins.SatConstellations.stats.satellites' as Parameters<typeof t7e>[0]);

      if (sats.length > SatConstellations.MAX_TABLE_ROWS_) {
        countEl.textContent = `${SatConstellations.MAX_TABLE_ROWS_} / ${sats.length} ${label}`;
      } else {
        countEl.textContent = `${sats.length} ${label}`;
      }
    }
  }

  private updateStats_(sats: Satellite[]): void {
    if (sats.length === 0) {
      return;
    }

    const stats = SatConstellations.calculateStats_(sats);

    const lStat = (key: string) => t7e(`plugins.SatConstellations.stats.${key}` as Parameters<typeof t7e>[0]);

    const countEl = getEl('sc-stat-count');
    const altEl = getEl('sc-stat-alt');
    const incEl = getEl('sc-stat-inc');

    if (countEl) {
      countEl.textContent = `${stats.count} ${lStat('satellites')}`;
    }
    if (altEl) {
      altEl.textContent = `${lStat('avgAltitude')}: ${stats.avgAltitudeKm.toFixed(0)} km`;
    }
    if (incEl) {
      incEl.textContent = `${lStat('incRange')}: ${stats.incMinDeg.toFixed(1)}\u00B0-${stats.incMaxDeg.toFixed(1)}\u00B0`;
    }
  }

  static calculateStats_(sats: Satellite[]): ConstellationStats {
    let totalAlt = 0;
    let incMin = Infinity;
    let incMax = -Infinity;

    for (const sat of sats) {
      const alt = (sat.apogee + sat.perigee) / 2;

      totalAlt += alt;
      if (sat.inclination < incMin) {
        incMin = sat.inclination;
      }
      if (sat.inclination > incMax) {
        incMax = sat.inclination;
      }
    }

    return {
      count: sats.length,
      avgAltitudeKm: totalAlt / sats.length,
      incMinDeg: incMin === Infinity ? 0 : incMin,
      incMaxDeg: incMax === -Infinity ? 0 : incMax,
    };
  }

  private static readonly MAX_TABLE_ROWS_ = 500;

  /**
   * Constellations matched by a satellite/payload name pattern. NAME_REGEX
   * matches the object name; PAYLOAD_NAME_REGEX matches the payload name.
   */
  private static readonly REGEX_GROUP_DEFS_: Record<string, { type: GroupType; pattern: RegExp }> = {
    GlonassGroup: { type: GroupType.PAYLOAD_NAME_REGEX, pattern: /GLONASS/u },
    GalileoGroup: { type: GroupType.PAYLOAD_NAME_REGEX, pattern: /GALILEO/u },
    GPSGroup: { type: GroupType.PAYLOAD_NAME_REGEX, pattern: /NAVSTAR/u },
    iridium: { type: GroupType.PAYLOAD_NAME_REGEX, pattern: /IRIDIUM/u },
    orbcomm: { type: GroupType.PAYLOAD_NAME_REGEX, pattern: /ORBCOMM/u },
    ses: { type: GroupType.PAYLOAD_NAME_REGEX, pattern: /SES-\d+/u },
    globalstar: { type: GroupType.NAME_REGEX, pattern: /globalstar/iu },
    starlink: { type: GroupType.NAME_REGEX, pattern: /STARLINK/u },
    // These three notional Starlink sub-architectures use anchored patterns because real
    // Starlink Gen2/v2/snapshot sats are already caught by the `starlink` entry above.
    'starlink-gen2': { type: GroupType.NAME_REGEX, pattern: /^Starlink Gen2 \d+$/u },
    'starlink-v2': { type: GroupType.NAME_REGEX, pattern: /^Starlink 2 \d+$/u },
    'starlink-snapshot': { type: GroupType.NAME_REGEX, pattern: /^Starlink \d+$/u },
    starshield: { type: GroupType.NAME_REGEX, pattern: /starshield/iu },
    pwsa: { type: GroupType.NAME_REGEX, pattern: /pwsa/iu },
    kuiper: { type: GroupType.NAME_REGEX, pattern: /kuiper/iu },
    // Real BlueBird satellites appear in the catalog under "BLUEBIRD"; notional imports use "AST SpaceMobile".
    'ast-spaceobile': { type: GroupType.NAME_REGEX, pattern: /bluebird|ast.*mobile/iu },
    oneweb: { type: GroupType.NAME_REGEX, pattern: /oneweb/iu },
    'telesat-lightspeed': { type: GroupType.NAME_REGEX, pattern: /telesat/iu },
    boeing: { type: GroupType.NAME_REGEX, pattern: /^Boeing \d+$/u },
    astra: { type: GroupType.NAME_REGEX, pattern: /^Astra \d+$/u },
    spinlaunch: { type: GroupType.NAME_REGEX, pattern: /^SpinLaunch \d+$/u },
    hvnet: { type: GroupType.NAME_REGEX, pattern: /hvnet/iu },
    lynk: { type: GroupType.NAME_REGEX, pattern: /lynk/iu },
    guanwang: { type: GroupType.NAME_REGEX, pattern: /guowang/iu },
    qianfan: { type: GroupType.NAME_REGEX, pattern: /qianfan/iu },
    honghu3: { type: GroupType.NAME_REGEX, pattern: /honghu/iu },
    yinhe: { type: GroupType.NAME_REGEX, pattern: /yinhe/iu },
    hanwha: { type: GroupType.NAME_REGEX, pattern: /hanwha/iu },
  };

  /** Constellations defined by a fixed list of SCC numbers. */
  private static readonly SCC_GROUP_DEFS_: Record<string, number[]> = {
    SpaceStations: [25544, 48274],
    AmateurRadio: [
      7530, 14781, 20442, 22826, 24278, 25338, 25397, 25544, 26931, 27607, 27844, 27848, 28895, 32785, 32788, 32789, 32791, 33493, 33498, 33499, 35932, 35933, 35935, 37224, 37839,
      37841, 37855, 38760, 39090, 39134, 39136, 39161, 39417, 39430, 39436, 39439, 39440, 39444, 39469, 39770, 40014, 40021, 40024, 40025, 40030, 40032, 40042, 40043, 40057, 40071,
      40074, 40377, 40378, 40379, 40380, 40654, 40719, 40900, 40903, 40906, 40907, 40908, 40910, 40911, 40912, 40926, 40927, 40928, 40931, 40967, 40968, 41168, 41171, 41340, 41459,
      41460, 41465, 41474, 41600, 41619, 41789, 41932, 41935, 42017,
    ],
  };

  private buildTable_(sats: Satellite[]): void {
    const tbl = getEl('sc-results-table') as HTMLTableElement | null;

    if (!tbl) {
      return;
    }

    const lTbl = (key: string) => t7e(`plugins.SatConstellations.table.${key}` as Parameters<typeof t7e>[0]);
    const headers = ['norad', 'name', 'inclination', 'raan', 'perigee', 'apogee'];

    // Sort by RAAN to group orbital planes visually
    const sorted = [...sats].sort((a, b) => a.rightAscension - b.rightAscension);
    const displaySats = sorted.slice(0, SatConstellations.MAX_TABLE_ROWS_);

    // Build entire table as HTML string for performance (single reflow)
    let tableHtml = '<thead><tr>';

    for (const h of headers) {
      tableHtml += `<td style="text-decoration: underline" class="center">${lTbl(h)}</td>`;
    }
    tableHtml += '</tr></thead><tbody>';

    for (const sat of displaySats) {
      tableHtml += `<tr class="sc-table-row link" data-sat-id="${sat.id}">`;
      tableHtml += `<td>${sat.sccNum}</td>`;
      tableHtml += `<td>${sat.name}</td>`;
      tableHtml += `<td>${sat.inclination.toFixed(1)}</td>`;
      tableHtml += `<td>${sat.rightAscension.toFixed(1)}</td>`;
      tableHtml += `<td>${sat.perigee.toFixed(0)}</td>`;
      tableHtml += `<td>${sat.apogee.toFixed(0)}</td>`;
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody>';

    tbl.innerHTML = tableHtml;

    // Wire click handlers via event delegation
    tbl.addEventListener('click', (evt: Event) => {
      const tr = (evt.target as HTMLElement).closest('tr');
      const satId = tr?.dataset.satId;

      if (satId) {
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(parseInt(satId));
      }
    });
  }

  // ── Private: Filtering ──────────────────────────────────────────────

  private applyFilters_(): void {
    if (!this.selectedGroupName_) {
      return;
    }

    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const group = groupManagerInstance.groupList[this.selectedGroupName_];

    if (!group) {
      return;
    }

    const incMin = parseFloat((getEl('sc-filter-inc-min') as HTMLInputElement)?.value) || 0;
    const incMax = parseFloat((getEl('sc-filter-inc-max') as HTMLInputElement)?.value) || 180;
    const altMin = parseFloat((getEl('sc-filter-alt-min') as HTMLInputElement)?.value) || 0;
    const altMax = parseFloat((getEl('sc-filter-alt-max') as HTMLInputElement)?.value) || 100000;
    const raanMin = parseFloat((getEl('sc-filter-raan-min') as HTMLInputElement)?.value) || 0;
    const raanMax = parseFloat((getEl('sc-filter-raan-max') as HTMLInputElement)?.value) || 360;
    const nameFilter = (getEl('sc-filter-name') as HTMLInputElement)?.value || '';

    let nameRegex: RegExp | null = null;

    if (nameFilter) {
      try {
        nameRegex = new RegExp(nameFilter, 'iu');
      } catch {
        // Invalid regex, ignore filter
      }
    }

    const filteredIds = group.ids.filter((id: number) => {
      const sat = catalogManagerInstance.getSat(id);

      if (!sat) {
        return false;
      }

      if (sat.inclination < incMin || sat.inclination > incMax) {
        return false;
      }

      const alt = (sat.apogee + sat.perigee) / 2;

      if (alt < altMin || alt > altMax) {
        return false;
      }

      if (sat.rightAscension < raanMin || sat.rightAscension > raanMax) {
        return false;
      }

      if (nameRegex && !nameRegex.test(sat.name)) {
        return false;
      }

      return true;
    });

    // Create a temporary filtered group and display it
    const filteredSats = filteredIds.map((id: number) => catalogManagerInstance.getSat(id)).filter(Boolean) as Satellite[];

    if (filteredIds.length > 0) {
      const tempGroup = groupManagerInstance.createGroup(GroupType.ID_LIST, filteredIds);

      groupManagerInstance.selectGroup(tempGroup);
    }

    // Update the search bar to reflect filtered results
    this.updateSearchBar_(filteredSats);

    this.updateStats_(filteredSats);
    this.buildTable_(filteredSats);

    const countEl = getEl('sc-results-count');

    if (countEl) {
      countEl.textContent = `${filteredSats.length} / ${group.ids.length} ${t7e('plugins.SatConstellations.stats.satellites' as Parameters<typeof t7e>[0])}`;
    }
  }

  private resetFilters_(): void {
    const fields = ['sc-filter-inc-min', 'sc-filter-inc-max', 'sc-filter-alt-min', 'sc-filter-alt-max', 'sc-filter-raan-min', 'sc-filter-raan-max', 'sc-filter-name'];

    for (const id of fields) {
      const el = getEl(id) as HTMLInputElement | null;

      if (el) {
        el.value = '';
      }
    }

    if (this.selectedGroupName_) {
      this.groupSelected_(this.selectedGroupName_, true);
    }
  }

  // ── Private: Search Bar ─────────────────────────────────────────────

  private updateSearchBar_(sats: Satellite[]): void {
    const searchDOM = getEl('search', true);

    if (!searchDOM) {
      return;
    }

    const sccNums = sats.map((sat) => sat.sccNum).join(',');

    searchDOM.innerHTML = sccNums;

    const uiManagerInstance = ServiceLocator.getUiManager();

    uiManagerInstance.searchManager.doSearch(sccNums);
  }

  // ── Private: Helpers ────────────────────────────────────────────────

  private getConstellationLabel_(slug: string): string {
    return t7e(`plugins.SatConstellations.constellations.${slug}` as Parameters<typeof t7e>[0]) || slug;
  }
}
