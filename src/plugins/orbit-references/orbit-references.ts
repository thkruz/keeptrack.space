import { StringifiedNumber } from '@app/app/analysis/sat-math';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, hideEl, showEl } from '@app/engine/utils/get-el';
import { BaseObject, FormatTle, Tle } from '@ootk/src/main';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

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

  addHtml(): void {
    super.addHtml();

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj?: BaseObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (!obj?.isSatellite()) {
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
                      data-tooltip="Create Analyst Satellites in Orbit">Generate Orbit Reference Satellites...</div>
              `,
          );
          getEl('orbit-references-link')!.addEventListener('click', this.orbitReferencesLinkClick.bind(this));
          this.doOnce = true;
        }
      },
    );
  }

  orbitReferencesLinkClick() {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    // Determine which satellite is selected
    const sat = catalogManagerInstance.getSat(this.selectSatManager_.selectedSat);

    if (!sat) {
      return;
    }

    let searchStr = sat.sccNum5.padStart(5, '0');

    // Add the satellites
    const ecen = sat.eccentricity.toString();
    const rasc = sat.rightAscension.toString();
    const argPe = sat.argOfPerigee.toString();
    const inc = sat.inclination.toString();
    const meanmo = sat.meanMotion.toString();
    const epochyr = sat.epochYear.toString();
    const epochday = sat.epochDay.toString();
    // .intlDes is 2000-001A we need 00001A
    const yy = sat.intlDes.split('-')[0].slice(2);
    const intl = yy + sat.intlDes.split('-')[1];
    const scc = sat.sccNum;

    const period = 1440.0 / parseFloat(meanmo);

    let j = 0;

    for (let i = 0; i < 360; i++) {
      const meana = j.toFixed(4).padStart(8, '0') as StringifiedNumber;
      const { tle1, tle2 } = FormatTle.createTle({ sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc });
      // Get the next available ID
      const a5 = Tle.convert6DigitToA5((CatalogManager.ANALYST_START_ID + i).toString().padStart(5, '0'));
      const id = catalogManagerInstance.sccNum2Id(a5);

      if (typeof id !== 'number') {
        // If the ID is not a number, skip this iteration
        continue;
      }

      const analystSat = catalogManagerInstance.addAnalystSat(tle1, tle2, id, a5);

      if (analystSat) {
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
