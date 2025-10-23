import { mat4 } from 'gl-matrix';
import { Earth as EarthOotk, EpochUTC, Seconds } from '@ootk/src/main';

export enum ReferenceFrame {
  J2000 = 'J2000',
  TEME = 'TEME',
}

export const getJ200ToTemeMatrix = (date: Date): mat4 => {
  const epoch = new EpochUTC(date.getTime() / 1000 as Seconds);
  const p = EarthOotk.precession(epoch);
  const n = EarthOotk.nutation(epoch);
  const eps = n.mEps + n.dEps;

  // Precession rotation matrix (Z-Y-Z Euler angles)
  const cz = Math.cos(p.zeta);
  const sz = Math.sin(p.zeta);
  const ct = Math.cos(p.theta);
  const st = Math.sin(p.theta);
  const cZ = Math.cos(p.zed);
  const sZ = Math.sin(p.zed);

  const precessionMatrix = mat4.fromValues(
    cz * ct * cZ - sz * sZ, cz * ct * sZ + sz * cZ, cz * st, 0,
    -sz * ct * cZ - cz * sZ, -sz * ct * sZ + cz * cZ, -sz * st, 0,
    -st * cZ, -st * sZ, ct, 0,
    0, 0, 0, 1,
  );

  // Nutation rotation matrix
  const ce = Math.cos(eps);
  const se = Math.sin(eps);
  const cme = Math.cos(n.mEps);
  const sme = Math.sin(n.mEps);
  const cdp = Math.cos(n.dPsi);
  const sdp = Math.sin(n.dPsi);

  const nutationMatrix = mat4.fromValues(
    cdp, -sdp * cme, -sdp * sme, 0,
    sdp * ce, cdp * cme * ce + sme * se, cdp * sme * ce - cme * se, 0,
    sdp * se, cdp * cme * se - sme * ce, cdp * sme * se + cme * ce, 0,
    0, 0, 0, 1,
  );

  // Multiply to get J2000 to TEME, then invert for TEME to J2000
  const j2000toTEME = mat4.create();

  mat4.multiply(j2000toTEME, nutationMatrix, precessionMatrix);

  return j2000toTEME;
};

export const getTemeToJ2000Matrix = (date: Date): mat4 => {
  const j2000toTEME = getJ200ToTemeMatrix(date);

  // Invert to get TEME to J2000
  const temeToJ2000Matrix = mat4.create();

  mat4.invert(temeToJ2000Matrix, j2000toTEME);

  return temeToJ2000Matrix;
};
