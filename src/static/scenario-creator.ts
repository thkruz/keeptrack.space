import * as Ootk from 'ootk';
import { SatObject } from "../interfaces";
import { dateFormat } from "../lib/dateFormat";
import { DEG2RAD } from '../lib/constants';

type OgenParams = {
    name: string;
    startTime: string;
    stopTime: string;
    stride: string;
    site: string;
    tleFile: string;
};

type OgenElements = {
    satId: number;
    simId: number;
    rcs: number;
};

export abstract class ScenarioCreator {
    static createOgenFile({ name, startTime, stopTime, stride, site, tleFile }: OgenParams, elements: OgenElements[]) {
        // Start and Stop format is DD MMM YYYY HH:MM:SS.SSSSSS"
        // Validate start and stop time

        if (!name) {
            throw new Error('Name is required');
        }


        const ogenFile =
            '////////////////////////////////////////////////////////////////////////////////\n' +
            '//       UNCLASS             UNCLASS             UNCLASS             UNCLASS    \n' +
            '//       UNCLASS             UNCLASS             UNCLASS             UNCLASS    \n' +
            '////////////////////////////////////////////////////////////////////////////////\n' +
            '// Build Version : KT-SC-GEN-1.0.0\n' +
            '// File Date     : ' + dateFormat(new Date(), 'dd-mmm-yyyy HH:MM:ss', true) + '\n' +
            '\n' +
            'OrbitalDefinition {\n' +
            `  OrbitalDefinition.name           = "${dateFormat(new Date(), 'yyyymmdd', true)}_${name}";\n` +
            `  OrbitalDefinition.startTime      = "${startTime}";\n` +
            `  OrbitalDefinition.stopTime       = "${stopTime}";\n` +
            `  OrbitalDefinition.stride         = "${stride}";\n` +
            `  OrbitalDefinition.site           = "${site}";\n` +
            `  OrbitalDefinition.tleFile        = "${tleFile}";\n` +
            '\n' +
            elements.map((element) => '' +
                '    OrbitalElement {\n' +
                `      OrbitalElement.satId               = ${element.satId};\n` +
                `      OrbitalElement.simId               = ${element.simId};\n` +
                `      OrbitalElement.aer                 = "obj${element.simId}.aer";\n` +
                `      OrbitalElement.rcsModel            = NON_FLUCTUATING;\n` +
                `      OrbitalElement.decorrelationTime   = 0.000000;\n` +
                `      OrbitalElement.rcsAmplitude        = ${element.rcs.toFixed(6)};\n` +
                `      OrbitalElement.rcsPhase            = 0.000000;\n` +
                `      OrbitalElement.timeOffOes          = 0.000000;\n` +
                `    } // End OrbitalElement\n`).join('\n\n') +
            '} // End OrbitalDefinition\n' +
            '\n' +
            '////////////////////////////////////////////////////////////////////////////////\n' +
            '//       UNCLASS             UNCLASS             UNCLASS             UNCLASS    \n' +
            '//       UNCLASS             UNCLASS             UNCLASS             UNCLASS    \n' +
            '////////////////////////////////////////////////////////////////////////////////';
        return ogenFile;
    }

    static createAerFile(sat: SatObject, sensorName: string, startTime: Date, simLength: number, stride: number) {
        const sensor = ScenarioCreator.getSensor(sensorName);
        let tle1 = sat.TLE1;
        let tle2 = sat.TLE2;

        const sat_ = new Ootk.Sat({ tle1, tle2, }, {});

        if (sat_.satNum < 0 || sat_.satNum > 99999) {
            return '';
        }

        let isEverInFOV = false;
        const aerList = [];
        const eciList = [];
        for (let i = 0; i < simLength; i = i + stride) {
            const simTime = new Date(startTime.getTime() + i * 55);
            const isInFov = sensor.isSatInFov(sat_, simTime);
            isEverInFOV = isInFov ? true : isEverInFOV;
            if (isInFov) {
                const eci = sat_.getEci(simTime);
                const eciLast = eciList.length > 0 ? eciList[eciList.length - 1] : sat_.getEci(new Date(startTime.getTime() + i * 55 - (55 * stride)));
                const aer = sat_.getRae(sensor, simTime);
                const relSpeed = Math.sqrt(Math.pow(eci.x - eciLast.x, 2) + Math.pow(eci.y - eciLast.y, 2) + Math.pow(eci.z - eciLast.z, 2)) / (55 * stride) * 1000;
                const lastRange = aerList.length > 0 ? aerList[aerList.length - 1].range : sat_.getRae(sensor, new Date(startTime.getTime() + i * 55 - (55 * stride))).rng;
                const rangeRate = (aer.rng - lastRange) / (55 * stride) * 1000;
                // console.log('az: ', (-aer.az).toFixed(16));
                // console.log('az: ', (-aer.az * RAD2DEG).toFixed(16));
                // console.log('el: ', aer.el.toFixed(16));
                // console.log('rng: ', aer.rng.toFixed(16));
                // console.log(simTime);
                aerList.push({
                    ri: i + 1,
                    azimuth: (aer.az).toFixed(16),
                    elevation: (aer.el).toFixed(16),
                    range: aer.rng.toFixed(16),
                    rangeRate: rangeRate.toFixed(16),
                    relSpeed: relSpeed.toFixed(16),
                });
            }
        }

        if (!isEverInFOV) return '';

        const aerFile = '' +
            'RI,Azimuth (rad),Elevation (rad),Range (km),RangeRate (km/sec),RelSpeed (km/sec)\n' +
            aerList.map((aer) => '' +
                `${aer.ri},${aer.azimuth},${aer.elevation},${aer.range},${aer.rangeRate},${aer.relSpeed}\n`).join('');

        return aerFile;
    }

