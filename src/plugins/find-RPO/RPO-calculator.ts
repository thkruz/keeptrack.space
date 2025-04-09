import { KeepTrackApiEvents, MenuMode } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';

import { errorManagerInstance } from '@app/singletons/errorManager';
import { CoordinateTransforms } from '@app/static/coordinate-transforms';
import { SatMath, StringifiedNumber } from '@app/static/sat-math';
import rpo from '@public/img/icons/rpo.png';
import { vec3 } from 'gl-matrix';
import { BaseObject, CatalogSource, DetailedSatellite, EciVec3, Kilometers, KilometersPerSecond, Seconds, Sgp4, StateVectorSgp4 } from 'ootk';
import { KeepTrackPlugin, SideMenuSettingsOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';


interface RPO {
    sat1Id: string,
    sat1Name?: string,
    sat2Id: string,
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



    RPOs: RPO[] = [];
    bottomIconImg = rpo;
    secondaryMenuImg = 'table_chart'

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
        <select id="dropdown" type="text" >
            <option value="GEO" selected>GEO</option>
            <option value="LEO">LEO</option>
        </select>
        <label for="orbitType">Orbit Type</label>
    </div>

    <div class="input-field col s12">
        <div class="switch row">
            <label data-position="top" data-delay="50" data-tooltip="Search for RPOs between all RSOs">
                <input id="AVA" type="checkbox"/>
                <span class="lever"></span>
                All vs All
            </label>
        </div>
    </div>

    <div class="center-align row">
        <button id="submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Find RPOs &#9658;</button>
    </div>
    </form>
    `;

    sideMenuSettingsHtml: string = keepTrackApi.html`
        <div class="row" style="margin: 0 10px;">
         <h5 class="center-align">RPO</h5>
          <table id="rpos-table" class="center-align striped-light centered"></table>
        </div>`;
    sideMenuSettingsOptions: SideMenuSettingsOptions = {
        width: 600,
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
                    this.onSubmit(e);
                });

                getEl('AVA')!.addEventListener('change', () => {
                    const AvA = (<HTMLInputElement>getEl('AVA')).checked;
                    if (AvA) {
                        (<HTMLInputElement>getEl('dropdown')).value = 'GEO';
                        (<HTMLInputElement>getEl('dropdown')).disabled = true;
                    }
                    else {
                        (<HTMLInputElement>getEl('dropdown')).disabled = false;
                    }

                })
            },
        });
    }

    addJs(): void {
        super.addJs();

        keepTrackApi.register({
            event: KeepTrackApiEvents.selectSatData,
            cbName: this.id,
            cb: (obj: BaseObject) => {
                if (!obj) {
                    if (this.isMenuButtonActive) {
                        this.closeSideMenu();
                    }
                    //   this.setBottomIconToDisabled();
                } else if (this.isMenuButtonActive && obj.isSatellite() && (obj as DetailedSatellite).sccNum !== (<HTMLInputElement>getEl('scc')).value) {
                    this.updateSccNumInMenu_()
                }
            },
        });
    };

    bottomIconCallback = (): void => {
        this.updateSccNumInMenu_();
    };

    downloadIconCb = () => {

        if (this.RPOs.length == 0) { return; }

        const csvData = this.convertRPOsToCSV(this.RPOs);

        const blob = new Blob([csvData], { type: 'text/csv' });

        const link = document.createElement('a');

        link.href = URL.createObjectURL(blob);

        if ((<HTMLInputElement>getEl('AVA')).checked) {
            var name = `All-vs-All-${(<HTMLInputElement>getEl('dropdown')).value}`
        }
        else {
            var name = (<HTMLInputElement>getEl('scc')).value
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
            'rel_dist[km]', 'rel_vel[km/s]'
        ];

        // Initialize CSV content with headers
        const csvRows: string[] = [];
        csvRows.push(headers.join(','));

        // Iterate over each RPO instance in the array
        rpoArray.forEach(rpo => {
            // Prepare a row with the RPO's values
            const row = [
                rpo.sat1Id,
                rpo.sat1Name,
                rpo.sat2Id,
                rpo.sat2Name,
                rpo.date.toISOString(), // Convert the date to a string
                rpo.ric.position[0],
                rpo.ric.position[1],
                rpo.ric.position[2],
                rpo.ric.velocity[0],
                rpo.ric.velocity[1],
                rpo.ric.velocity[2],
                rpo.dist,
                rpo.vel
            ];
            csvRows.push(row.join(','));
        });

        // Join all rows and return as a single CSV string
        const csvContent = csvRows.join('\n');

        return csvContent
    }

    private findRPOSubmit() {

        const AvA = (<HTMLInputElement>getEl('AVA')).checked;
        const maxDis = parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('maxDis')).value) as Kilometers;
        const maxVel = parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('maxVel')).value) as KilometersPerSecond;
        const duration = parseFloat(<StringifiedNumber>(<HTMLInputElement>getEl('duration')).value) * 60 ** 2 as Seconds;
        const type = (<HTMLInputElement>getEl('dropdown')).value;

        if (AvA) {
            var satPairs: number[][] = [];
            var RPOs: RPO[] = [];

            if (type == 'GEO') {
                for (let lon = -180; lon <= 180; lon += 1.5) {
                    const sats = this.findSats([lon], type);
                    sats.forEach((sat1, i) => {
                        sats.slice(i + 1).forEach((sat2) => { satPairs.push([sat1.id, sat2.id]) })
                    })
                    var rpos = this.findRPOs(sats, maxDis, maxVel, duration as Seconds, AvA, satPairs);

                    RPOs = RPOs.concat(rpos);
                }
            }
            else if (type == 'LEO') {
                for (let i = 0; i <= 180; i += 5) {
                    for (let o = 0; o <= 360; o += 5) {
                        const sats = this.findSats([i, o], type);
                        if (sats.length == 0) { continue; }
                        sats.forEach((sat1, i) => {
                            sats.slice(i + 1).forEach((sat2) => { satPairs.push([sat1.id, sat2.id]) })
                        })

                        var rpos = this.findRPOs(sats, maxDis, maxVel, duration as Seconds, AvA, satPairs);

                        RPOs = RPOs.concat(rpos);
                    }
                }
            }

        }
        else {
            const primarySatNoradID = (<HTMLInputElement>getEl('scc')).value;
            const primarySatID = this.catalogManagerInstance.sccNum2Id(primarySatNoradID)!.toString();

            const sats = this.findSats(primarySatID, type, duration);

            var RPOs = this.findRPOs(sats, maxDis, maxVel, duration, AvA);
        }

        if (RPOs.length == 0) { errorManagerInstance.info('No RPOs Found'); }
        else { errorManagerInstance.info(`${RPOs.length} RPOs Found`) }

        return RPOs;
    }

    private async onSubmit(e: MouseEvent) {
        await this.asyncFunctionWrapper(e);
        // This is to try to make the findRPOs run asynchronously so that 
        // the UI does not freeze during its execution which can take some timetime
    }

    private async asyncFunctionWrapper(e: MouseEvent) {
        this.RPOs = this.findRPOSubmit();
        // Sort RPOs
        this.RPOs = [...this.RPOs].sort((a, b) => a.dist - b.dist);
        e.preventDefault();

        this.populateTable_(this.RPOs);

        if (this.RPOs.length > 0) {
            this.openSettingsMenu();
            getEl(`${this.sideMenuElementName}-settings-btn`)!.style.color = 'var(--statusDarkNormal)';
        }
    }

    private findRPOs(sats: DetailedSatellite[], maxDis: number, maxVel: number, duration: Seconds, AvA: boolean, satPairs?: number[][]) {

        let RPOs: RPO[] = [];
        const nowDate = keepTrackApi.getTimeManager().getOffsetTimeObj(0);

        if (AvA && satPairs) {

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

                        const res = findClosestApproach(primarySat, secondarySat, nowDate, duration);

                        if (res.dist <= maxDis && res.vel <= maxVel) {
                            RPOs.push(res)
                        }
                    }
                })
            })
        }
        else {

            const primarySat = sats[0]

            sats.slice(1).forEach((secondarySat) => {

                const res = findClosestApproach(primarySat, secondarySat, nowDate, duration)

                if (res.dist <= maxDis && res.vel <= maxVel) {
                    RPOs.push(res)
                }
            })
        }
        return RPOs;
    }

    private findSats(primarySatID: string | number[], type: string, duration?: Seconds): DetailedSatellite[] {

        const AllSats = keepTrackApi.getCatalogManager().getSats();

        var sats: DetailedSatellite[] = [];

        if (typeof primarySatID == 'string' && duration) {
            var primarySat = keepTrackApi.getCatalogManager().getSat(parseInt(primarySatID))!
            switch (type) {
                case 'GEO':
                    var lla = primarySat.lla();
                    sats = AllSats
                        .filter((sat) => sat.tle1
                            && sat.period > 23 * 60
                            // assuming max drift rate to be 3deg longitude/day then take large enough lon. window to capture
                            // all possible "fly-by" RPOs depends on length of search
                            && (180 - Math.abs(Math.abs(lla.lon - sat.lla().lon) - 180)) < 3 * duration / (24 * 60 ** 2)
                            && sat.id.toString() != primarySatID
                        );
                    break;
                case 'LEO':
                    sats = AllSats
                        .filter((sat) => sat.tle1
                            && (sat.perigee > primarySat.apogee || primarySat.perigee > sat.apogee)
                            && (180 - Math.abs(Math.abs(primarySat.inclination - sat.inclination) - 180)) < 5
                            && (360 - Math.abs(Math.abs(primarySat.rightAscension - sat.rightAscension) - 360)) < 5
                            && sat.id.toString() != primarySatID
                        );
                    break
                default:
            }

            sats.unshift(primarySat)
            console.log(`Searching for RPOs with ${sats.length.toString()} sats`)
        }
        else if (Array.isArray(primarySatID)) {
            switch (type) {
                case 'GEO':
                    var lon = primarySatID[0];
                    var sats = AllSats
                        .filter((sat) => sat.tle1
                            && sat.period > 23 * 60
                            && (180 - Math.abs(Math.abs(lon - sat.lla().lon) - 180)) < 1
                        );
                    break;
                case 'LEO':
                    const inc = primarySatID[0];
                    const raan = primarySatID[1];
                    var sats = AllSats
                        .filter((sat) => sat.tle1
                            && sat.period < 3 * 60
                            && (180 - Math.abs(Math.abs(inc - sat.inclination) - 180)) < 5
                            && (360 - Math.abs(Math.abs(raan - sat.rightAscension) - 360)) < 5
                        );
                    break
                default:
            }
        }

        return sats
    }

    private populateTable_(RPOs: RPO[]) {

        const tbl = <HTMLTableElement>getEl('rpos-table'); // Identify the table to update

        tbl.innerHTML = ''; // Clear the table from old object data
        let tr = tbl.insertRow();

        let tdS1 = tr.insertCell();
        tdS1.appendChild(document.createTextNode('Target'));
        tdS1.setAttribute('style', 'text-decoration: underline');

        let tdS2 = tr.insertCell();
        tdS2.appendChild(document.createTextNode('Chaser'));
        tdS2.setAttribute('style', 'text-decoration: underline');

        let tdDis = tr.insertCell();
        tdDis.appendChild(document.createTextNode('Rel. Distance [km]'));
        tdDis.setAttribute('style', 'text-decoration: underline');

        let tdRV = tr.insertCell();
        tdRV.appendChild(document.createTextNode('Rel. Velocity [km/s]'));
        tdRV.setAttribute('style', 'text-decoration: underline');

        let tdD = tr.insertCell();
        tdD.appendChild(document.createTextNode('Date'));
        tdD.setAttribute('style', 'text-decoration: underline');

        for (const RPO of RPOs) {
            tr = tbl.insertRow();
            tr.setAttribute('class', 'link');
            tdS1 = tr.insertCell();
            tdS1.appendChild(document.createTextNode(RPO.sat1Id));
            tdS2 = tr.insertCell();
            tdS2.appendChild(document.createTextNode(RPO.sat2Id));
            tdDis = tr.insertCell();
            tdDis.appendChild(document.createTextNode(RPO.dist.toFixed(2)));
            tdRV = tr.insertCell();
            tdRV.appendChild(document.createTextNode(RPO.vel.toFixed(3)));
            tdD = tr.insertCell();
            tdD.appendChild(document.createTextNode(RPO.date.toISOString().slice(0, 19)));

            tr.addEventListener('click', () => {
                this.timeManagerInstance.changeStaticOffset(new Date(RPO.date).getTime() - new Date().getTime());

                // Handle VIMPEL
                const isVimpel = RPO.sat1Id.startsWith('JSC') || RPO.sat2Id.startsWith('JSC');

                if (!isVimpel) {
                    const id1 = this.catalogManagerInstance.sccNum2Id(parseInt(RPO.sat1Id))
                    const id2 = this.catalogManagerInstance.sccNum2Id(parseInt(RPO.sat2Id))
                    this.selectSatManagerInstance.selectSat(id1 as number)
                    this.selectSatManagerInstance.setSecondarySat(id2 as number)
                    const uiManagerInstance = keepTrackApi.getUiManager();
                    uiManagerInstance.doSearch(`${RPO.sat1Id},${RPO.sat2Id}`);
                }

            });
        }

        if (RPOs.length === 0) {
            const tr = tbl.insertRow();
            const td = tr.insertCell();

            td.colSpan = 4;
            td.appendChild(document.createTextNode(`No RPOs found`));
        }
    }

    private updateSccNumInMenu_() {

        const satellite = keepTrackApi.getPlugin(SelectSatManager)!.getSelectedSat() as DetailedSatellite;

        if (!satellite?.isSatellite()) {
            return;
        }
        (<HTMLInputElement>getEl('scc')).value = satellite.sccNum;
    }
}

function getRIC(pos1: EciVec3, vel1: EciVec3, pos2: EciVec3, vel2: EciVec3) {

    const sat1 = { position: pos1, velocity: vel1 };
    const sat2 = { position: pos2, velocity: vel2 };

    const ric = CoordinateTransforms.sat2ric(sat1, sat2);

    return ric;
}

// function subtract(vec1: EciVec3, vec2: EciVec3): EciVec3 {
//     const x = vec1.x - vec2.x as Kilometers;
//     const y = vec1.y - vec2.y as Kilometers;
//     const z = vec1.z - vec2.z as Kilometers;
//     const ret : EciVec3 = { x, y, z };
//     return ret
// }

// function norm(vec: EciVec3): Kilometers | KilometersPerSecond {
//     return Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2) as Kilometers
// }

export function findClosestApproach(sat1: DetailedSatellite, sat2: DetailedSatellite, start: Date, duration: Seconds): RPO {

    let minDist = Infinity;

    let approachDate = new Date()

    var shortestPeriod = ((sat1.period > sat2.period) ? sat2.period : sat1.period) * 60;

    // large steps defined to be at least 2 points per orbit
    var bigStep = shortestPeriod / 2
    // small steps defined to be at least 10 points per orbit
    var littleStep = shortestPeriod / 10;
    // very small steps defined to be at least 10 points per orbit
    var veryLittleStep = shortestPeriod / 100;

    var currentDist = Infinity as Kilometers;

    for (let t = 0; t < duration; t += bigStep) {

        let now = new Date(start.getTime() + t * 1000)

        try {
            let m = SatMath.calculateTimeVariables(now, sat1.satrec).m as number;
            var sat1State = Sgp4.propagate(sat1.satrec, m);

            m = SatMath.calculateTimeVariables(now, sat2.satrec).m as number;
            var sat2State = Sgp4.propagate(sat2.satrec, m);

            var pos1 = <EciVec3>sat1State.position;
            var pos2 = <EciVec3>sat2State.position;

            // var relPos = subtract(pos2, pos1);
            // var currentDist = norm(relPos) as Kilometers;
            var currentDist = SatMath.distance(pos2, pos1);

        }
        catch (e) {
            console.log(e)
        }

        if (currentDist < minDist) {
            minDist = currentDist;
            approachDate = now;
        }
    }

    start = new Date(approachDate.getTime() - shortestPeriod * 1000)
    duration = 2 * shortestPeriod as Seconds

    for (let t = 0; t < duration; t += littleStep) {

        let now = new Date(start.getTime() + t * 1000)

        try {
            let m = SatMath.calculateTimeVariables(now, sat1.satrec).m as number;
            var sat1State = Sgp4.propagate(sat1.satrec, m);

            m = SatMath.calculateTimeVariables(now, sat2.satrec).m as number;
            var sat2State = Sgp4.propagate(sat2.satrec, m);

            var pos1 = <EciVec3>sat1State.position;
            var pos2 = <EciVec3>sat2State.position;

            // var relPos = subtract(pos2, pos1);
            // var currentDist = norm(relPos) as  Kilometers;
            var currentDist = SatMath.distance(pos2, pos1);

        }
        catch (e) {
            console.log(e)
        }

        if (currentDist < minDist) {
            minDist = currentDist;
            approachDate = now;
        }
    }

    start = new Date(approachDate.getTime() - shortestPeriod / 4 * 1000)
    duration = shortestPeriod / 2 as Seconds

    var sat1State: StateVectorSgp4;
    var sat2State: StateVectorSgp4;

    var ric = {
        position: vec3.fromValues(0, 0, 0),
        velocity: vec3.fromValues(0, 0, 0)
    };

    var relVelNorm = 0 as KilometersPerSecond;

    for (let t = 0; t < duration; t += veryLittleStep) {

        let now = new Date(start.getTime() + t * 1000)

        let m = SatMath.calculateTimeVariables(now, sat1.satrec).m;
        sat1State = Sgp4.propagate(sat1.satrec, m as number);

        m = SatMath.calculateTimeVariables(now, sat2.satrec).m;
        sat2State = Sgp4.propagate(sat2.satrec, m as number);

        var pos1 = <EciVec3>sat1State.position;
        var pos2 = <EciVec3>sat2State.position;

        // var relPos = subtract(pos2, pos1);
        // var currentDist = norm(relPos) as Kilometers;
        var currentDist = SatMath.distance(pos2, pos1);


        if (currentDist < minDist) {
            minDist = currentDist;
            approachDate = now;

            const vel1 = <EciVec3>sat1State.velocity;
            const vel2 = <EciVec3>sat2State.velocity;

            // var minRelVel = subtract(vel2, vel1);
            // relVelNorm = norm(minRelVel) as KilometersPerSecond;
            relVelNorm = SatMath.velocity(vel2, vel1);

            ric = getRIC(pos1, vel1, pos2, vel2)

        }
    }
    // Use VIMPEL number if needed.
    if (sat1.source == CatalogSource.VIMPEL) {
        var sat1Num = `JSC${sat1.altId}`;
    } else {
        var sat1Num = sat1.sccNum;
    }
    if (sat2.source == CatalogSource.VIMPEL) {
        var sat2Num = `JSC${sat2.altId}`;
    } else {
        var sat2Num = sat2.sccNum;
    }

    const rpo: RPO = {
        sat1Id: sat1Num,
        sat2Id: sat2Num,
        sat1Name: sat1.name,
        sat2Name: sat2.name,
        ric: ric,
        dist: minDist,
        vel: relVelNorm,
        date: approachDate
    };

    return rpo
}