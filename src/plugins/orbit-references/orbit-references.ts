import { SatObject } from '@app/js/interfaces';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { RAD2DEG } from '@app/js/lib/constants';
import { getEl } from '@app/js/lib/get-el';
import { StringPad } from '@app/js/lib/stringPad';

import { FormatTle } from '@app/js/static/format-tle';
import { StringifiedNumber } from '@app/js/static/sat-math';
import { Sgp4 } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SatInfoBoxCore } from '../select-sat-manager/satInfoboxCore';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class OrbitReferences extends KeepTrackPlugin {
  doOnce = false;
  isReferenceSatsActive = false;
  dependencies: string[] = [SatInfoBoxCore.PLUGIN_NAME, SelectSatManager.PLUGIN_NAME];
  static PLUGIN_NAME = 'Orbit References';

  constructor() {
    super(OrbitReferences.PLUGIN_NAME);
  }

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: 'selectSatData',
      cbName: 'orbitReferences',
      cb: (sat: SatObject) => {
        // Skip this if there is no satellite object because the menu isn't open
        if (sat === null || typeof sat === 'undefined') {
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
    const sat = catalogManagerInstance.getSat(catalogManagerInstance.selectedSat);
    let satNum = catalogManagerInstance.analSatSet[0].id + 20000; // Find Analyst satellite 10,000
    let searchStr = '';

    // Add the satellites
    const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2);
    const ecen = satrec.ecco.toFixed(7).substr(2, 7);
    const rasc = <StringifiedNumber>(satrec.nodeo * RAD2DEG).toString();
    const argPe = <StringifiedNumber>(satrec.argpo * RAD2DEG).toString();
    const inc = <StringifiedNumber>sat.TLE2.substr(8, 8);
    const meanmo = <StringifiedNumber>sat.TLE2.substr(52, 10);
    const epochyr = sat.TLE1.substr(18, 2);
    const epochday = sat.TLE1.substr(20, 12);
    const intl = sat.TLE1.substr(9, 8);
    const sccNum = StringPad.pad0(sat.TLE1.substr(2, 5).trim(), 5);

    const period = 1440.0 / parseFloat(meanmo);

    let j = 0;
    for (let i = 0; i < 360; i++) {
      const meana = <StringifiedNumber>StringPad.pad0(j.toFixed(4), 8);
      const { TLE1, TLE2 } = FormatTle.createTle({ sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc: sccNum });
      searchStr += catalogManagerInstance.insertNewAnalystSatellite(TLE1, TLE2, satNum + i, (100000 + i).toString()).sccNum.toString() + ',';
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

export const orbitReferencesPlugin = new OrbitReferences();
