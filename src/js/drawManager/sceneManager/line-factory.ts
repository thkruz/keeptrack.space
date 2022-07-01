import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { LineColors, LineTypes } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { DEG2RAD, RAD2DEG } from '@app/js/lib/constants';
import { Line } from './line';

export class LineFactory {
  drawLineList: any;
  tempStar1: any;
  tempStar2: any;
  getSensorFromSensorName: any;
  getIdFromStarName: any;
  getSat: any;
  getSatPosOnly: any;
  gl: WebGL2RenderingContext;
  shader: WebGLShader;

  constructor() {
    this.getSensorFromSensorName = keepTrackApi.programs.satSet.getSensorFromSensorName;
    this.getIdFromStarName = keepTrackApi.programs.satSet.getIdFromStarName;
    this.getSat = keepTrackApi.programs.satSet.getSat;
    this.getSatPosOnly = keepTrackApi.programs.satSet.getSatPosOnly;
    this.gl = keepTrackApi.programs.drawManager.gl;
    this.shader = keepTrackApi.programs.orbitManager.shader;
    this.drawLineList = [];
  }

  drawWhenSelected(): void {
    for (let i = 0; i < this.drawLineList.length; i++) {
      if (this.drawLineList[i].isDrawWhenSelected) {
        this.drawLineList.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.drawLineList = [];
  }

  removeStars(): boolean {
    let starFound = false;
    for (let i = 0; i < this.drawLineList.length; i++) {
      if (
        (typeof this.drawLineList[i].sat !== 'undefined' && this.drawLineList[i].sat.type === SpaceObjectType.STAR) ||
        (typeof this.drawLineList[i].sat2 !== 'undefined' && this.drawLineList[i].sat2.type === SpaceObjectType.STAR)
      ) {
        this.drawLineList.splice(i, 1);
        starFound = true;
      }
    }
    return starFound;
  }

  // This is intentionally complex to reduce object creation and GC
  // Splitting it into subfunctions would not be optimal
  // prettier-ignore
  create(type: LineTypes, value: number[] | number, color?: LineColors): void { // NOSONAR
    const getSat = keepTrackApi.programs.satSet.getSat;
    let sat = null;
    let sat2 = null;

    if (typeof color == 'undefined') color = [1.0, 0, 1.0, 1.0];
    switch (color) {
      case 'r':
        color = [1.0, 0.0, 0.0, 1.0];
        break;
      case 'o':
        color = [1.0, 0.5, 0.0, 1.0];
        break;
      case 'y':
        color = [1.0, 1.0, 0.0, 1.0];
        break;
      case 'g':
        color = [0.0, 1.0, 0.0, 1.0];
        break;
      case 'b':
        color = [0.0, 0.0, 1.0, 1.0];
        break;
      case 'c':
        color = [0.0, 1.0, 1.0, 1.0];
        break;
      case 'p':
        color = [1.0, 0.0, 1.0, 1.0];
        break;
      case 'w':
        color = [1.0, 1.0, 1.0, 1.0];
        break;
      default:
        // If color not a letter than assume its been set
        if (color.length !== 4) throw new Error('Color must be a 4 element array or a valid string!');
        break;
    }
    // Center of the Earth to the Satellite
    if (type == 'sat') {
      let satForLine = getSat(<number>value);
      if (typeof satForLine.position == 'undefined') {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(satForLine);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl, this.shader),
        sat: satForLine,
        ref: [0, 0, 0],
        ref2: [satForLine.position.x, satForLine.position.y, satForLine.position.z],
        color: color,
      });
    }
    // Reference Point to Satellite
    if (type == 'sat2') {
      sat = getSat(value[0]);
      if (typeof sat.position == 'undefined') {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl, this.shader),
        sat: sat,
        ref: [value[1], value[2], value[3]],
        ref2: [sat.position.x, sat.position.y, sat.position.z],
        color: color,
      });
    }
    // Sensor to Satellite When in View of Currently Selected Sensor
    if (type == 'sat3') {
      sat = getSat(value[0]);
      sat2 = getSat(value[1]);
      if (typeof sat.position == 'undefined' || typeof sat2.position == 'undefined') {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        console.debug(sat2);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl, this.shader),
        sat: sat,
        sat2: sat2,
        ref: [sat.position.x, sat.position.y, sat.position.z],
        ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
        color: color,
        isOnlyInFOV: true,
        isDrawWhenSelected: false,
      });
    }
    // Sensor to Satellite When in View of Currently Selected Sensor and Satellite Selected
    if (type == 'sat4') {
      sat = getSat(value[0]);
      sat2 = getSat(value[1]);
      if (sat == null || sat2 == null) return;
      if (typeof sat.position == 'undefined' || typeof sat2.position == 'undefined') {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        console.debug(sat2);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl, this.shader),
        sat: sat,
        sat2: sat2,
        ref: [sat.position.x, sat.position.y, sat.position.z],
        ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
        color: color,
        isOnlyInFOV: true,
        isDrawWhenSelected: true,
      });
    }

    // One Sensor to Satellite
    if (type == 'sat5') {
      sat = getSat(value[0]);
      sat2 = getSat(value[1]);
      if (typeof sat == 'undefined' || typeof sat2 == 'undefined' || typeof sat.position == 'undefined' || typeof sat2.position == 'undefined') {
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl, this.shader),
        sat: sat,
        sat2: sat2,
        ref: [sat.position.x, sat.position.y, sat.position.z],
        ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
        color: color,
        isOnlyInFOV: false,
        isDrawWhenSelected: false,
      });
    }
    // Multiple Sensors to Satellite
    if (type == 'sat6') {
      sat = getSat(value[0]);
      sat2 = getSat(value[1]);
      if (typeof sat == 'undefined' || typeof sat2 == 'undefined' || typeof sat.position == 'undefined' || typeof sat2.position == 'undefined') {
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl, this.shader),
        sat: sat,
        sat2: sat2,
        ref: [sat.position.x, sat.position.y, sat.position.z],
        ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
        color: color,
        isOnlyInFOV: true,
        isDrawWhenSelected: false,
        isCalculateIfInFOV: true,
      });
    }
    // Scanning Satellite to Reference Points on Earth in FOV
    if (type == 'scan') {
      sat = getSat(value[0]);
      if (typeof sat.position == 'undefined') {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl, this.shader),
        sat: sat,
        ref: [0, 0, 0],
        ref2: [sat.position.x, sat.position.y, sat.position.z],
        color: color,
        isScan: true,
        lat: -90,
        lon: 0,
      });
    }

    // Scanning Satellite to Reference Points on Earth in FOV
    if (type == 'scan2') {
      sat = getSat(value[0]);
      if (typeof sat.position == 'undefined') {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl, this.shader),
        sat: sat,
        ref: [0, 0, 0],
        ref2: [sat.position.x, sat.position.y, sat.position.z],
        color: color,
        isScan2: true,
        az: value[1],
        minAz: value[1],
        maxAz: value[2],
        minEl: value[3],
        maxRng: value[4],
      });
    }

    // Satellite to Missile
    if (type == 'misl') {
      sat = getSat(value[0]);
      sat2 = getSat(value[1]);
      if (sat == null || sat2 == null) return;
      if (typeof sat.position == 'undefined' || typeof sat2.position == 'undefined') {
        console.debug(`No Satellite Position Available for Line`);
        console.debug(sat);
        console.debug(sat2);
        return;
      }
      this.drawLineList.push({
        line: new Line(this.gl, this.shader),
        sat: sat,
        sat2: sat2,
        ref: [sat.position.x, sat.position.y, sat.position.z],
        ref2: [sat2.position.x, sat2.position.y, sat2.position.z],
        color: color,
      });
    }

    if (type == 'ref') {
      this.drawLineList.push({
        line: new Line(this.gl, this.shader),
        ref: [0, 0, 0],
        ref2: [value[0], value[1], value[2]],
        color: color,
      });
    }
    if (type == 'ref2') {
      this.drawLineList.push({
        line: new Line(this.gl, this.shader),
        ref: [value[0], value[1], value[2]],
        ref2: [value[3], value[4], value[5]],
        color: color,
      });
    }
  }

  updateLineToSat(satId: number, sensorId: number) {
    let isLineDrawnToSat = false;
    for (let i = 0; i < this.drawLineList.length; i++) {
      if (typeof this.drawLineList[i].sat == 'undefined') continue;

      if (this.drawLineList[i].sat.id == satId) {
        isLineDrawnToSat = true;
      }
    }
    if (!isLineDrawnToSat) {
      this.create('sat4', [satId, sensorId], 'g');
    }
  }

  getLineListLen(): number {
    return this.drawLineList.length;
  }

  // This is intentionally complex to reduce object creation and GC
  // Splitting it into subfunctions would not be optimal
  // prettier-ignore
  draw(): void { // NOSONAR
    if (this.drawLineList.length == 0) return;
    for (let i = 0; i < this.drawLineList.length; i++) {
      try {
        if (typeof this.drawLineList[i].sat != 'undefined' && this.drawLineList[i].sat != null && typeof this.drawLineList[i].sat.id != 'undefined') {
          // At least One Satellite
          this.drawLineList[i].sat = this.getSatPosOnly(this.drawLineList[i].sat.id);
          if (typeof this.drawLineList[i].sat2 != 'undefined' && this.drawLineList[i].sat2 != null) {
            // Satellite and Static
            if (typeof this.drawLineList[i].sat2.name != 'undefined') {
              if (typeof this.drawLineList[i].sat2.id == 'undefined' && this.drawLineList[i].sat2 != null) {
                this.drawLineList[i].sat2.id = this.getSensorFromSensorName(this.drawLineList[i].sat2.name);
              }
              this.drawLineList[i].sat2 = keepTrackApi.programs.satSet.getSat(this.drawLineList[i].sat2.id);
              if ((!this.drawLineList[i].isCalculateIfInFOV && this.drawLineList[i].isOnlyInFOV && this.drawLineList[i].sat.inView === 0)|| !settingsManager.isDrawInCoverageLines) {
                this.drawLineList.splice(i, 1);
                continue;
              }
              if (this.drawLineList[i].isCalculateIfInFOV && this.drawLineList[i].isOnlyInFOV) {
                Object.keys(keepTrackApi.programs.sensorManager.sensorList).forEach((key) => {
                  const sensor = keepTrackApi.programs.sensorManager.sensorList[key];
                  if (sensor.name == this.drawLineList[i].sat2.name) {
                    let tearr = this.drawLineList[i].sat.getTEARR(null, [sensor]);
                    if (!tearr.inView || !settingsManager.isDrawInCoverageLines) {
                      this.drawLineList.splice(i, 1);
                    }
                  }
                });
              }
              this.drawLineList[i].line.set(
                [this.drawLineList[i].sat.position.x, this.drawLineList[i].sat.position.y, this.drawLineList[i].sat.position.z],
                [this.drawLineList[i].sat2.position.x, this.drawLineList[i].sat2.position.y, this.drawLineList[i].sat2.position.z]
              );
            } else {
              // Two Satellites
              this.drawLineList[i].sat2 = this.getSatPosOnly(this.drawLineList[i].sat2.id);
              this.drawLineList[i].line.set(
                [this.drawLineList[i].sat.position.x, this.drawLineList[i].sat.position.y, this.drawLineList[i].sat.position.z],
                [this.drawLineList[i].sat2.position.x, this.drawLineList[i].sat2.position.y, this.drawLineList[i].sat2.position.z]
              );
            }
          } else {
            if (this.drawLineList[i].isScan) {
              let t = 0;
              while (t < 1000) {
                this.drawLineList[i].lon += settingsManager.lineScanSpeedSat;
                if (this.drawLineList[i].lon > 180) {
                  this.drawLineList[i].lon = -180;
                }
                if (this.drawLineList[i].lon >= 0 && this.drawLineList[i].lon < settingsManager.lineScanSpeedSat) {
                  this.drawLineList[i].lat += settingsManager.lineScanSpeedSat;
                }
                if (this.drawLineList[i].lat > 90) {
                  this.drawLineList[i].lat = -90;
                }

                const lla = { lat: this.drawLineList[i].lat * DEG2RAD, lon: this.drawLineList[i].lon * DEG2RAD, alt: 0.05 };
                const ecf = keepTrackApi.programs.satellite.eciToEcf(this.drawLineList[i].sat.position, 0);
                const rae = keepTrackApi.programs.satellite.ecfToLookAngles(lla, ecf);
                const el = rae.el * RAD2DEG;
                if (el > settingsManager.lineScanMinEl) {
                  const pos = keepTrackApi.programs.satellite.geodeticToEcf(lla);
                  this.drawLineList[i].line.set(
                    [pos.x, pos.y, pos.z],
                    [this.drawLineList[i].sat.position.x, this.drawLineList[i].sat.position.y, this.drawLineList[i].sat.position.z]
                  );
                  break;
                }

                if (this.drawLineList[i].lat === -90) {
                  this.drawLineList[i].lat += settingsManager.lineScanSpeedSat;
                }
                if (this.drawLineList[i].lat === 90) {
                  this.drawLineList[i].lat = -90;
                }

                t++;
              }
            } else if (this.drawLineList[i].isScan2) {
              this.drawLineList[i].az += settingsManager.lineScanSpeedRadar;
              // Normalize azimuth
              if (this.drawLineList[i].az > 360) {
                this.drawLineList[i].az = 0;
              }
              // Is azimuth outside of FOV?
              if (
                (this.drawLineList[i].maxAz > this.drawLineList[i].minAz && this.drawLineList[i].az > this.drawLineList[i].maxAz) ||
                (this.drawLineList[i].maxAz < this.drawLineList[i].minAz &&
                  this.drawLineList[i].az > this.drawLineList[i].maxAz &&
                  this.drawLineList[i].az < this.drawLineList[i].minAz)
              ) {
                // Reset it
                this.drawLineList[i].az = this.drawLineList[i].minAz;
              }
              // Calculate ECI for that RAE coordinate
              // Adding 30km to altitude to avoid clipping the earth
              const pos = keepTrackApi.programs.satellite.ecfToEci(
                keepTrackApi.programs.satellite.lookAngles2Ecf(
                  this.drawLineList[i].az,
                  this.drawLineList[i].minEl,
                  this.drawLineList[i].maxRng,
                  this.drawLineList[i].sat.lat * DEG2RAD,
                  this.drawLineList[i].sat.lon * DEG2RAD,
                  this.drawLineList[i].sat.alt + 30
                ),
                keepTrackApi.programs.drawManager.sceneManager.sun.sunvar.gmst
              );
              // Update the line
              this.drawLineList[i].line.set([pos.x, pos.y, pos.z], [this.drawLineList[i].sat.position.x, this.drawLineList[i].sat.position.y, this.drawLineList[i].sat.position.z]);
            } else {
              // Just One Satellite
              this.drawLineList[i].line.set(this.drawLineList[i].ref, [
                this.drawLineList[i].sat.position.x,
                this.drawLineList[i].sat.position.y,
                this.drawLineList[i].sat.position.z,
              ]);
            }
          }
        } else if (
          typeof this.drawLineList[i].star1 != 'undefined' &&
          typeof this.drawLineList[i].star2 != 'undefined' &&
          this.drawLineList[i].star1 != null &&
          this.drawLineList[i].star2 != null
        ) {
          // Constellation
          if (typeof this.drawLineList[i].star1ID == 'undefined') {
            this.drawLineList[i].star1ID = this.getIdFromStarName(this.drawLineList[i].star1);
          }
          if (typeof this.drawLineList[i].star2ID == 'undefined') {
            this.drawLineList[i].star2ID = this.getIdFromStarName(this.drawLineList[i].star2);
          }
          this.tempStar1 = this.getSatPosOnly(this.drawLineList[i].star1ID);
          this.tempStar2 = this.getSatPosOnly(this.drawLineList[i].star2ID);
          this.drawLineList[i].line.set(
            [this.tempStar1.position.x, this.tempStar1.position.y, this.tempStar1.position.z],
            [this.tempStar2.position.x, this.tempStar2.position.y, this.tempStar2.position.z]
          );
        } else {
          // Arbitrary Lines
          this.drawLineList[i].line.set(this.drawLineList[i].ref, this.drawLineList[i].ref2);
        }
      } catch (error) {
        // DEBUG:
        // console.warn(error);
      }

      this.drawLineList[i].line.draw(this.drawLineList[i].color);
    }
  }
}
