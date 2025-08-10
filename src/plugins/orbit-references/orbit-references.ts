import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl, hideEl, showEl } from '@app/lib/get-el';

import { CatalogManager } from '@app/singletons/catalog-manager';
import { StringifiedNumber } from '@app/static/sat-math';
import { BaseObject, FormatTle, Tle } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SatInfoBox } from '../sat-info-box/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class OrbitReferences extends KeepTrackPlugin {
  readonly id = 'OrbitReferences';
  dependencies_: string[] = [SatInfoBox.name, SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager) as unknown as SelectSatManager; // this will be validated in KeepTrackPlugin constructor
  }

  doOnce = false;
  isReferenceSatsActive = false;

  addHtml(): void {
    super.addHtml();

    keepTrackApi.on(
      KeepTrackApiEvents.selectSatData,
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
            keepTrackApi.html`
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
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

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
    const uiManagerInstance = keepTrackApi.getUiManager();

    uiManagerInstance.doSearch(searchStr);

    this.isReferenceSatsActive = true;
  }
}
