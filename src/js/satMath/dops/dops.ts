import { DEG2RAD, RAD2DEG } from '@app/js/lib/constants';
import { getEl } from '@app/js/lib/helpers';
import numeric from 'numeric';
import { keepTrackApi } from '../../api/keepTrackApi';
import { SatGroupCollection } from '../../api/keepTrackTypes';
import { dateFormat } from '../../lib/external/dateFormat.js';
import { calculateTimeVariables } from '../calc/calculateTimeVariables';
import { satellite } from '../satMath';
import { ecf2rae, eci2ecf } from '../transforms';

export const updateDopsTable = (lat: number, lon: number, alt: number) => {
  const { timeManager } = keepTrackApi.programs;

  try {
    let tbl = <HTMLTableElement>getEl('dops'); // Identify the table to update
    tbl.innerHTML = ''; // Clear the table from old object data

    const simulationTime = timeManager.simulationTimeObj;
    let offset = 0;

    let tr = tbl.insertRow();
    let tdT = tr.insertCell();
    tdT.appendChild(document.createTextNode('Time'));
    let tdH = tr.insertCell();
    tdH.appendChild(document.createTextNode('HDOP'));
    let tdP = tr.insertCell();
    tdP.appendChild(document.createTextNode('PDOP'));
    let tdG = tr.insertCell();
    tdG.appendChild(document.createTextNode('GDOP'));

    for (let t = 0; t < 1440; t++) {
      offset = t * 1000 * 60; // Offset in seconds (msec * 1000)
      const now = timeManager.getOffsetTimeObj(offset, simulationTime);

      let dops = satellite.getDops(lat, lon, alt, now);

      tr = tbl.insertRow();
      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(now, 'isoDateTime', true)));
      tdH = tr.insertCell();
      tdH.appendChild(document.createTextNode(dops.hdop));
      tdP = tr.insertCell();
      tdP.appendChild(document.createTextNode(dops.pdop));
      tdG = tr.insertCell();
      tdG.appendChild(document.createTextNode(dops.gdop));
    }
  } catch (error) {
    console.debug(error);
  }
};

export const getDops = (lat: number, lon: number, alt?: number, propTime?: Date) => {
  const { timeManager, groupsManager, satSet } = keepTrackApi.programs;

  if (typeof lat == 'undefined') throw new Error('Latitude is undefined');
  if (typeof lon == 'undefined') throw new Error('Longitude is undefined');

  lat = lat * DEG2RAD;
  lon = lon * DEG2RAD;
  alt ??= 0;
  groupsManager.GPSGroup ??= groupsManager.createGroup('nameRegex', /NAVSTAR/iu);
  propTime ??= timeManager.simulationTimeObj;

  const { gmst } = calculateTimeVariables(propTime);

  let inViewList = [];
  groupsManager.GPSGroup.sats.forEach((satObj: SatGroupCollection) => {
    const sat = satSet.getSat(satObj.satId);
    const lookAngles = ecf2rae({ lon: lon, lat: lat, alt: alt }, eci2ecf(sat.position, gmst));
    sat.az = lookAngles.az * RAD2DEG;
    sat.el = lookAngles.el * RAD2DEG;
    if (sat.el > settingsManager.gpsElevationMask) {
      inViewList.push(sat);
    }
  });

  return calculateDops(inViewList);
};

export const calculateDops = (satList: { az: number; el: number }[]): { pdop: string; hdop: string; gdop: string; vdop: string; tdop: string } => {
  var dops: any = {};

  let nsat = satList.length;
  if (nsat < 4) {
    dops.pdop = 50;
    dops.hdop = 50;
    dops.gdop = 50;
    dops.vdop = 50;
    dops.tdop = 50;
    return dops;
  }

  var A = <any>numeric.rep([nsat, 4], 0);
  for (var n = 1; n <= nsat; n++) {
    var cursat = satList[n - 1];

    var az = cursat.az;
    var el = cursat.el;

    const B = [
      Math.cos((el * Math.PI) / 180.0) * Math.sin((az * Math.PI) / 180.0),
      Math.cos((el * Math.PI) / 180.0) * Math.cos((az * Math.PI) / 180.0),
      Math.sin((el * Math.PI) / 180.0),
      1,
    ];
    numeric.setBlock(A, [n - 1, 0], [n - 1, 3], [B]);
  }
  var Q = <number[][]>numeric.dot(numeric.transpose(A), A);
  var Qinv = numeric.inv(Q);
  var pdop = Math.sqrt(Qinv[0][0] + Qinv[1][1] + Qinv[2][2]);
  var hdop = Math.sqrt(Qinv[0][0] + Qinv[1][1]);
  var gdop = Math.sqrt(Qinv[0][0] + Qinv[1][1] + Qinv[2][2] + Qinv[3][3]);
  var vdop = Math.sqrt(Qinv[2][2]);
  var tdop = Math.sqrt(Qinv[3][3]);
  dops.pdop = (Math.round(pdop * 100) / 100).toFixed(2);
  dops.hdop = (Math.round(hdop * 100) / 100).toFixed(2);
  dops.gdop = (Math.round(gdop * 100) / 100).toFixed(2);
  dops.vdop = (Math.round(vdop * 100) / 100).toFixed(2);
  dops.tdop = (Math.round(tdop * 100) / 100).toFixed(2);
  return dops;
};
