import { Line } from './line.js';
import { keepTrackApi } from '@app/js/api/externalApi';

class LineFactory {
  #getIdFromSensorName = null;
  #getIdFromStarName = null;
  #getSat = null;
  #getSatPosOnly = null;
  #tempStar1 = null;
  #tempStar2 = null;

  constructor() {
    this.#getIdFromSensorName = keepTrackApi.programs.satSet.getIdFromSensorName;
    this.#getIdFromStarName = keepTrackApi.programs.satSet.getIdFromStarName;
    this.#getSat = keepTrackApi.programs.satSet.getSat;
    this.#getSatPosOnly = keepTrackApi.programs.satSet.getSatPosOnly;
    this.gl = keepTrackApi.programs.drawManager.gl;
    this.shader = keepTrackApi.programs.orbitManager.shader;
    this.drawLineList = [];
  }

  drawWhenSelected() {
    for (let i = 0; i < this.drawLineList.length; i++) {
      if (this.drawLineList[i].isDrawWhenSelected) {
        this.drawLineList.splice(i, 1);
      }
    }
  }

  clear() {
    this.drawLineList = [];
  }

  removeStars() {
    let starFound = false;
    for (let i = 0; i < this.drawLineList.length; i++) {
      if ((typeof this.drawLineList[i].sat !== 'undefined' && this.drawLineList[i].sat.type == 'Star') || (typeof this.drawLineList[i].sat2 !== 'undefined' && this.drawLineList[i].sat2.type == 'Star')) {
        this.drawLineList.splice(i, 1);
        starFound = true;
      }
    }
    return starFound;
  }

  create(type, value, color) {
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
        break;
    }
    // Center of the Earth to the Satellite
    if (type == 'sat') {
      let sat = getSat(value);
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
    // Satellite to Satellite When in View
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
    // Satellite to Satellite - Draw When Selected and in View
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

    // Satellite to Satellite
    if (type == 'sat5') {
      sat = getSat(value[0]);
      sat2 = getSat(value[1]);
      if (typeof sat == 'undefined' || typeof sat2 == 'undefined' || typeof sat.position == 'undefined' || typeof sat2.position == 'undefined') {
        // console.debug(`No Satellite Position Available for Line`);
        // console.debug(sat);
        // console.debug(sat2);
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

  updateLineToSat(satId, sensorId) {
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

  getLineListLen() {
    return this.drawLineList.length;
  }

  draw() {
    if (this.drawLineList.length == 0) return;
    for (let i = 0; i < this.drawLineList.length; i++) {
      try {
        if (typeof this.drawLineList[i].sat != 'undefined' && this.drawLineList[i].sat != null && typeof this.drawLineList[i].sat.id != 'undefined') {
          // At least One Satellite
          this.drawLineList[i].sat = this.#getSatPosOnly(this.drawLineList[i].sat.id);
          if (typeof this.drawLineList[i].sat2 != 'undefined' && this.drawLineList[i].sat2 != null) {
            // Satellite and Static
            if (typeof this.drawLineList[i].sat2.name != 'undefined') {
              if (typeof this.drawLineList[i].sat2.id == 'undefined' && this.drawLineList[i].sat2 != null) {
                this.drawLineList[i].sat2.id = this.#getIdFromSensorName(this.drawLineList[i].sat2.name);
              }
              this.drawLineList[i].sat2 = keepTrackApi.programs.satSet.getSat(this.drawLineList[i].sat2.id);
              if (this.drawLineList[i].isOnlyInFOV && !this.drawLineList[i].sat.inview) {
                this.drawLineList.splice(i, 1);
                continue;
              }
              this.drawLineList[i].line.set(
                [this.drawLineList[i].sat.position.x, this.drawLineList[i].sat.position.y, this.drawLineList[i].sat.position.z],
                [this.drawLineList[i].sat2.position.x, this.drawLineList[i].sat2.position.y, this.drawLineList[i].sat2.position.z]
              );
            } else {
              // Two Satellites
              this.drawLineList[i].sat2 = this.#getSatPosOnly(this.drawLineList[i].sat2.id);
              this.drawLineList[i].line.set(
                [this.drawLineList[i].sat.position.x, this.drawLineList[i].sat.position.y, this.drawLineList[i].sat.position.z],
                [this.drawLineList[i].sat2.position.x, this.drawLineList[i].sat2.position.y, this.drawLineList[i].sat2.position.z]
              );
            }
          } else {
            // Just One Satellite
            this.drawLineList[i].line.set(this.drawLineList[i].ref, [this.drawLineList[i].sat.position.x, this.drawLineList[i].sat.position.y, this.drawLineList[i].sat.position.z]);
          }
        } else if (typeof this.drawLineList[i].star1 != 'undefined' && typeof this.drawLineList[i].star2 != 'undefined' && this.drawLineList[i].star1 != null && this.drawLineList[i].star2 != null) {
          // Constellation
          if (typeof this.drawLineList[i].star1ID == 'undefined') {
            this.drawLineList[i].star1ID = this.#getIdFromStarName(this.drawLineList[i].star1);
          }
          if (typeof this.drawLineList[i].star2ID == 'undefined') {
            this.drawLineList[i].star2ID = this.#getIdFromStarName(this.drawLineList[i].star2);
          }
          this.#tempStar1 = this.#getSatPosOnly(this.drawLineList[i].star1ID);
          this.#tempStar2 = this.#getSatPosOnly(this.drawLineList[i].star2ID);
          this.drawLineList[i].line.set([this.#tempStar1.position.x, this.#tempStar1.position.y, this.#tempStar1.position.z], [this.#tempStar2.position.x, this.#tempStar2.position.y, this.#tempStar2.position.z]);
        } else {
          // Arbitrary Lines
          this.drawLineList[i].line.set(this.drawLineList[i].ref, this.drawLineList[i].ref2);
        }
      } catch (error) {
        console.debug(error);
      }

      this.drawLineList[i].line.draw(this.drawLineList[i].color);
    }
  }
}

export { LineFactory };
