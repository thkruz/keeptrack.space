import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { getEl } from '@app/engine/utils/get-el';

import { CoordinateTransforms } from '@app/app/analysis/coordinate-transforms';
import { SatMath, StringifiedNumber } from '@app/app/analysis/sat-math';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { hideLoading, showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import { BaseObject, CatalogSource, Degrees, DetailedSatellite, EciVec3, Kilometers, KilometersPerSecond, Seconds, Sgp4, StateVectorSgp4 } from '@ootk/src/main';
import rpo from '@public/img/icons/rpo.png';
import { vec3 } from 'gl-matrix';
import { ClickDragOptions, KeepTrackPlugin, SideMenuSettingsOptions } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '../settings-menu/settings-menu';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';

enum RPOType {
  GEO = 'GEO',
  LEO = 'LEO',
}

interface ProximityOpsEvent {
  sat1Id: number,
  sat1SccNum: string,
  sat1Name?: string,
  sat2Id: number,
  sat2SccNum: string,
  sat2Name?: string,
  ric: {
    position: vec3;
    velocity: vec3;
  },
  dist: number | Kilometers,
  vel: number,
  date: Date,
}

export class ProximityOps extends KeepTrackPlugin {
  readonly id = 'ProximityOps';
  dependencies_ = [SelectSatManager.name];

  isRequireSatelliteSelected = false;
  isIconDisabledOnLoad = false;
  isIconDisabled = false;

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ANALYSIS, MenuMode.ALL];

  private readonly timeManagerInstance = ServiceLocator.getTimeManager()!;
  private readonly selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager)!;
  private readonly catalogManagerInstance = ServiceLocator.getCatalogManager()!;


  dragOptions: ClickDragOptions = {
    isDraggable: true,
    minWidth: 400,
    maxWidth: 700,
  };

  dragOptionsSecondary: ClickDragOptions = {
    isDraggable: true,
    minWidth: 500,
    maxWidth: 1300,
  };

  RPOs: ProximityOpsEvent[] = [];
  bottomIconImg = rpo;
  secondaryMenuIcon = 'view_list';

  sideMenuElementName = 'proximityOps-menu';
  sideMenuElementHtml = html`
    <form id="proximityOps">
    <div class="input-field col s12">
        <input value="0" id="proximity-ops-norad" type="text" maxlength="5" />
        <label for="proximity-ops-norad" class="active">${t7e('plugins.ProximityOps.noradId')}</label>
    </div>

    <div class="input-field col s12">
        <input placeholder="100" value="100" id="proximity-ops-maxDis" type="text" maxlength="5" />
        <label for="proximity-ops-maxDis" class="active">${t7e('plugins.ProximityOps.maxDistThreshold')}</label>
    </div>

    <div class="input-field col s12">
        <input placeholder="0.1" value="0.1" id="proximity-ops-maxVel" type="text" maxlength="5" />
        <label for="proximity-ops-maxVel" class="active">${t7e('plugins.ProximityOps.maxRelativeVelocity')}</label>
    </div>

    <div class="input-field col s12">
        <input placeholder="24" value="24" id="proximity-ops-duration" type="text" maxlength="5" />
        <label for="proximity-ops-duration" class="active">${t7e('plugins.ProximityOps.searchDuration')}</label>
    </div>

    <div class="input-field col s12">
        <select id="proximity-ops-type" type="text" ${(<HTMLInputElement>getEl('proximity-ops-ava', true))?.checked ? 'disabled' : ''}>
            <option value="GEO" selected>${t7e('plugins.ProximityOps.geoText')}</option>
            <option value="LEO">${t7e('plugins.ProximityOps.leoText')}</option>
        </select>
        <label for="proximity-ops-type">${t7e('plugins.ProximityOps.orbitType')}</label>
    </div>

    <div class="input-field col s12">
        <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="${t7e('plugins.ProximityOps.geoAllVsAllTooltip')}">
                <input id="proximity-ops-ava" type="checkbox"/>
                <span class="lever"></span>
                ${t7e('plugins.ProximityOps.geoAllVsAll')}
            </label>
        </div>
    </div>

    <div class="input-field col s12">
        <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="${t7e('plugins.ProximityOps.comparePayloadsOnlyTooltip')}">
                <input id="proximity-ops-payload-only" type="checkbox"/>
                <span class="lever"></span>
                ${t7e('plugins.ProximityOps.comparePayloadsOnly')}
            </label>
        </div>
    </div>

    <div class="input-field col s12">
        <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="${t7e('plugins.ProximityOps.ignoreVimpelRsoTooltip')}">
                <input id="proximity-ops-no-vimpel" type="checkbox"/>
                <span class="lever"></span>
                ${t7e('plugins.ProximityOps.ignoreVimpelRso')}
            </label>
        </div>
    </div>

    <div class="center-align row">
        <button id="submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Find RPOs &#9658;</button>
    </div>
    </form>
    `;

  sideMenuSecondaryHtml: string = html`
    <div class="row" style="margin: 0 10px;">
      <h5 class="center-align">${t7e('plugins.ProximityOps.titleSecondary')}</h5>
      <table id="proximity-ops-table" class="center-align striped-light centered"></table>
    </div>`;
  sideMenuSecondaryOptions: SideMenuSettingsOptions = {
    width: 1000,
    leftOffset: null,
    zIndex: 3,
  };

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {

        getEl('submit')!.addEventListener('click', (e) => {
          this.onSubmit_(e);
        });

        getEl('proximity-ops-type')!.addEventListener('change', () => {
          const orbitTypeInput = <HTMLSelectElement>getEl('proximity-ops-type');
          const rpoAvailabilityInput = <HTMLInputElement>getEl('proximity-ops-ava');
          const isAllVsAllChecked = rpoAvailabilityInput.checked;

          if (isAllVsAllChecked && orbitTypeInput.value !== RPOType.GEO) {
            // Deselect the all vs all checkbox
            rpoAvailabilityInput.checked = false;
            rpoAvailabilityInput.dispatchEvent(new Event('change'));
          }
        });

        getEl('proximity-ops-ava')!.addEventListener('change', () => {
          const isAllVsAllChecked = (<HTMLInputElement>getEl('proximity-ops-ava')).checked;
          const orbitTypeInput = <HTMLSelectElement>getEl('proximity-ops-type');

          if (isAllVsAllChecked) {
            orbitTypeInput.value = 'GEO';
            orbitTypeInput.setAttribute('disabled', 'true');
          } else {
            orbitTypeInput.removeAttribute('disabled');
          }

          orbitTypeInput.dispatchEvent(new Event('change'));
        });

        getEl(`${this.sideMenuElementName}-secondary-btn`)!.style.color = 'var(--statusDarkDisabled)';
      },
    );
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        if (this.isMenuButtonActive && obj?.isSatellite() && (obj as DetailedSatellite).sccNum !== (<HTMLInputElement>getEl('proximity-ops-norad')).value) {
          this.updateNoradId_();
        }
      },
    );
  }

  bottomIconCallback = (): void => {
    this.updateNoradId_();
  };

  downloadIconCb = () => {

    if (this.RPOs.length === 0) {
      ServiceLocator.getUiManager().toast('No RPOs to download!', ToastMsgType.caution, true);

      return;
    }

    const csvData = this.convertRPOsToCSV(this.RPOs);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);

    let name: string;

    if ((<HTMLInputElement>getEl('proximity-ops-ava')).checked) {
      name = `All-vs-All-${(<HTMLInputElement>getEl('proximity-ops-type')).value}`;
    } else {
      name = (<HTMLInputElement>getEl('proximity-ops-norad')).value;
    }

    // Set the download attribute with a dynamically generated filename
    link.download = `${new Date().toISOString().slice(0, 19)}-RPOs-${name}.csv`;

    // Simulate a click on the link to trigger the download
    link.click();
  };

  private convertRPOsToCSV(rpoArray: ProximityOpsEvent[]) {
    // Create the header of the CSV
    const headers = [
      't_id', 't_name', 'c_id', 'c_name', 'date',
      'dr(km)', 'dt(km)', 'dn(km)',
      'dvr(km/s)', 'dvt(km/s)', 'dvn(km/s)',
      'rel_dist(km)', 'rel_vel(km/s)',
    ];

    // Initialize CSV content with headers
    const csvRows: string[] = [];

    csvRows.push(headers.join(','));

    // Iterate over each RPO instance in the array
    rpoArray.forEach((rpo) => {
      // Prepare a row with the RPO's values
      const row = [
        rpo.sat1Id,
        rpo.sat1SccNum,
        rpo.sat1Name,
        rpo.sat2Id,
        rpo.sat2SccNum,
        rpo.sat2Name,
        rpo.date.toISOString(), // Convert the date to a string
        rpo.ric.position[0],
        rpo.ric.position[1],
        rpo.ric.position[2],
        rpo.ric.velocity[0],
        rpo.ric.velocity[1],
        rpo.ric.velocity[2],
        rpo.dist,
        rpo.vel,
      ];

      csvRows.push(row.join(','));
    });

    // Join all rows and return as a single CSV string
    const csvContent = csvRows.join('\n');

    return csvContent;
  }

  private onSubmit_(e: MouseEvent) {
    e.preventDefault();

    showLoading(() => {
      this.RPOs = this.processRPOSearch_();
      // Sort RPOs
      this.RPOs = [...this.RPOs].sort((a, b) => a.dist - b.dist);

      this.populateTable_(this.RPOs);

      if (this.RPOs.length > 0) {
        if (!this.isSideMenuSettingsOpen) {
          this.openSecondaryMenu();
        }
      } else if (this.isSideMenuSettingsOpen) {
        this.closeSecondaryMenu();
      }

      hideLoading();
    }, -1);
  }

  /**
   * Step 1 of the RPO search process.
   *
   * Processes a search for Rendezvous and Proximity Operations (RPOs) based on user input from the UI.
   *
   * This method retrieves parameters such as availability check, maximum distance, maximum velocity,
   * duration, and RPO type from the UI elements. Depending on the selected RPO type (GEO or LEO) and
   * whether the availability check is enabled, it iterates through relevant orbital parameters to find
   * satellite pairs and computes possible RPOs using helper methods.
   *
   * If a specific satellite is selected (availability check is off), it attempts to find the satellite by NORAD ID
   * and computes RPOs for that satellite.
   *
   * Displays a toast notification if no RPOs are found or if the specified satellite cannot be found.
   */
  private processRPOSearch_() {
    const isAvaChecked = (<HTMLInputElement>getEl('proximity-ops-ava')).checked;

    const maxDis = parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('proximity-ops-maxDis')).value) as Kilometers;
    const maxVel = parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('proximity-ops-maxVel')).value) as KilometersPerSecond;
    const duration = parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('proximity-ops-duration')).value) * 60 ** 2 as Seconds;
    const type = (<HTMLInputElement>getEl('proximity-ops-type')).value as RPOType;
    let RPOs: ProximityOpsEvent[] = [];

    const satPairs: number[][] = [];

    if (isAvaChecked && type === RPOType.GEO) {
      for (let lon = -180; lon <= 180; lon += 1.5) {
        const sats = this.findSatsAvAGeo_(lon as Degrees);

        sats.forEach((sat1, i) => {
          sats.slice(i + 1).forEach((sat2) => {
            satPairs.push([sat1.id, sat2.id]);
          });
        });
        const rpos = this.findRPOs_(sats, maxDis, maxVel, duration as Seconds, isAvaChecked, satPairs);

        RPOs = RPOs.concat(rpos);
      }
    } else if (isAvaChecked && type === RPOType.LEO) {
      for (let inc = 0; inc <= 180; inc += 5) {
        for (let raan = 0; raan <= 360; raan += 5) {
          const sats = this.findSatsAvALeo_(inc as Degrees, raan as Degrees);

          if (sats.length === 0) {
            continue;
          }
          sats.forEach((sat1, i) => {
            sats.slice(i + 1).forEach((sat2) => {
              satPairs.push([sat1.id, sat2.id]);
            });
          });

          const rpos = this.findRPOs_(sats, maxDis, maxVel, duration as Seconds, isAvaChecked, satPairs);

          RPOs = RPOs.concat(rpos);
        }
      }
    } else {
      const primarySatSccNum = (<HTMLInputElement>getEl('proximity-ops-norad')).value;
      const satelliteId = this.catalogManagerInstance.sccNum2Id(primarySatSccNum);

      if (!satelliteId) {
        ServiceLocator.getUiManager().toast(`Satellite with NORAD ID ${primarySatSccNum} not found`, ToastMsgType.caution, true);

        return [];
      }

      const primarySatId = satelliteId.toString();
      const sats = this.findSatsById_(primarySatId, type, duration);

      RPOs = this.findRPOs_(sats, maxDis, maxVel, duration, isAvaChecked);
    }

    if (RPOs.length === 0) {
      ServiceLocator.getUiManager().toast('No RPOs found!', ToastMsgType.caution, true);
    }

    return RPOs;
  }

  /**
   * Step 2 of the RPO search process.
   *
   * Finds and returns a list of Rendezvous and Proximity Operations (RPOs) between satellites based on distance, velocity, and other criteria.
   *
   * @param sats - An array of `DetailedSatellite` objects to be checked for potential RPOs.
   * @param maxDis - The maximum allowed distance (in kilometers) between satellites for an RPO to be considered.
   * @param maxVel - The maximum allowed relative velocity (in km/s or m/s, depending on implementation) for an RPO to be considered.
   * @param duration - The time duration (in seconds) over which to search for the closest approach.
   * @param isAvaChecked - If `true`, only consider satellite pairs not present in `satPairs`.
   * @param satPairs - (Optional) An array of satellite ID pairs to exclude from RPO consideration if `isAvaChecked` is `true`.
   * @returns An array of `RPO` objects representing the detected RPOs that meet the specified criteria.
   */
  private findRPOs_(sats: DetailedSatellite[], maxDis: number, maxVel: number, duration: Seconds, isAvaChecked: boolean, satPairs?: number[][]) {

    const RPOs: ProximityOpsEvent[] = [];
    const nowDate = ServiceLocator.getTimeManager().getOffsetTimeObj(0);

    if (isAvaChecked && satPairs) {

      sats.forEach((primarySat, i) => {
        sats.slice(i + 1).forEach((secondarySat) => {
          if (!(satPairs.includes([primarySat.id, secondarySat.id]) || satPairs.includes([secondarySat.id, primarySat.id]))) {

            // if (!((secondarySat.perigee > primarySat.apogee + maxDis|| primarySat.perigee > secondarySat.apogee ))) {
            if (((secondarySat.perigee - primarySat.apogee) > maxDis || (primarySat.perigee - secondarySat.apogee) > maxDis)) {
              return;
            }
            if (!(Math.abs(primarySat.inclination - secondarySat.inclination) < 1)) {
              return;
            }

            const res = this.findClosestApproach(primarySat, secondarySat, nowDate, duration);

            if (res.dist <= maxDis && res.vel <= maxVel) {
              RPOs.push(res);
            }
          }
        });
      });
    } else {

      const primarySat = sats[0];

      sats.slice(1).forEach((secondarySat) => {

        const res = this.findClosestApproach(primarySat, secondarySat, nowDate, duration);

        if (res.dist <= maxDis && res.vel <= maxVel) {
          RPOs.push(res);
        }
      });
    }

    return RPOs;
  }

  /**
   * Step 3 of the RPO search process. (There are 3 possible step 3s)
   *
   * Finds and returns a list of satellites related to a primary satellite based on the specified orbit type and duration.
   * The primary satellite is always included as the first element in the returned array.
   *
   * @param primarySatID - The ID of the primary satellite to search around.
   * @param type - The type of rendezvous proximity operation (RPO), e.g., GEO or LEO.
   * @param duration - The duration (in seconds) to consider for proximity calculations.
   * @returns An array of `DetailedSatellite` objects, with the primary satellite as the first element, followed by satellites matching the proximity criteria.
   *
   * @remarks
   * - For GEO type, satellites are filtered based on longitude proximity and orbital period.
   * - For LEO type, satellites are filtered based on perigee/apogee separation, inclination, and right ascension proximity.
   * - Throws an error via `errorManagerInstance` if an unknown orbit type is provided.
   */
  private findSatsById_(primarySatID: string, type: string, duration: Seconds): DetailedSatellite[] {
    const allSats = this.getFilteredSatellites();
    const primarySat = ServiceLocator.getCatalogManager().getSat(parseInt(primarySatID))!;

    let sats: DetailedSatellite[] = [];

    if (type === RPOType.GEO) {
      const lla = primarySat.lla();

      if (!lla) {
        errorManagerInstance.error(new Error('No LLA for primary satellite!'), 'ProximityOps');

        return [];
      }

      sats = allSats
        .filter((sat) => {
          const lla2 = sat.lla();

          if (!lla2) {
            return false;
          }

          return sat.tle1 &&
            sat.period > 23 * 60 &&
            /*
             * assuming max drift rate to be 3deg longitude/day then take large enough lon. window to capture
             * all possible "fly-by" RPOs depends on length of search
             */
            (180 - Math.abs(Math.abs(lla.lon - lla2.lon) - 180)) < 3 * duration / (24 * 60 ** 2) &&
            sat.id.toString() !== primarySatID;
        });
    } else if (type === RPOType.LEO) {
      const nowDate = ServiceLocator.getTimeManager().getOffsetTimeObj(0);

      const raan1 = SatMath.normalizeRaan(primarySat, nowDate);

      sats = allSats
        .filter((sat) => {
          const raan2 = SatMath.normalizeRaan(sat, nowDate);

          return sat.tle1 &&
            (180 - Math.abs(Math.abs(primarySat.inclination - sat.inclination) - 180)) < 5 &&
            (360 - Math.abs(Math.abs(raan1 - raan2) - 360)) < 5 &&
            sat.id.toString() !== primarySatID;
        });
    } else {
      errorManagerInstance.error(new Error('Unknown orbit type!'), 'ProximityOps');
    }

    sats.unshift(primarySat);

    return sats;
  }

  /**
   * Step 3 of the RPO search process. (There are 3 possible step 3s)
   *
   * Finds and returns a list of satellites in the filtered set that are in a specific type of low Earth orbit (LEO)
   * based on the provided inclination and right ascension of the ascending node (RAAN).
   *
   * The function filters satellites that:
   * - Have a valid TLE line 1 (`tle1` is defined)
   * - Have an orbital period less than 180 minutes (3 hours)
   * - Have an inclination within 5 degrees of the specified `inc`
   * - Have a right ascension within 5 degrees of the specified `raan`
   *
   * @param inc - The target inclination in degrees.
   * @param raan - The target right ascension of the ascending node in degrees.
   * @returns An array of `DetailedSatellite` objects matching the specified orbital parameters.
   */
  private findSatsAvALeo_(inc: Degrees, raan: Degrees): DetailedSatellite[] {
    const allSats = this.getFilteredSatellites();

    const sats = allSats
      .filter((sat) => sat.tle1 &&
        sat.period < 3 * 60 &&
        (180 - Math.abs(Math.abs(inc - sat.inclination) - 180)) < 5 &&
        (360 - Math.abs(Math.abs(raan - sat.rightAscension) - 360)) < 5,
      );

    return sats;
  }

  /**
   * Step 3 of the RPO search process. (There are 3 possible step 3s)
   *
   * Finds and returns a list of geostationary satellites that are available at a given longitude.
   *
   * This method filters the list of satellites to include only those that:
   * - Have a valid TLE line 1 (`tle1` is defined).
   * - Have an orbital period greater than 23 hours (in minutes).
   * - Are located within 1 degree of the specified longitude, accounting for longitude wrapping.
   *
   * @param lon - The longitude (in degrees) to search for available geostationary satellites.
   * @returns An array of `DetailedSatellite` objects that match the criteria.
   */
  private findSatsAvAGeo_(lon: Degrees): DetailedSatellite[] {
    const allSats = this.getFilteredSatellites();

    const sats = allSats
      .filter((sat) => {
        const lla2 = sat.lla();

        if (!lla2) {
          return false;
        }

        return (sat.tle1 &&
          sat.period > 23 * 60 &&
          (180 - Math.abs(Math.abs(lon - lla2.lon) - 180)) < 1);
      });

    return sats;
  }

  /**
   * Retrieves a filtered list of satellites based on user-selected criteria.
   *
   * This method obtains all satellites from the catalog manager and applies filters
   * depending on the state of two checkboxes in the UI:
   * - "Payload Only": If checked, only satellites identified as payloads are included.
   * - "No Vimpel": If checked, satellites with a source of `CatalogSource.VIMPEL` are excluded.
   *
   * The filtering is performed efficiently in a single pass if either filter is active.
   */
  private getFilteredSatellites(): DetailedSatellite[] {
    let allSats = ServiceLocator.getCatalogManager().getSats();
    const isPayloadOnlyChecked = (<HTMLInputElement>getEl('proximity-ops-payload-only')).checked;
    const isVimpelChecked = (<HTMLInputElement>getEl('proximity-ops-no-vimpel')).checked;

    // We only want to run filter once in total for performance reasons
    if (isPayloadOnlyChecked || isVimpelChecked) {
      allSats = allSats.filter((sat) => {
        if (isPayloadOnlyChecked && !sat.isPayload()) {
          return false;
        }
        if (isVimpelChecked && sat.source === CatalogSource.VIMPEL) {
          return false;
        }

        return true;
      });
    }

    return allSats;
  }

  /**
   * Populates the "proximity-ops-table" HTML table with a list of Rendezvous and Proximity Operations (RPO) data.
   *
   * This method clears any existing table content, creates a header row, and inserts a row for each RPO entry.
   * Each row displays information such as target and chaser satellite numbers and names, relative distance and velocity,
   * and the date of the event. Clicking a row triggers the `onRpoEventClicked_` handler with the corresponding RPO.
   * If the provided list is empty, a single row indicating "No RPOs found" is displayed.
   *
   * @param events - An array of RPO objects to display in the table.
   */
  private populateTable_(events: ProximityOpsEvent[]) {

    const tbl = <HTMLTableElement>getEl('proximity-ops-table'); // Identify the table to update

    tbl.innerHTML = ''; // Clear the table from old object data

    // Create header row
    const headers = [
      { text: 'Target', style: 'text-decoration: underline' },
      { text: 'Target Name', style: 'text-decoration: underline' },
      { text: 'Chaser', style: 'text-decoration: underline' },
      { text: 'Chaser Name', style: 'text-decoration: underline' },
      { text: 'Rel. Distance [km]', style: 'text-decoration: underline' },
      { text: 'Rel. Velocity [km/s]', style: 'text-decoration: underline' },
      { text: 'Date', style: 'text-decoration: underline; min-width: 155px' },
    ];
    const headerRow = tbl.insertRow();

    headers.forEach((header) => {
      const th = headerRow.insertCell();

      th.appendChild(document.createTextNode(header.text));
      th.setAttribute('style', header.style);
    });

    // Populate table rows
    for (const rpo of events) {
      const row = tbl.insertRow();

      row.className = 'link';

      const cells = [
        rpo.sat1SccNum,
        rpo.sat1Name ?? '',
        rpo.sat2SccNum,
        rpo.sat2Name ?? '',
        rpo.dist.toFixed(2),
        rpo.vel.toFixed(3),
        rpo.date.toISOString().slice(0, 19),
      ];

      cells.forEach((cellText) => {
        const td = row.insertCell();

        td.appendChild(document.createTextNode(cellText));
      });

      row.addEventListener('click', () => this.onEventClicked_(rpo));
    }

    if (events.length === 0) {
      const tr = tbl.insertRow();
      const td = tr.insertCell();

      td.colSpan = 4;
      td.appendChild(document.createTextNode('No RPOs found'));
    }
  }

  /**
   * Handles the event when an RPO (Rendezvous and Proximity Operations) event is clicked.
   *
   * This method performs the following actions:
   * - Adjusts the static time offset based on the RPO event date.
   * - Sets the secondary and primary satellites for selection, ensuring the primary satellite displays secondary info.
   * - Determines the orbit display mode (ECF or ECI) based on the perigee of the primary satellite and updates the settings accordingly.
   * - Synchronizes the settings menu plugin.
   * - Initiates a search for the involved satellites using their SCC numbers.
   * - Closes both the secondary and side menus.
   *
   * @param event - The RPO event object containing satellite IDs, SCC numbers, and the event date.
   */
  private onEventClicked_(event: ProximityOpsEvent) {
    this.timeManagerInstance.changeStaticOffset(new Date(event.date).getTime() - new Date().getTime());

    // Set the secondary first so that the primary shows secondary info in the sat-info-box
    this.selectSatManagerInstance.setSecondarySat(event.sat2Id);
    this.selectSatManagerInstance.selectSat(event.sat1Id);

    const uiManagerInstance = ServiceLocator.getUiManager();

    if (!settingsManager.isOrbitCruncherInEcf && (this.selectSatManagerInstance.primarySatObj as DetailedSatellite).perigee > 6000) {
      uiManagerInstance.toast('GEO Orbits displayed in ECF', ToastMsgType.normal);
      settingsManager.isOrbitCruncherInEcf = true;
    } else if (settingsManager.isOrbitCruncherInEcf) {
      uiManagerInstance.toast('GEO Orbits displayed in ECI', ToastMsgType.standby);
      settingsManager.isOrbitCruncherInEcf = false;
    }
    SettingsMenuPlugin.syncOnLoad();

    uiManagerInstance.doSearch(`${event.sat1SccNum},${event.sat2SccNum}`);

    this.closeSecondaryMenu();
    this.closeSideMenu();
  }

  /**
   * Updates the NORAD ID and related proximity operation fields in the UI based on the currently selected satellite.
   *
   * - Determines the satellite type (LEO or GEO) by checking its orbital period and inclination,
   *   and updates the proximity operation type and maximum distance fields accordingly.
   * - Dispatches a 'change' event on the proximity operation type input to trigger any listeners.
   * - If the selected satellite is from the Vimpel catalog, displays a message indicating unsupported status.
   * - Otherwise, sets the NORAD ID field to the satellite's SCC number.
   *
   * Assumes that the relevant DOM elements exist and that the selected satellite is of type `DetailedSatellite`.
   */
  private updateNoradId_() {
    const satellite = PluginRegistry.getPlugin(SelectSatManager)!.getSelectedSat() as DetailedSatellite;

    if (!satellite?.isSatellite()) {
      return;
    }

    // If satellites is not in GEO belt then treat it like LEO
    if ((satellite.period < 23 * 60 || satellite.period > 25 * 60) && satellite.inclination > 10) {
      (<HTMLInputElement>getEl('proximity-ops-type')).value = RPOType.LEO;
      (<HTMLInputElement>getEl('proximity-ops-maxDis')).value = '5000';
    } else {
      (<HTMLInputElement>getEl('proximity-ops-type')).value = RPOType.GEO;
      (<HTMLInputElement>getEl('proximity-ops-maxDis')).value = '100';
    }
    (<HTMLInputElement>getEl('proximity-ops-type')).dispatchEvent(new Event('change'));


    // Handle Vimpel satellites
    if (satellite.source === CatalogSource.VIMPEL) {
      (<HTMLInputElement>getEl('proximity-ops-norad')).value = 'Vimpel Satellites are not supported';

      return;
    }

    // Handle other satellites
    (<HTMLInputElement>getEl('proximity-ops-norad')).value = satellite.sccNum;
  }

  getRIC(pos1: EciVec3, vel1: EciVec3<KilometersPerSecond>, pos2: EciVec3, vel2: EciVec3<KilometersPerSecond>) {

    const sat1 = { position: pos1, velocity: vel1 };
    const sat2 = { position: pos2, velocity: vel2 };

    const ric = CoordinateTransforms.sat2ric(sat1, sat2);

    return ric;
  }

  findClosestApproach(sat1: DetailedSatellite, sat2: DetailedSatellite, start: Date, duration: Seconds): ProximityOpsEvent {

    /**
     * This is the minimum distance between the two satellites at closest approach
     */
    let minDistAtToca = Infinity;
    /**
     * This is the relative velocity between the two satellites at closest approach
     */
    let relVelNormAtToca = Infinity as KilometersPerSecond;
    /**
     * This is the time of closest approach
     */
    let toca = new Date();

    let sat1State: StateVectorSgp4;
    let sat2State: StateVectorSgp4;
    let pos1: EciVec3;
    let pos2: EciVec3;

    const shortestPeriod = ((sat1.period > sat2.period) ? sat2.period : sat1.period) * 60;

    // large steps defined to be at least 2 points per orbit
    const bigStep = shortestPeriod / 2;
    // small steps defined to be at least 10 points per orbit
    const littleStep = shortestPeriod / 10;
    // very small steps defined to be at least 10 points per orbit
    const veryLittleStep = shortestPeriod / 100;

    let currentDist = Infinity as Kilometers;

    for (let t = 0; t < duration; t += bigStep) {

      const now = new Date(start.getTime() + t * 1000);

      try {
        ({ sat1State, sat2State, currentDist } = this.getCurrentDist_(now, sat1, sat2));

      } catch (e) {
        errorManagerInstance.log(e);
      }

      if (currentDist < minDistAtToca) {
        minDistAtToca = currentDist;
        toca = now;
      }
    }

    start = new Date(toca.getTime() - shortestPeriod * 1000);
    duration = 2 * shortestPeriod as Seconds;

    for (let t = 0; t < duration; t += littleStep) {

      const now = new Date(start.getTime() + t * 1000);

      let m = SatMath.calculateTimeVariables(now, sat1.satrec).m as number;

      sat1State = Sgp4.propagate(sat1.satrec, m);

      m = SatMath.calculateTimeVariables(now, sat2.satrec).m as number;
      sat2State = Sgp4.propagate(sat2.satrec, m);

      if (!sat2State.position || !sat1State.position || !sat2State.velocity || !sat1State.velocity) {
        continue;
      }

      currentDist = SatMath.distance(sat2State.position, sat1State.position);

      if (currentDist < minDistAtToca) {
        minDistAtToca = currentDist;
        toca = now;
      }
    }

    start = new Date(toca.getTime() - shortestPeriod / 4 * 1000);
    duration = shortestPeriod / 2 as Seconds;

    let ric = {
      position: vec3.fromValues(0, 0, 0),
      velocity: vec3.fromValues(0, 0, 0),
    };

    for (let t = 0; t < duration; t += veryLittleStep) {

      const now = new Date(start.getTime() + t * 1000);

      let m = SatMath.calculateTimeVariables(now, sat1.satrec).m;

      sat1State = Sgp4.propagate(sat1.satrec, m as number);

      m = SatMath.calculateTimeVariables(now, sat2.satrec).m;
      sat2State = Sgp4.propagate(sat2.satrec, m as number);

      pos1 = <EciVec3>sat1State.position;
      pos2 = <EciVec3>sat2State.position;

      currentDist = SatMath.distance(pos2, pos1);


      if (currentDist < minDistAtToca) {
        minDistAtToca = currentDist;
        toca = now;

        const vel1 = sat1State.velocity as EciVec3<KilometersPerSecond>;
        const vel2 = sat2State.velocity as EciVec3<KilometersPerSecond>;

        relVelNormAtToca = SatMath.velocity(vel2, vel1);

        ric = this.getRIC(pos1, vel1, pos2, vel2);
        /*
         * TODO: Figure out why these have different answers
         * and deprecate keeptrack method for ootk method
         * console.log('Proposed Method');
         * console.log(ric);
         * console.log('Ootk Method');
         * console.log(sat1.toRIC(sat2, now));
         */

      }
    }
    // Use VIMPEL number if needed.
    let sat1Num: string;
    let sat2Num: string;

    if (sat1.source === CatalogSource.VIMPEL) {
      sat1Num = `JSC${sat1.altId}`;
    } else {
      sat1Num = sat1.sccNum;
    }
    if (sat2.source === CatalogSource.VIMPEL) {
      sat2Num = `JSC${sat2.altId}`;
    } else {
      sat2Num = sat2.sccNum;
    }

    const rpo: ProximityOpsEvent = {
      sat1Id: sat1.id,
      sat2Id: sat2.id,
      sat1SccNum: sat1Num,
      sat2SccNum: sat2Num,
      sat1Name: sat1.name,
      sat2Name: sat2.name,
      ric,
      dist: minDistAtToca,
      vel: relVelNormAtToca,
      date: toca,
    };

    return rpo;
  }

  private getCurrentDist_(now: Date, sat1: DetailedSatellite, sat2: DetailedSatellite) {
    const m1 = SatMath.calculateTimeVariables(now, sat1.satrec).m as number;
    const m2 = SatMath.calculateTimeVariables(now, sat2.satrec).m as number;
    const sv1 = Sgp4.propagate(sat1.satrec, m1);
    const sv2 = Sgp4.propagate(sat2.satrec, m2);

    if (!sv1.position || !sv2.position) {
      const invalidStateVector = {
        position: {
          x: 0 as Kilometers,
          y: 0 as Kilometers,
          z: 0 as Kilometers,
        },
        velocity: {
          x: 0 as KilometersPerSecond,
          y: 0 as KilometersPerSecond,
          z: 0 as KilometersPerSecond,
        },
      };

      return {
        sat1State: invalidStateVector,
        sat2State: invalidStateVector,
        currentDist: Infinity as Kilometers,
      };
    }

    const currentDist = SatMath.distance(sv2.position as EciVec3, sv1.position as EciVec3);

    return { sat1State: sv1, sat2State: sv2, currentDist };
  }
}
