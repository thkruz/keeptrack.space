import { StringifiedNumber } from '@app/app/analysis/sat-math';
import { AnalystSlotReservations } from '@app/app/data/analyst-slot-reservations';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { BaseObject, FormatTle, Satellite, Tle } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class OrbitReferences extends KeepTrackPlugin {
  readonly id = 'OrbitReferences';
  dependencies_: string[] = [SatInfoBox.name, SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = PluginRegistry.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  doOnce = false;
  isReferenceSatsActive = false;
  /** Reference satellites this plugin wrote, by slot id; a later click may reuse a slot that still holds one. */
  private readonly references_ = new Map<number, Satellite>();

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(EventBusEvent.selectSatData, (obj?: BaseObject) => {
      // instanceof Satellite excludes OemSatellite, which lacks the TLE-derived
      // orbital elements (eccentricity, meanMotion, …) we read inside the click handler.
      if (!(obj instanceof Satellite)) {
        hideEl('orbit-references-link');

        return;
      }
      showEl('orbit-references-link');

      if (!this.doOnce) {
        const actionsSectionElement = getEl('actions-section');

        if (!actionsSectionElement) {
          return;
        }

        actionsSectionElement.insertAdjacentHTML(
          'beforeend',
          html`
                <div id="orbit-references-link" class="link sat-infobox-links menu-selectable" data-position="top" data-delay="50"
                      data-tooltip="${t7e('plugins.OrbitReferences.tooltip')}">${t7e('plugins.OrbitReferences.linkText')}</div>
              `
        );
        getEl('orbit-references-link')!.addEventListener('click', this.orbitReferencesLinkClick.bind(this));
        this.doOnce = true;
      }
    });
  }

  orbitReferencesLinkClick() {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    // Determine which satellite is selected
    const sat = catalogManagerInstance.getSat(this.selectSatManager_.selectedSat);

    // Same Satellite-only guard as the link visibility above.
    if (!(sat instanceof Satellite)) {
      return;
    }

    let searchStr = `${(sat.sccNum5 ?? sat.sccNum).padStart(5, '0')},`;

    // Add the satellites
    const ecen = sat.eccentricity.toString();
    const rasc = sat.rightAscension.toString();
    const argPe = sat.argOfPerigee.toString();
    const inc = sat.inclination.toString();
    const meanmo = sat.meanMotion.toString();
    const epochyr = sat.epochYear.toString();
    const epochday = sat.epochDay.toString();
    // .intlDes is 2000-001A we need 00001A
    // Synthetic JSC Vimpel objects carry no designator, so both parts stay blank.
    const [yearPart = '', launchPart = ''] = (sat.intlDes ?? '').split('-');
    const intl = yearPart.slice(2) + launchPart;
    // FormatTle.createTle runs scc through Tle.convert6DigitToA5, which throws
    // for extended (7+ digit) IDs. Mirror Satellite.toTle and pass the trailing
    // 5 digits so the TLE stays well-formed; the canonical id stays on sat.sccNum.
    const scc = Tle.classifySatNum(sat.sccNum) === 'extended' ? sat.sccNum.slice(-5) : sat.sccNum;

    const period = 1440.0 / parseFloat(meanmo);

    let j = 0;
    // Only slots that still hold this plugin's own reference objects count as reusable.
    const ownIds = new Set([...this.references_].filter(([id, ref]) => catalogManagerInstance.objectCache[id] === ref).map(([id]) => id));

    for (let i = 0; i < settingsManager.maxAnalystSats; i++) {
      const meana = j.toFixed(4).padStart(8, '0') as StringifiedNumber;
      // Get the next available ID
      const a5 = Tle.convert6DigitToA5((CatalogManager.ANALYST_START_ID + i).toString().padStart(5, '0'));
      const id = catalogManagerInstance.sccNum2Id(a5);

      // Skip slots that do not resolve, are reserved by another object (a New Launch trajectory),
      // or hold an active object another tool made (Create Satellite, a Maneuver clone, breakup
      // pieces). Only inactive placeholders and this plugin's own earlier references are written.
      if (typeof id !== 'number' || !AnalystSlotReservations.canWrite(a5, catalogManagerInstance.objectCache[id] as Satellite | undefined, ownIds)) {
        continue;
      }

      const { tle1, tle2 } = FormatTle.createTle({ sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc });
      const analystSat = catalogManagerInstance.addAnalystSat(tle1, tle2, id, a5);

      if (analystSat) {
        this.references_.set(id, analystSat);
        searchStr += `${analystSat.sccNum.toString()},`;
      }
      j += (360 / period) * 4;
      if (j >= 360) {
        break;
      }
    }

    // Remove the last comma
    searchStr = searchStr.slice(0, -1);
    const uiManagerInstance = ServiceLocator.getUiManager();

    uiManagerInstance.doSearch(searchStr);

    this.isReferenceSatsActive = true;
  }
}