    static checkIfInFov(sat: SatObject, sensor: Ootk.Sensor, startTime: Date, simLengthInSeconds: number) {
        const sat_ = new Ootk.Sat({ tle1: sat.TLE1, tle2: sat.TLE2, }, {});

        if (sat_.satNum < 0 || sat_.satNum > 99999) {
            return { az: 0, el: 0, rng: 0 } as Ootk.RaeVec3;
        }

        let isEverInFOV = false;
        let firstRae = null;
        for (let seconds = 0; seconds < simLengthInSeconds; seconds = seconds + 30) {
            if (isEverInFOV) break;
            const simTime = new Date(startTime.getTime() + seconds * 1000);
            const isInFov = sensor.isSatInFov(sat_, simTime);
            if (isInFov && !firstRae) {
                firstRae = { ...sat_.getRae(sensor, simTime), simTime };
            }
            isEverInFOV = isInFov ? true : isEverInFOV;
        }

        if (!isEverInFOV) return { az: 0, el: 0, rng: 0 } as Ootk.RaeVec3;
        return firstRae;
    }

    static getSensor(name: string): Ootk.Sensor {
        let sensor = null;
        switch (name) {
            case 'cod':
                sensor = new Ootk.Sensor(<any>{
                    name: 'cod',
                    lat: 41.754785 * DEG2RAD,
                    lon: -70.539151 * DEG2RAD,
                    alt: 0.85,
                    minAz: 347,
                    maxAz: 227,
                    minEl: 3,
                    maxEl: 85,
                    minRng: 200,
                    maxRng: 5556,
                });
                break;
            case 'ble':
                sensor = new Ootk.Sensor(<any>{
                    name: 'ble',
                    lat: 39.136064 * DEG2RAD,
                    lon: -121.351237 * DEG2RAD,
                    alt: 0.112,
                    minAz: 126,
                    maxAz: 6,
                    minEl: 3,
                    maxEl: 85,
                    minRng: 200,
                    maxRng: 5556,
                });
                break;
            case 'clr':
                sensor = new Ootk.Sensor(<any>{
                    name: 'clr',
                    lat: 64.290556 * DEG2RAD,
                    lon: -149.186944 * DEG2RAD,
                    alt: 0.175,
                    minAz: 184,
                    maxAz: 64,
                    minEl: 3,
                    maxEl: 85,
                    minRng: 200,
                    maxRng: 5556,
                });
                break;
            case 'fyl':
                sensor = new Ootk.Sensor(<any>{
                    name: 'fyl',
                    lat: 54.361758 * DEG2RAD,
                    lon: -0.670051 * DEG2RAD,
                    alt: 0.26,
                    minAz: 0,
                    maxAz: 360,
                    minEl: 3,
                    maxEl: 85,
                    minRng: 200,
                    maxRng: 5556,
                });
                break;
            case 'thl':
                sensor = new Ootk.Sensor(<any>{
                    name: 'thl',
                    lat: 76.570322 * DEG2RAD,
                    lon: -68.299211 * DEG2RAD,
                    alt: 0.392,
                    minAz: 297,
                    maxAz: 177,
                    minEl: 3,
                    maxEl: 85,
                    minRng: 200,
                    maxRng: 5556,
                });
                break;
            default:
                sensor = {
                    name: 'all',
                } as any;
                break;
        }
        return sensor;
    }
}