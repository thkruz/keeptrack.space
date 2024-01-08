import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { StringPad } from '@app/lib/stringPad';

import { CatalogManager } from '@app/singletons/catalog-manager';
import { StringifiedNumber } from '@app/static/sat-math';
import { BaseObject, FormatTle, RAD2DEG, Sgp4 } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SatInfoBox } from '../select-sat-manager/sat-info-box';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class OrbitReferences extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Orbit References';
  dependencies: string[] = [SatInfoBox.PLUGIN_NAME, SelectSatManager.PLUGIN_NAME];
  private selectSatManager_: SelectSatManager;

  constructor() {
    super(OrbitReferences.PLUGIN_NAME);
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  doOnce = false;
  isReferenceSatsActive = false;

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.PLUGIN_NAME,
      cb: (obj?: BaseObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (!obj) {
          return;
        }

        if (!this.doOnce) {
          getEl('sat-info-top-links').insertAdjacentHTML(
            'beforeend',
            keepTrackApi.html`
                <div id="orbit-references-link" class="link sat-infobox-links" data-position="top" data-delay="50"
                      data-tooltip="Create Analyst Satellites in Orbit">Generate Orbit Reference Satellites...</div>
              `
          );
          getEl('orbit-references-link').addEventListener('click', this.orbitReferencesLinkClick.bind(this));
          this.doOnce = true;
        }
      },
    });
  }

  orbitReferencesLinkClick() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    // Determine which satellite is selected
    const sat = catalogManagerInstance.getSat(this.selectSatManager_.selectedSat);
    if (!sat) return;

    let searchStr = '';

    // Add the satellites
    const satrec = Sgp4.createSatrec(sat.tle1, sat.tle2);
    const ecen = satrec.ecco.toFixed(7).substr(2, 7);
    const rasc = <StringifiedNumber>(satrec.nodeo * RAD2DEG).toString();
    const argPe = <StringifiedNumber>(satrec.argpo * RAD2DEG).toString();
    const inc = <StringifiedNumber>sat.tle2.substr(8, 8);
    const meanmo = <StringifiedNumber>sat.tle2.substr(52, 10);
    const epochyr = sat.tle1.substr(18, 2);
    const epochday = sat.tle1.substr(20, 12);
    const intl = sat.tle1.substr(9, 8);
    const sccNum = StringPad.pad0(sat.tle1.substr(2, 5).trim(), 5);

    const period = 1440.0 / parseFloat(meanmo);

    let j = 0;
    for (let i = 0; i < 360; i++) {
      const meana = <StringifiedNumber>StringPad.pad0(j.toFixed(4), 8);
      const { tle1, tle2 } = FormatTle.createTle({ sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc: sccNum });
      // Get the next available ID
      const a5 = FormatTle.convert6DigitToA5((CatalogManager.ANALYST_START_ID + i).toString().padStart(5, '0'));
      const id = catalogManagerInstance.sccNum2Id(a5);
      const analystSat = catalogManagerInstance.addAnalystSat(tle1, tle2, id, a5);
      if (analystSat) {
        searchStr += analystSat.sccNum.toString() + ',';
      }
      j += (360 / period) * 4;
      if (j >= 360) break;
    }

    // Remove the last comma
    searchStr = searchStr.substr(0, searchStr.length - 1);
    const uiManagerInstance = keepTrackApi.getUiManager();
    uiManagerInstance.doSearch(searchStr);

    this.isReferenceSatsActive = true;
  }
}
