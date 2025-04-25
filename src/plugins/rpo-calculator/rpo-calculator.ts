import { KeepTrackApiEvents, MenuMode, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';

import { hideLoading, showLoading } from '@app/lib/showLoading';
import { t7e } from '@app/locales/keys';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { CoordinateTransforms } from '@app/static/coordinate-transforms';
import { SatMath, StringifiedNumber } from '@app/static/sat-math';
import rpo from '@public/img/icons/rpo.png';
import { vec3 } from 'gl-matrix';
import { BaseObject, CatalogSource, Degrees, DetailedSatellite, EciVec3, Kilometers, KilometersPerSecond, Seconds, Sgp4, StateVectorSgp4 } from 'ootk';
import { ClickDragOptions, KeepTrackPlugin, SideMenuSettingsOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '../settings-menu/settings-menu';

enum RPOType {
  GEO = 'GEO',
  LEO = 'LEO',
}

interface RPO {
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

export class RPOCalculator extends KeepTrackPlugin {
  readonly id = 'RPOCalculator';
  dependencies_ = [SelectSatManager.name];

  isRequireSatelliteSelected = false;
  isIconDisabledOnLoad = false;
  isIconDisabled = false;

  constructor() {
    super();
  }

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL, MenuMode.EXPERIMENTAL];

  private readonly timeManagerInstance = keepTrackApi.getTimeManager()!;
  private readonly selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager)!;
  private readonly catalogManagerInstance = keepTrackApi.getCatalogManager()!;


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

  RPOs: RPO[] = [];
  bottomIconImg = rpo;
  secondaryMenuIcon = 'view_list';

  sideMenuElementName = 'rpoCalculator-menu';
  sideMenuElementHtml = keepTrackApi.html`
    <form id="rpoCalculator">
    <div class="input-field col s12">
        <input value="0" id="scc" type="text" maxlength="5" />
        <label for="scc" class="active">Satellite SCC#</label>
    </div>

    <div class="input-field col s12">
        <input placeholder="100" value="100" id="maxDis" type="text" maxlength="5" />
        <label for="maxDis" class="active">Maximum Distance Threshold [km]</label>
    </div>

    <div class="input-field col s12">
        <input placeholder="0.1" value="0.1" id="maxVel" type="text" maxlength="5" />
        <label for="maxVel" class="active">Maximum Relative Velocity Threshold [km/s]</label>
    </div>

    <div class="input-field col s12">
        <input placeholder="24" value="24" id="duration" type="text" maxlength="5" />
        <label for="duration" class="active">Search Duration [h]</label>
    </div>

    <div class="input-field col s12">
        <select id="rpo-orbit-type" type="text" ${(<HTMLInputElement>getEl('rpo-ava'))?.checked ? 'disabled' : ''}>
            <option value="GEO" selected>GEO</option>
            <option value="LEO">LEO</option>
        </select>
        <label for="orbitType">Orbit Type</label>
    </div>

    <div class="input-field col s12">
        <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Search for RPOs between all RSOs">
                <input id="rpo-ava" type="checkbox"/>
                <span class="lever"></span>
                GEO All vs All
            </label>
        </div>
    </div>

    <div class="input-field col s12">
        <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Only compare RSOs that are payloads">
                <input id="rpo-payload-only" type="checkbox"/>
                <span class="lever"></span>
                Compare Payloads Only
            </label>
        </div>
    </div>

    <div class="input-field col s12">
        <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Ignore Vimpel RSOs">
                <input id="rpo-no-vimpel" type="checkbox"/>
                <span class="lever"></span>
                Ignore Vimpel RSOs
            </label>
        </div>
    </div>

    <div class="center-align row">
        <button id="submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Find RPOs &#9658;</button>
    </div>
    </form>
    `;

  sideMenuSecondaryHtml: string = keepTrackApi.html`
    <div class="row" style="margin: 0 10px;">
      <h5 class="center-align">${t7e('plugins.RPOCalculator.titleSecondary')}</h5>
      <table id="rpos-table" class="center-align striped-light centered"></table>
    </div>`;
  sideMenuSecondaryOptions: SideMenuSettingsOptions = {
    width: 1000,
    leftOffset: null,
    zIndex: 3,
  };

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: 'rpoCalculator',
      cb: () => {

        getEl('submit')!.addEventListener('click', (e) => {
          this.onSubmit_(e);
        });

        getEl('rpo-orbit-type')!.addEventListener('change', () => {
          const orbitTypeInput = <HTMLSelectElement>getEl('rpo-orbit-type');
          const rpoAvailabilityInput = <HTMLInputElement>getEl('rpo-ava');
          const isAllVsAllChecked = rpoAvailabilityInput.checked;

          if (isAllVsAllChecked && orbitTypeInput.value !== RPOType.GEO) {
            // Deselect the all vs all checkbox
            rpoAvailabilityInput.checked = false;
            rpoAvailabilityInput.dispatchEvent(new Event('change'));
          }
        });

        getEl('rpo-ava')!.addEventListener('change', () => {
          const isAllVsAllChecked = (<HTMLInputElement>getEl('rpo-ava')).checked;
          const orbitTypeInput = <HTMLSelectElement>getEl('rpo-orbit-type');

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
    });
  }

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.id,
      cb: (obj: BaseObject) => {
        if (this.isMenuButtonActive && obj?.isSatellite() && (obj as DetailedSatellite).sccNum !== (<HTMLInputElement>getEl('scc')).value) {
          this.updateSccNumInMenu_();
        }
      },
    });
  }

  bottomIconCallback = (): void => {
    this.updateSccNumInMenu_();
  };

  downloadIconCb = () => {

    if (this.RPOs.length === 0) {
      keepTrackApi.getUiManager().toast('No RPOs to download!', ToastMsgType.caution, true);

      return;
    }

    const csvData = this.convertRPOsToCSV(this.RPOs);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);

    let name: string;

    if ((<HTMLInputElement>getEl('rpo-ava')).checked) {
      name = `All-vs-All-${(<HTMLInputElement>getEl('rpo-orbit-type')).value}`;
    } else {
      name = (<HTMLInputElement>getEl('scc')).value;
    }

    // Set the download attribute with a dynamically generated filename
    link.download = `${new Date().toISOString().slice(0, 19)}-RPOs-${name}.csv`;

    // Simulate a click on the link to trigger the download
    link.click();
  };

  private convertRPOsToCSV(rpoArray: RPO[]) {
    // Create the header of the CSV
    const headers = [
      't_id', 't_name', 'c_id', 'c_name', 'date',
      'dr[km]', 'dt[km]', 'dn[km]',
      'dvr[km/s]', 'dvt[km/s]', 'dvn[km/s]',
      'rel_dist[km]', 'rel_vel[km/s]',
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

  private findRPOSubmit() {

    const isAvaChecked = (<HTMLInputElement>getEl('rpo-ava')).checked;

    const maxDis = parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('maxDis')).value) as Kilometers;
    const maxVel = parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('maxVel')).value) as KilometersPerSecond;
    const duration = parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('duration')).value) * 60 ** 2 as Seconds;
    const type = (<HTMLInputElement>getEl('rpo-orbit-type')).value as RPOType;
    let RPOs: RPO[] = [];

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
      const primarySatSccNum = (<HTMLInputElement>getEl('scc')).value;
      const satelliteId = this.catalogManagerInstance.sccNum2Id(primarySatSccNum);

      if (!satelliteId) {
        keepTrackApi.getUiManager().toast(`Satellite with SCC# ${primarySatSccNum} not found`, ToastMsgType.caution, true);

        return [];
      }

      const primarySatId = satelliteId.toString();
      const sats = this.findSatsById_(primarySatId, type, duration);

      RPOs = this.findRPOs_(sats, maxDis, maxVel, duration, isAvaChecked);
    }

    if (RPOs.length === 0) {
      keepTrackApi.getUiManager().toast('No RPOs found!', ToastMsgType.caution, true);
    }

    return RPOs;
  }

  private onSubmit_(e: MouseEvent) {
    e.preventDefault();

    showLoading(() => {
      this.RPOs = this.findRPOSubmit();
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

  private findRPOs_(sats: DetailedSatellite[], maxDis: number, maxVel: number, duration: Seconds, isAvaChecked: boolean, satPairs?: number[][]) {

    const RPOs: RPO[] = [];
    const nowDate = keepTrackApi.getTimeManager().getOffsetTimeObj(0);

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

  private findSatsById_(primarySatID: string, type: string, duration: Seconds): DetailedSatellite[] {
    const allSats = this.getFilteredSatellites();
    const primarySat = keepTrackApi.getCatalogManager().getSat(parseInt(primarySatID))!;

    let sats: DetailedSatellite[] = [];

    if (type === RPOType.GEO) {
      const lla = primarySat.lla();

      sats = allSats
        .filter((sat) => sat.tle1 &&
          sat.period > 23 * 60 &&
          /*
           * assuming max drift rate to be 3deg longitude/day then take large enough lon. window to capture
           * all possible "fly-by" RPOs depends on length of search
           */
          (180 - Math.abs(Math.abs(lla.lon - sat.lla().lon) - 180)) < 3 * duration / (24 * 60 ** 2) &&
          sat.id.toString() !== primarySatID,
        );
    } else if (type === RPOType.LEO) {
      sats = allSats
        .filter((sat) => sat.tle1 &&
          (sat.perigee > primarySat.apogee || primarySat.perigee > sat.apogee) &&
          (180 - Math.abs(Math.abs(primarySat.inclination - sat.inclination) - 180)) < 5 &&
          (360 - Math.abs(Math.abs(primarySat.rightAscension - sat.rightAscension) - 360)) < 5 &&
          sat.id.toString() !== primarySatID,
        );
    } else {
      errorManagerInstance.error(new Error('Unknown orbit type!'), 'RPOCalculator');
    }

    sats.unshift(primarySat);

    return sats;
  }

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

  private findSatsAvAGeo_(lon: Degrees): DetailedSatellite[] {
    const allSats = this.getFilteredSatellites();

    const sats = allSats
      .filter((sat) => sat.tle1 &&
        sat.period > 23 * 60 &&
        (180 - Math.abs(Math.abs(lon - sat.lla().lon) - 180)) < 1,
      );

    return sats;
  }

  private getFilteredSatellites() {
    let allSats = keepTrackApi.getCatalogManager().getSats();
    const isPayloadOnlyChecked = (<HTMLInputElement>getEl('rpo-payload-only')).checked;
    const isVimpelChecked = (<HTMLInputElement>getEl('rpo-no-vimpel')).checked;

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

  private populateTable_(RPOs: RPO[]) {

    const tbl = <HTMLTableElement>getEl('rpos-table'); // Identify the table to update

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
    for (const rpo of RPOs) {
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

      row.addEventListener('click', () => this.onRpoEventClicked_(rpo));
    }

    if (RPOs.length === 0) {
      const tr = tbl.insertRow();
      const td = tr.insertCell();

      td.colSpan = 4;
      td.appendChild(document.createTextNode('No RPOs found'));
    }
  }

  private onRpoEventClicked_(rpo: RPO) {
    this.timeManagerInstance.changeStaticOffset(new Date(rpo.date).getTime() - new Date().getTime());

    // Set the secondary first so that the primary shows secondary info in the sat-info-box
    this.selectSatManagerInstance.setSecondarySat(rpo.sat2Id);
    this.selectSatManagerInstance.selectSat(rpo.sat1Id);

    const uiManagerInstance = keepTrackApi.getUiManager();

    if ((this.selectSatManagerInstance.primarySatObj as DetailedSatellite).perigee > 6000) {
      uiManagerInstance.toast('Orbits displayed in ECF', ToastMsgType.normal);
      settingsManager.isOrbitCruncherInEcf = true;
    } else {
      uiManagerInstance.toast('Orbits displayed in ECI', ToastMsgType.standby);
      settingsManager.isOrbitCruncherInEcf = false;
    }
    SettingsMenuPlugin.syncOnLoad();

    uiManagerInstance.doSearch(`${rpo.sat1SccNum},${rpo.sat2SccNum}`);

    this.closeSecondaryMenu();
    this.closeSideMenu();
  }

  private updateSccNumInMenu_() {
    const satellite = keepTrackApi.getPlugin(SelectSatManager)!.getSelectedSat() as DetailedSatellite;

    if (!satellite?.isSatellite()) {
      return;
    }

    // If satellites is not in GEO belt then treat it like LEO
    if ((satellite.period < 23 * 60 || satellite.period > 25 * 60) && satellite.inclination > 10) {
      (<HTMLInputElement>getEl('rpo-orbit-type')).value = RPOType.LEO;
      (<HTMLInputElement>getEl('maxDis')).value = '5000';
    } else {
      (<HTMLInputElement>getEl('rpo-orbit-type')).value = RPOType.GEO;
      (<HTMLInputElement>getEl('maxDis')).value = '100';
    }
    (<HTMLInputElement>getEl('rpo-orbit-type')).dispatchEvent(new Event('change'));


    // Handle Vimpel satellites
    if (satellite.source === CatalogSource.VIMPEL) {
      (<HTMLInputElement>getEl('scc')).value = 'Vimpel Satellites are not supported';

      return;
    }

    // Handle other satellites
    (<HTMLInputElement>getEl('scc')).value = satellite.sccNum;
  }

  getRIC(pos1: EciVec3, vel1: EciVec3, pos2: EciVec3, vel2: EciVec3) {

    const sat1 = { position: pos1, velocity: vel1 };
    const sat2 = { position: pos2, velocity: vel2 };

    const ric = CoordinateTransforms.sat2ric(sat1, sat2);

    return ric;
  }

  findClosestApproach(sat1: DetailedSatellite, sat2: DetailedSatellite, start: Date, duration: Seconds): RPO {

    let minDist = Infinity;
    let approachDate = new Date();

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
        let m = SatMath.calculateTimeVariables(now, sat1.satrec).m as number;

        sat1State = Sgp4.propagate(sat1.satrec, m);

        m = SatMath.calculateTimeVariables(now, sat2.satrec).m as number;
        sat2State = Sgp4.propagate(sat2.satrec, m);

        pos1 = <EciVec3>sat1State.position;
        pos2 = <EciVec3>sat2State.position;

        /*
         * var relPos = subtract(pos2, pos1);
         * var currentDist = norm(relPos) as Kilometers;
         */
        currentDist = SatMath.distance(pos2, pos1);

      } catch (e) {
        errorManagerInstance.log(e);
      }

      if (currentDist < minDist) {
        minDist = currentDist;
        approachDate = now;
      }
    }

    start = new Date(approachDate.getTime() - shortestPeriod * 1000);
    duration = 2 * shortestPeriod as Seconds;

    for (let t = 0; t < duration; t += littleStep) {

      const now = new Date(start.getTime() + t * 1000);

      try {
        let m = SatMath.calculateTimeVariables(now, sat1.satrec).m as number;

        sat1State = Sgp4.propagate(sat1.satrec, m);

        m = SatMath.calculateTimeVariables(now, sat2.satrec).m as number;
        sat2State = Sgp4.propagate(sat2.satrec, m);

        pos1 = <EciVec3>sat1State.position;
        pos2 = <EciVec3>sat2State.position;

        /*
         * var relPos = subtract(pos2, pos1);
         * var currentDist = norm(relPos) as  Kilometers;
         */
        currentDist = SatMath.distance(pos2, pos1);

      } catch (e) {
        errorManagerInstance.log(e);
      }

      if (currentDist < minDist) {
        minDist = currentDist;
        approachDate = now;
      }
    }

    start = new Date(approachDate.getTime() - shortestPeriod / 4 * 1000);
    duration = shortestPeriod / 2 as Seconds;

    let ric = {
      position: vec3.fromValues(0, 0, 0),
      velocity: vec3.fromValues(0, 0, 0),
    };

    let relVelNorm = 0 as KilometersPerSecond;

    for (let t = 0; t < duration; t += veryLittleStep) {

      const now = new Date(start.getTime() + t * 1000);

      let m = SatMath.calculateTimeVariables(now, sat1.satrec).m;

      sat1State = Sgp4.propagate(sat1.satrec, m as number);

      m = SatMath.calculateTimeVariables(now, sat2.satrec).m;
      sat2State = Sgp4.propagate(sat2.satrec, m as number);

      pos1 = <EciVec3>sat1State.position;
      pos2 = <EciVec3>sat2State.position;

      /*
       * var relPos = subtract(pos2, pos1);
       * var currentDist = norm(relPos) as Kilometers;
       */
      currentDist = SatMath.distance(pos2, pos1);


      if (currentDist < minDist) {
        minDist = currentDist;
        approachDate = now;

        const vel1 = <EciVec3>sat1State.velocity;
        const vel2 = <EciVec3>sat2State.velocity;

        /*
         * var minRelVel = subtract(vel2, vel1);
         * relVelNorm = norm(minRelVel) as KilometersPerSecond;
         */
        relVelNorm = SatMath.velocity(vel2, vel1);

        ric = this.getRIC(pos1, vel1, pos2, vel2);

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

    const rpo: RPO = {
      sat1Id: sat1.id,
      sat2Id: sat2.id,
      sat1SccNum: sat1Num,
      sat2SccNum: sat2Num,
      sat1Name: sat1.name,
      sat2Name: sat2.name,
      ric,
      dist: minDist,
      vel: relVelNorm,
      date: approachDate,
    };

    return rpo;
  }
}


/*
 * function subtract(vec1: EciVec3, vec2: EciVec3): EciVec3 {
 *     const x = vec1.x - vec2.x as Kilometers;
 *     const y = vec1.y - vec2.y as Kilometers;
 *     const z = vec1.z - vec2.z as Kilometers;
 *     const ret : EciVec3 = { x, y, z };
 *     return ret
 * }
 */

/*
 * function norm(vec: EciVec3): Kilometers | KilometersPerSecond {
 *     return Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2) as Kilometers
 * }
 */
