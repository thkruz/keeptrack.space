import { KeepTrackApiEvents, lookanglesRow, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { clickAndDragWidth } from '@app/lib/click-and-drag';
import { getEl } from '@app/lib/get-el';
import { showLoading } from '@app/lib/showLoading';

import { SatMath } from '@app/static/sat-math';

import { getUnique } from '@app/lib/get-unique';
import { saveCsv } from '@app/lib/saveVariable';
import { CatalogExporter } from '@app/static/catalog-exporter';
import { CatalogSearch } from '@app/static/catalog-search';
import analysisPng from '@public/img/icons/analysis.png';
import { DetailedSatellite, DetailedSensor, eci2rae, EciVec3, Kilometers, MINUTES_PER_DAY, SatelliteRecord, TAU } from 'ootk';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * analysis.ts is a plugin for viewing trend data on TLEs and calculating best
 * pass times.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2016-2024 Theodore Kruczek
 * @Copyright (C) 2020-2024 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

export class AnalysisMenu extends KeepTrackPlugin {
  readonly id = 'AnalysisMenu';
  protected dependencies_: [];
  searchStrCache_: string = null;
  bottomIconImg = analysisPng;
  sideMenuElementName = 'analysis-menu';
  sideMenuElementHtml = keepTrackApi.html`
  <div id="analysis-menu" class="side-menu-parent start-hidden text-select">
    <div id="analysis-inner-menu" class="side-menu">
      <h5 class="center-align">Export Catalog</h5>
      <div class="divider"></div>
      <div class="row"></div>
      <!-- <form id="analysis-form">
        <div class="row">
          <div class="input-field col s12">
            <input value="25544" id="anal-sat" type="text" />
            <label for="anal-sat" class="active">Satellite Number</label>
          </div>
        </div>
        <div class="row">
          <div class="input-field col s12">
            <select value="0" id="anal-type" type="text">
              <optgroup label="Orbital Parameters">
                <option value='inc'>Inclination</option>
                <option value='ap'>Apogee</option>
                <option value='pe'>Perigee</option>
                <option value='per'>Period</option>
                <option value='e'>Eccentricity</option>
                <option value='ra'>RAAN</option>
                <option value='all'>All</option>
              </optgroup>
              <optgroup id="anal-look-opt" label="Look Angles">
                <option value='az'>Azimuth</option>
                <option value='el'>Elevation</option>
                <option value='rng'>Range</option>
                <option value='rae'>All</option>
              </optgroup>
            </select>
            <label for="disabled">Chart Type</label>
          </div>
        </div>
        <div class="row">
          <center>
            <button id="analysis-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">
              View Trends &#9658;
            </button>
          </center>
        </div>
      </form> -->
      <div class="row">
        <center>
          <button id="export-catalog-txt-2a" class="btn btn-ui waves-effect waves-light">
            Export Official TLEs &#9658;
          </button>
        </center>
      </div>
      <div class="row">
        <center>
          <button id="export-catalog-txt-3a" class="btn btn-ui waves-effect waves-light">
            Export Official 3LEs &#9658;
          </button>
        </center>
      </div>
      <div class="row">
        <center>
          <button id="export-catalog-txt-2b" class="btn btn-ui waves-effect waves-light">
            Export KeepTrack TLEs &#9658;
          </button>
        </center>
      </div>
      <div class="row">
        <center>
        <button id="export-catalog-txt-3b" class="btn btn-ui waves-effect waves-light">
            Export KeepTrack 3LEs &#9658;
          </button>
        </center>
      </div>
      <div class="row">
        <center>
          <button id="export-catalog-csv-btn" class="btn btn-ui waves-effect waves-light">
            Export Catalog CSV &#9658;
        </button>
        </center>
      </div>
      <h5 class="center-align">Find Objects</h5>
      <div class="divider"></div>
      <div class="row"></div>
      <div class="row">
        <center>
          <button id="export-sat-fov-csv-btn" class="btn btn-ui waves-effect waves-light">
            Export Satellites in FOV &#9658;
        </button>
        </center>
      </div>
      <div class="row">
        <center>
          <button id="findCsoBtn" class="btn btn-ui waves-effect waves-light">Find Close Objects &#9658;</button>
        </center>
      </div>
      <div class="row">
        <center>
          <button id="findReentries" class="btn btn-ui waves-effect waves-light">
          Find Reentries &#9658;
          </button>
        </center>
      </div>
      <h5 class="center-align">Best Pass Times</h5>
      <div class="divider"></div>
      <div class="row"></div>
      <div class="row">
        <form id="analysis-bpt">
          <div class="row">
            <div class="input-field col s12">
              <input value="25544,00005" id="analysis-bpt-sats" type="text" />
              <label for="analysis-bpt-sats" class="active">Satellite Numbers</label>
            </div>
          </div>
          <div class="row">
            <center>
              <button id="analysis-bpt-submit" class="btn btn-ui waves-effect waves-light" type="submit"
                name="action">Generate Best Pass Times &#9658;</button>
            </center>
          </div>
        </form>
      </div>
    </div>
  </div>
  `;

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: 'analysis',
      cb: () => {
        getEl('analysis-bpt')?.addEventListener('submit', (e: Event) => {
          e.preventDefault();
          AnalysisMenu.analysisBptSumbit_();
        });

        getEl('findCsoBtn')?.addEventListener('click', () => {
          showLoading(this.findCsoBtnClick_.bind(this));
        });

        getEl('findReentries')?.addEventListener('click', () => {
          showLoading(AnalysisMenu.findRaBtnClick_);
        });

        const objData = keepTrackApi.getCatalogManager().objectCache;

        getEl('export-catalog-csv-btn')?.addEventListener('click', () => {
          CatalogExporter.exportTle2Csv(objData);
        });

        getEl('export-sat-fov-csv-btn')?.addEventListener('click', () => {
          CatalogExporter.exportSatInFov2Csv(objData);
        });

        getEl('export-catalog-txt-2a')?.addEventListener('click', () => {
          CatalogExporter.exportTle2Txt(objData);
        });

        getEl('export-catalog-txt-2b')?.addEventListener('click', () => {
          CatalogExporter.exportTle2Txt(objData, 2, false);
        });

        getEl('export-catalog-txt-3a')?.addEventListener('click', () => {
          CatalogExporter.exportTle2Txt(objData, 3);
        });

        getEl('export-catalog-txt-3b')?.addEventListener('click', () => {
          CatalogExporter.exportTle2Txt(objData, 3, false);
        });

        clickAndDragWidth(getEl('analysis-menu'));
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.setSensor,
      cbName: this.id,
      cb: (sensor: DetailedSensor | string) => {
        AnalysisMenu.setSensor_(sensor);
      },
    });
  }

  private findCloseObjects_() {
    if (this.searchStrCache_) {
      return this.searchStrCache_;
    }
    const searchRadius = 50; // km

    let satList = AnalysisMenu.getValidSats_();

    // Remove duplicates
    satList = getUnique(satList);

    // Sort satList by position.x property
    satList.sort((a, b) => a.position.x - b.position.x);

    const csoList = AnalysisMenu.getPossibleCSOs_(satList, searchRadius);

    const csoListUnique = getUnique(csoList);

    const csoStrArr = AnalysisMenu.getActualCSOs_(csoListUnique, searchRadius);

    // Generate the search string
    const csoListUniqueArr = Array.from(new Set(csoStrArr));
    let searchStr = '';

    for (let i = 0; i < csoListUniqueArr.length; i++) {
      if (i === csoListUniqueArr.length - 1) {
        searchStr += csoListUniqueArr[i];
      } else {
        searchStr += `${csoListUniqueArr[i]},`;
      }
    }

    // Dont need to do this math more than once
    this.searchStrCache_ = searchStr;

    return searchStr; // csoListUnique;
  }

  private static getActualCSOs_(csoListUnique: { sat1: DetailedSatellite; sat2: DetailedSatellite }[], searchRadius: number) {
    const csoStrArr = []; // Clear CSO List

    // Loop through the possible CSOs
    for (const posCso of csoListUnique) {
      // Calculate the first CSO's position 30 minutes later
      let sat = posCso.sat1;
      let eci = SatMath.getEci(sat, new Date(Date.now() + 1000 * 60 * 30));

      if (eci.position && typeof eci.position !== 'boolean' && eci.position.x === 0 && eci.position.y === 0 && eci.position.z === 0) {
        continue;
      }
      posCso.sat1.position = eci.position as EciVec3;

      // Calculate the second CSO's position 30 minutes later
      sat = posCso.sat2;
      eci = SatMath.getEci(sat, new Date(Date.now() + 1000 * 60 * 30));
      if (eci.position && typeof eci.position !== 'boolean' && eci.position.x === 0 && eci.position.y === 0 && eci.position.z === 0) {
        continue;
      }
      sat.position = eci.position as EciVec3;
      posCso.sat2.position = eci.position as EciVec3;
    }

    // Loop through the CSOs
    for (const posCso of csoListUnique) {
      // Check the first CSO
      const sat1 = posCso.sat1;
      const pos1 = sat1.position;

      if (typeof pos1 === 'undefined') {
        continue;
      }

      // Calculate the area around the CSO
      const posXmin = pos1.x - searchRadius;
      const posXmax = pos1.x + searchRadius;
      const posYmin = pos1.y - searchRadius;
      const posYmax = pos1.y + searchRadius;
      const posZmin = pos1.z - searchRadius;
      const posZmax = pos1.z + searchRadius;

      // Get the second CSO object
      const sat2 = posCso.sat2;
      const pos2 = sat2.position;

      if (typeof pos2 === 'undefined') {
        continue;
      }

      // If it is still in the search area, add it to the list
      if (pos2.x < posXmax && pos2.x > posXmin && pos2.y < posYmax && pos2.y > posYmin && pos2.z < posZmax && pos2.z > posZmin) {
        csoStrArr.push(sat1.sccNum);
        csoStrArr.push(sat2.sccNum);
      }
    }

    return csoStrArr;
  }

  private static getPossibleCSOs_(satList: DetailedSatellite[], searchRadius: number) {
    const csoList = [];
    // Loop through all the satellites with valid positions

    for (let i = 0; i < satList.length; i++) {
      const sat1 = satList[i];
      const pos1 = sat1.position;

      // Calculate the area around the satellite
      const posXmin = pos1.x - searchRadius;
      const posXmax = pos1.x + searchRadius;
      const posYmin = pos1.y - searchRadius;
      const posYmax = pos1.y + searchRadius;
      const posZmin = pos1.z - searchRadius;
      const posZmax = pos1.z + searchRadius;

      // Loop through the list again
      let j = 0;

      for (j = Math.max(0, i - 200); j < satList.length; j++) {
        const sat2 = satList[j]; // Get the second satellite

        if (sat1 === sat2) {
          continue;
        } // Skip the same satellite
        const pos2 = sat2.position; // Get the second satellite's position

        // Satellites are in order of x position so once we exceed the maxX, we can stop
        if (pos2.x > posXmax) {
          break;
        }
        // Check to see if the second satellite is in the search area
        if (pos2.x < posXmax && pos2.x > posXmin && pos2.y < posYmax && pos2.y > posYmin && pos2.z < posZmax && pos2.z > posZmin) {
          // Add the second satellite to the list if it is close
          csoList.push({ sat1, sat2 });
        }
      }
    }

    return csoList;
  }

  private static getValidSats_() {
    const satList = <DetailedSatellite[]>[];

    // Loop through all the satellites
    for (let i = 0; i < keepTrackApi.getCatalogManager().orbitalSats; i++) {
      // Get the satellite
      const sat = keepTrackApi.getCatalogManager().getSat(i);
      // Avoid unnecessary errors

      if (!sat) {
        continue;
      }
      /*
       * Only look at satellites in LEO
       * if (sat.apogee > 5556) continue;
       * Find where the satellite is right now
       */
      if (typeof sat.position === 'undefined') {
        sat.position = <EciVec3>SatMath.getEci(sat, new Date()).position || { x: <Kilometers>0, y: <Kilometers>0, z: <Kilometers>0 };
      }
      // If it fails, skip it
      if (isNaN(sat.position.x) || isNaN(sat.position.y) || isNaN(sat.position.z)) {
        continue;
      }
      if (sat.position && typeof sat.position !== 'boolean' && sat.position.x === 0 && sat.position.y === 0 && sat.position.z === 0) {
        continue;
      }
      // Add the satellite to the list
      satList.push(sat);
    }

    return satList;
  }

  private static findBestPass_(sat: DetailedSatellite, sensors: DetailedSensor[]): lookanglesRow[] {
    const timeManagerInstance = keepTrackApi.getTimeManager();

    // Check if there is a sensor
    if (sensors.length <= 0 || typeof sensors[0]?.minAz === 'undefined') {
      keepTrackApi.getUiManager().toast('Sensor\'s format incorrect. Did you select a sensor first?', ToastMsgType.critical);

      return [];
    }

    // TOOD: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
    const sensor = sensors[0];

    let offset = 0;

    const satrec = keepTrackApi.getCatalogManager().calcSatrec(sat);
    const lookanglesTable = []; // Iniially no rows to the table

    const looksInterval = 5;
    const looksLength = 7;

    const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

    // Setup flags for passes
    let score = 0;
    let sAz = <string | null>null;
    let sEl = <string | null>null;
    let srng = <string | null>null;
    let sTime = <Date | null>null;
    let passMinrng = sensor.maxRng; // This is set each look to find minimum rng (start at max rng)
    let passMaxEl = 0;
    let start3 = false;
    let stop3 = false;

    const propagateBestPass_ = (now: Date, satrecIn: SatelliteRecord): lookanglesRow => {
      const aer = SatMath.getRae(now, satrecIn, sensor);
      const isInFOV = SatMath.checkIsInView(sensor, aer);

      if (isInFOV) {
        // Previous Pass to Calculate first line of coverage
        const now1 = timeManagerInstance.getOffsetTimeObj(offset - looksInterval * 1000);
        let aer1 = SatMath.getRae(now1, satrecIn, sensor);

        let isInFOV1 = SatMath.checkIsInView(sensor, aer1);

        if (!isInFOV1) {
          // if it starts around 3
          if (aer.el <= 3.5) {
            start3 = true;
          }

          // First Line of Coverage
          sTime = now;
          sAz = aer.az.toFixed(0);
          sEl = aer.el.toFixed(1);
          srng = aer.rng.toFixed(0);
        } else {
          // Next Pass to Calculate Last line of coverage
          const _now1 = timeManagerInstance.getOffsetTimeObj(offset + looksInterval * 1000);

          aer1 = SatMath.getRae(_now1, satrecIn, sensor);

          isInFOV1 = SatMath.checkIsInView(sensor, aer1);
          if (!isInFOV1) {
            // if it stops around 3
            stop3 = aer.el <= 3.5;

            // Skip pass if satellite is in track right now
            if (sTime === null) {
              return {
                sortTime: null,
                SATELLITE_ID: null,
                PASS_SCORE: null,
                START_DATE: null,
                START_TIME: null,
                START_AZIMUTH: null,
                START_ELEVATION: null,
                START_RANGE: null,
                STOP_DATE: null,
                STOP_TIME: null,
                STOP_AZIMTUH: null,
                STOP_ELEVATION: null,
                STOP_RANGE: null,
                TIME_IN_COVERAGE_SECONDS: null,
                MINIMUM_RANGE: null,
                MAXIMUM_ELEVATION: null,
                SENSOR_TO_SUN_AZIMUTH: null,
                SENSOR_TO_SUN_ELEVATION: null,
              };
            }

            score = Math.min((((now.getTime() - sTime.getTime()) / 1000 / 60) * 10) / 8, 10); // 8 minute pass is max score
            let elScore = Math.min((passMaxEl / 50) * 10, 10); // 50 el or above is max score

            // elScore -= Math.max((passMaxEl - 50) / 5, 0); // subtract points for being over 50 el
            elScore *= start3 && stop3 ? 2 : 1; // Double points for start and stop at 3
            score += elScore;
            score += Math.min((10 * 750) / passMinrng, 10); // 750 or less is max score

            // score -= Math.max((750 - passMinrng) / 10, 0); // subtract points for being closer than 750
            let tic = 0;

            tic = (now.getTime() - sTime.getTime()) / 1000 || 0;

            const scene = keepTrackApi.getScene();
            const sunRae = eci2rae(now, {
              x: scene.sun.position[0] as Kilometers,
              y: scene.sun.position[1] as Kilometers,
              z: scene.sun.position[2] as Kilometers,
            }, sensor);

            // Last Line of Coverage
            return {
              sortTime: sTime.getTime(),
              SATELLITE_ID: parseInt(satrecIn.satnum).toString(),
              PASS_SCORE: score.toFixed(1),
              START_DATE: sTime,
              START_TIME: sTime,
              START_AZIMUTH: sAz,
              START_ELEVATION: sEl,
              START_RANGE: srng,
              STOP_DATE: now,
              STOP_TIME: now,
              STOP_AZIMTUH: aer.az.toFixed(0),
              STOP_ELEVATION: aer.el.toFixed(1),
              STOP_RANGE: aer.rng.toFixed(0),
              TIME_IN_COVERAGE_SECONDS: tic,
              MINIMUM_RANGE: passMinrng.toFixed(0),
              MAXIMUM_ELEVATION: passMaxEl.toFixed(1),
              SENSOR_TO_SUN_AZIMUTH: sunRae.az.toFixed(1),
              SENSOR_TO_SUN_ELEVATION: sunRae.el.toFixed(1),
            };
          }
        }
        // Do this for any pass in coverage
        if (passMaxEl < aer.el) {
          passMaxEl = aer.el;
        }
        if (passMinrng > aer.rng) {
          passMinrng = aer.rng;
        }
      }

      return {
        sortTime: null,
        SATELLITE_ID: null,
        PASS_SCORE: null,
        START_DATE: null,
        START_TIME: null,
        START_AZIMUTH: null,
        START_ELEVATION: null,
        START_RANGE: null,
        STOP_DATE: null,
        STOP_TIME: null,
        STOP_AZIMTUH: null,
        STOP_ELEVATION: null,
        STOP_RANGE: null,
        TIME_IN_COVERAGE_SECONDS: null,
        MINIMUM_RANGE: null,
        MAXIMUM_ELEVATION: null,
        SENSOR_TO_SUN_AZIMUTH: null,
        SENSOR_TO_SUN_ELEVATION: null,
      };
    };

    for (let i = 0; i < looksLength * 24 * 60 * 60; i += looksInterval) {
      // lookanglesInterval in seconds
      offset = i * 1000; // Offset in seconds (msec * 1000)
      const now = timeManagerInstance.getOffsetTimeObj(offset);

      if (lookanglesTable.length <= 5000) {
        // Maximum of 1500 lines in the look angles table
        const _lookanglesRow = propagateBestPass_(now, satrec);
        // If data came back...

        if (_lookanglesRow.PASS_SCORE !== null) {
          lookanglesTable.push(_lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1

          // Reset flags for next pass
          score = 0;
          sAz = null;
          sEl = null;
          srng = null;
          sTime = null;
          passMinrng = sensor.maxRng; // This is set each look to find minimum rng
          passMaxEl = 0;
          start3 = false;
          stop3 = false;
          // Jump 3/4th to the next orbit
          i += orbitalPeriod * 60 * 0.75; // NOSONAR
        }
      }
    }

    return lookanglesTable;
  }

  private static findBestPasses_(sats: string, sensor: DetailedSensor) {
    sats = sats.replace(/ /gu, ',');
    const satArray = sats.split(',');
    const passes: lookanglesRow[] = [];

    for (const satId of satArray) {
      try {
        if (typeof satId === 'undefined' || satId === null || satId === '' || satId === ' ') {
          continue;
        }
        const sat = keepTrackApi.getCatalogManager().sccNum2Sat(parseInt(satId));
        const satPasses = AnalysisMenu.findBestPass_(sat, [sensor]);

        for (const pass of satPasses) {
          passes.push(pass);
        }
      } catch (e) {
        console.debug(e);
      }
    }
    passes.sort((a, b) => b.sortTime - a.sortTime);
    passes.reverse();
    passes.forEach((v) => {
      delete v.sortTime;
    });

    for (const pass of passes) {
      pass.START_DATE = (<Date>pass.START_DATE).toISOString().split('T')[0];
      pass.START_TIME = (<Date>pass.START_TIME).toISOString().split('T')[1].split('.')[0];
      pass.STOP_DATE = (<Date>pass.STOP_DATE).toISOString().split('T')[0];
      pass.STOP_TIME = (<Date>pass.STOP_TIME).toISOString().split('T')[1].split('.')[0];
    }

    saveCsv(passes, 'bestSatTimes');
  }

  private findCsoBtnClick_() {
    const searchStr = this.findCloseObjects_();

    keepTrackApi.getUiManager().doSearch(searchStr);
  }

  private static findRaBtnClick_() {
    const searchStr = CatalogSearch.findReentry(<DetailedSatellite[]>keepTrackApi.getCatalogManager().objectCache).join(',');

    keepTrackApi.getUiManager().doSearch(searchStr);
  }

  private static analysisBptSumbit_() {
    const sats = (<HTMLInputElement>getEl('analysis-bpt-sats')).value;
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    if (!sensorManagerInstance.isSensorSelected()) {
      keepTrackApi.getUiManager().toast('You must select a sensor first!', ToastMsgType.critical);
    } else {
      AnalysisMenu.findBestPasses_(sats, sensorManagerInstance.getSensor());
    }
  }

  private static setSensor_(sensor: DetailedSensor | string): void {
    const submitButtonDom = <HTMLButtonElement>getEl('analysis-bpt-submit');

    if (!sensor) {
      submitButtonDom.disabled = true;
      submitButtonDom.textContent = 'Select Sensor First!';
    } else {
      submitButtonDom.disabled = false;
      submitButtonDom.textContent = 'Generate Best Pass Times \u25B6';
    }
  }
}

